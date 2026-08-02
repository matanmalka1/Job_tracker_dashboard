import asyncio
import time

from app.config import get_settings

_last_scan_at: float = 0.0
_lock = asyncio.Lock()

# True while a scan body (fetch/filter/save/match/create) is actually running.
# acquire_scan_slot() below only throttles how often a scan may *start*; a
# single scan run easily outlasts that window, so two callers can both pass
# the throttle while the first scan is still in flight. This flag is the real
# mutex that prevents overlapping scan runs (which can race on
# list_company_role_keys() and create duplicate applications). Safe without a
# lock: on asyncio's single-threaded event loop, nothing can run between the
# `if` check and the assignment below since neither line awaits.
_scan_in_progress: bool = False


async def acquire_scan_slot() -> tuple[bool, float]:
    """Try to acquire the scan slot. Returns (allowed, retry_after_seconds)."""
    global _last_scan_at
    window = get_settings().SCAN_RATE_LIMIT_SECONDS
    async with _lock:
        now = time.monotonic()
        elapsed = now - _last_scan_at
        if elapsed < window:
            return False, window - elapsed
        _last_scan_at = now
        return True, 0.0


def try_start_scan() -> bool:
    """Non-blocking: True if the caller now exclusively owns the scan slot."""
    global _scan_in_progress
    if _scan_in_progress:
        return False
    _scan_in_progress = True
    return True


def finish_scan() -> None:
    """Release the scan slot. Must be called exactly once per successful try_start_scan()."""
    global _scan_in_progress
    _scan_in_progress = False


def reset_scan_slot() -> None:
    """Allow the next scan immediately (useful in tests)."""
    global _last_scan_at, _scan_in_progress
    _last_scan_at = 0.0
    _scan_in_progress = False
