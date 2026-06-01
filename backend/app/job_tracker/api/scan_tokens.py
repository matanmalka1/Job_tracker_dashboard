"""Short-lived stream tokens for SSE auth when EventSource can't send headers."""
import secrets
import time

_SSE_STREAM_TOKEN_TTL = 30  # seconds
_scan_stream_tokens: dict[str, float] = {}


def issue_stream_token() -> str:
    token = secrets.token_urlsafe(32)
    _scan_stream_tokens[token] = time.monotonic() + _SSE_STREAM_TOKEN_TTL
    return token


def consume_stream_token(token: str) -> bool:
    """Validate and consume a stream token. Returns True if valid."""
    expires = _scan_stream_tokens.pop(token, None)
    if expires is None:
        return False
    if time.monotonic() > expires:
        return False
    return True


def purge_expired_tokens() -> None:
    now = time.monotonic()
    expired = [k for k, v in _scan_stream_tokens.items() if v < now]
    for k in expired:
        _scan_stream_tokens.pop(k, None)
