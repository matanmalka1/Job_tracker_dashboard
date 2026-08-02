import asyncio
from types import SimpleNamespace

import pytest


@pytest.mark.asyncio
async def test_sse_disconnect_does_not_cancel_running_scan(monkeypatch):
    from app.job_tracker.api.routes import scans

    await scans.shutdown_background_scans()

    scan_started = asyncio.Event()
    allow_scan_to_finish = asyncio.Event()
    scan_finished = asyncio.Event()
    released_slots: list[bool] = []

    async def allow_start():
        return True, 0.0

    async def fake_session():
        yield object()

    class FakeScanService:
        def __init__(self, *_args):
            pass

        async def scan_for_applications(self, on_progress):
            on_progress("fetching", "Connected")
            scan_started.set()
            await allow_scan_to_finish.wait()
            scan_finished.set()
            return {"inserted": 2, "applications_created": 1}

    monkeypatch.setattr(
        scans,
        "get_settings",
        lambda: SimpleNamespace(JOB_TRACKER_API_KEY="", SSE_KEEPALIVE_TIMEOUT=1),
    )
    monkeypatch.setattr(scans, "acquire_scan_slot", allow_start)
    monkeypatch.setattr(scans, "try_start_scan", lambda: True)
    monkeypatch.setattr(scans, "finish_scan", lambda: released_slots.append(True))
    monkeypatch.setattr(scans, "make_gmail_client", lambda _settings: object())
    monkeypatch.setattr(scans, "get_session", fake_session)
    monkeypatch.setattr(scans, "EmailScanService", FakeScanService)

    response = await scans.scan_progress(stream_token=None)
    stream = response.body_iterator

    try:
        first_event = await anext(stream)
        await scan_started.wait()
        assert '"stage": "fetching"' in first_event

        await stream.aclose()

        assert not scan_finished.is_set()
        assert len(scans._background_scan_tasks) == 1

        allow_scan_to_finish.set()
        await asyncio.wait_for(scan_finished.wait(), timeout=1)
        await asyncio.sleep(0)

        assert released_slots == [True]
        assert not scans._background_scan_tasks
    finally:
        allow_scan_to_finish.set()
        await scans.shutdown_background_scans()
