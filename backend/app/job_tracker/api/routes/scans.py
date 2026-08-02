import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.config import get_settings
from app.db import get_session
from app.job_tracker.api.deps import check_api_key, make_gmail_client
from app.job_tracker.api.scan_rate_limit import acquire_scan_slot, finish_scan, try_start_scan
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

# Keep strong references to manual scan tasks so their lifetime is independent
# of the SSE request that started them. A user navigating away may disconnect
# the stream, but the scan must still finish and release the scan slot.
_background_scan_tasks: set[asyncio.Task[None]] = set()

SCAN_UNAVAILABLE_MESSAGE = "Gmail scan is unavailable. Check server logs and configuration."
SCAN_FAILED_MESSAGE = "Scan failed. Check server logs."


def _track_background_scan(task: asyncio.Task[None]) -> None:
    _background_scan_tasks.add(task)
    task.add_done_callback(_background_scan_tasks.discard)


async def shutdown_background_scans() -> None:
    """Cancel and await active manual scans during application shutdown."""
    tasks = list(_background_scan_tasks)
    for task in tasks:
        task.cancel()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


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

    if not try_start_scan():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A scan is already in progress.",
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
        logger.exception("Scan unavailable")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=SCAN_UNAVAILABLE_MESSAGE,
        ) from exc
    except Exception as exc:
        logger.exception("Scan failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=SCAN_FAILED_MESSAGE,
        ) from exc
    finally:
        finish_scan()


@router.get("/scan/progress")
async def scan_progress(
    stream_token: Optional[str] = Query(None),
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

    allowed, retry_after = await acquire_scan_slot()
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"A scan was run recently. Retry in {int(retry_after)}s.",
            headers={"Retry-After": str(int(retry_after))},
        )

    if not try_start_scan():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A scan is already in progress.",
        )

    client = make_gmail_client(settings)
    queue: asyncio.Queue = asyncio.Queue()

    def on_progress(stage: str, detail: str) -> None:
        queue.put_nowait({"stage": stage, "detail": detail})

    async def run_scan() -> None:
        # Own session scoped to this task, not FastAPI's Depends(get_session):
        # a yield-dependency's session is held open until the whole
        # StreamingResponse finishes, which would pin a pool connection for
        # the entire scan (including the multi-minute Gmail-fetch phase that
        # doesn't touch the DB at all).
        try:
            async for scan_session in get_session():
                service = EmailScanService(
                    client,
                    EmailReferenceRepository(scan_session),
                    JobApplicationRepository(scan_session),
                    ScanRunRepository(scan_session),
                )
                result = await service.scan_for_applications(on_progress=on_progress)
                queue.put_nowait({"stage": "result", "detail": "", **result})
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.exception("SSE scan failed")
            detail = SCAN_UNAVAILABLE_MESSAGE if isinstance(exc, RuntimeError) else SCAN_FAILED_MESSAGE
            queue.put_nowait({"stage": "error", "detail": detail})
        finally:
            finish_scan()

    scan_task = asyncio.create_task(run_scan(), name="manual-gmail-scan")
    _track_background_scan(scan_task)

    async def event_stream():
        try:
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
            logger.info("SSE client disconnected; scan continues in background")
        except asyncio.CancelledError:
            logger.info("SSE response cancelled; scan continues in background")
            raise

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


@router.get("/scan/config")
async def scan_config(_=Depends(check_api_key)):
    """Return scan-related server config visible to the frontend."""
    settings = get_settings()
    return {
        "auto_scan_interval_hours": settings.SCAN_INTERVAL_HOURS,
        "auto_scan_enabled": settings.SCAN_INTERVAL_HOURS > 0,
    }
