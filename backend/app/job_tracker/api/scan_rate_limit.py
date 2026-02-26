"""
Simple in-process rate limiter for the Gmail scan endpoint.

Using a token-bucket approach — one scan per WINDOW_SECONDS globally.
For a single-user app this is sufficient without Redis.
"""
import asyncio
import time

WINDOW_SECONDS = 60  # minimum seconds between scans

_last_scan_at: float = 0.0
_lock = asyncio.Lock()


async def acquire_scan_slot() -> tuple[bool, float]:
    """
    Try to acquire the scan slot.

    Returns (allowed, retry_after_seconds).
    retry_after_seconds is 0 when allowed is True.
    """
    global _last_scan_at
    async with _lock:
        now = time.monotonic()
        elapsed = now - _last_scan_at
        if elapsed < WINDOW_SECONDS:
            return False, WINDOW_SECONDS - elapsed
        _last_scan_at = now
        return True, 0.0


def reset_scan_slot() -> None:
    """Allow the next scan immediately (useful in tests)."""
    global _last_scan_at
    _last_scan_at = 0.0
