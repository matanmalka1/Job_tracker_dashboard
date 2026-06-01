import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.db import get_session
from app.job_tracker.api.deps import check_api_key, make_gmail_client
from app.job_tracker.api.scan_rate_limit import acquire_scan_slot
from app.job_tracker.api.scan_tokens import (
    consume_stream_token,
    issue_stream_token,
    purge_expired_tokens,
)
from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
from app.job_tracker.repositories.scan_run_repository import ScanRunRepository
from app.job_tracker.schemas.scan_run import ScanRunRead
from app.job_tracker.services.emails.email_scan_service import EmailScanService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/scan/token", status_code=status.HTTP_200_OK)
async def create_scan_stream_token(
    _=Depends(check_api_key),
):
    """
    Exchange a valid API key for a short-lived scan stream token.
    Pass ?stream_token=<token> on /scan/progress so that native EventSource
    (which cannot send custom headers) can still authenticate.
    Tokens are single-use and expire after 30 seconds.
    """
    purge_expired_tokens()
    allowed, retry_after = await acquire_scan_slot()
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"A scan was run recently. Retry in {int(retry_after)}s.",
            headers={"Retry-After": str(int(retry_after))},
        )
    return {"stream_token": issue_stream_token()}


@router.post("/scan", status_code=status.HTTP_202_ACCEPTED)
async def trigger_scan(
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    """Trigger a Gmail scan without SSE (rate-limited, returns final result)."""
    allowed, retry_after = await acquire_scan_slot()
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"A scan was run recently. Retry in {int(retry_after)}s.",
            headers={"Retry-After": str(int(retry_after))},
        )

    settings = get_settings()
    client = make_gmail_client(settings)

    try:
        service = EmailScanService(
            client,
            EmailReferenceRepository(session),
            JobApplicationRepository(session),
            ScanRunRepository(session),
        )
        return await service.scan_for_applications()
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        logger.exception("Scan failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.get("/scan/progress")
async def scan_progress(
    stream_token: Optional[str] = Query(None),
    session=Depends(get_session),
):
    """
    SSE endpoint: streams scan progress events then a final result.

    Auth: when JOB_TRACKER_API_KEY is set, first call POST /scan/token to obtain
    a short-lived stream_token, then pass ?stream_token=<token> here.
    """
    settings = get_settings()
    if settings.JOB_TRACKER_API_KEY:
        if not stream_token or not consume_stream_token(stream_token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Valid stream_token required. Call POST /scan/token first.",
            )

    client = make_gmail_client(settings)
    queue: asyncio.Queue = asyncio.Queue()

    def on_progress(stage: str, detail: str) -> None:
        queue.put_nowait({"stage": stage, "detail": detail})

    async def event_stream():
        scan_task: Optional[asyncio.Task] = None

        async def run_scan() -> None:
            service = EmailScanService(
                client,
                EmailReferenceRepository(session),
                JobApplicationRepository(session),
                ScanRunRepository(session),
            )
            try:
                result = await service.scan_for_applications(on_progress=on_progress)
                queue.put_nowait({"stage": "result", "detail": "", **result})
            except Exception as exc:
                logger.exception("SSE scan failed")
                queue.put_nowait({"stage": "error", "detail": str(exc)})

        try:
            scan_task = asyncio.create_task(run_scan())

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=settings.SSE_KEEPALIVE_TIMEOUT)
                except asyncio.TimeoutError:
                    if scan_task.done():
                        break
                    yield ": keepalive\n\n"
                    continue

                yield f"data: {json.dumps(event)}\n\n"

                if event.get("stage") in ("result", "error"):
                    break
        except GeneratorExit:
            logger.info("SSE client disconnected, cancelling scan task")
        finally:
            if scan_task is not None and not scan_task.done():
                scan_task.cancel()
                try:
                    await scan_task
                except (asyncio.CancelledError, Exception):
                    pass

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/scan/history")
async def scan_history(
    session=Depends(get_session),
    _=Depends(check_api_key),
):
    limit = get_settings().SCAN_HISTORY_LIMIT
    runs = await ScanRunRepository(session).list_recent(limit=limit)
    return [ScanRunRead.model_validate(r) for r in runs]
