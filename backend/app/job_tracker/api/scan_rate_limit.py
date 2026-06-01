import asyncio
import time

from app.config import get_settings

_last_scan_at: float = 0.0
_lock = asyncio.Lock()


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


def reset_scan_slot() -> None:
    """Allow the next scan immediately (useful in tests)."""
    global _last_scan_at
    _last_scan_at = 0.0
