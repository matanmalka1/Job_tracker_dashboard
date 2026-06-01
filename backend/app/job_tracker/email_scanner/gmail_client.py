import datetime as dt
import logging
import os
import re
import time
from typing import Optional

from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


class GmailClient:
    def __init__(
        self,
        *,
        token_file: Optional[str] = None,
        delegated_user: Optional[str],
        query_window_days: int,
        max_messages: int,
        page_size: int,
        batch_size: int = 100,
        retry_backoff_seconds: int = 2,
    ):
        self._token_file = token_file
        self.delegated_user = delegated_user
        self.query_window_days = max(1, query_window_days)
        self.max_messages = max(1, max_messages)
        self.page_size = max(1, min(page_size, self.max_messages))
        self.batch_size = max(1, batch_size)
        self.retry_backoff_seconds = max(0, retry_backoff_seconds)
        self._credentials: Optional[Credentials] = None
        self._service = None
        self._user_id = delegated_user or "me"

    def _build_credentials(self) -> Credentials:
        if not self._token_file or not os.path.exists(self._token_file):
            raise RuntimeError(
                "GMAIL_TOKEN_FILE is not configured or does not exist. "
                "Run scripts/generate_token.py to create secrets/token.json, "
                "then set GMAIL_TOKEN_FILE in your .env."
            )
        creds = Credentials.from_authorized_user_file(self._token_file, scopes=SCOPES)

        # Refresh expired credentials automatically
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                # Persist refreshed token so the next startup doesn't need to re-auth.
                # Use mode 600 (owner read/write only) to match the initial write in main.py.
                with open(self._token_file, "w", opener=lambda p, f: os.open(p, f, 0o600)) as fh:
                    fh.write(creds.to_json())
                logger.info("Gmail OAuth token refreshed and saved to %s", self._token_file)
            except RefreshError as exc:
                logger.exception(
                    "Gmail token refresh failed due to revoked/expired authorization: %s",
                    self._token_file,
                )
                raise RuntimeError(
                    "Gmail authorization expired or was revoked. "
                    "Re-run backend/scripts/generate_token.py and replace GMAIL_TOKEN_JSON "
                    "(or GMAIL_TOKEN_FILE) with the new token."
                ) from exc
            except Exception:
                logger.exception(
                    "Failed to refresh Gmail token from %s. "
                    "Re-run scripts/generate_token.py to re-authorize.",
                    self._token_file,
                )
                raise

        if not creds.valid:
            raise RuntimeError(
                f"Gmail credentials in {self._token_file} are invalid or expired "
                "and could not be refreshed. Re-run scripts/generate_token.py."
            )

        self._credentials = creds
        return creds

    def _get_service(self):
        if self._service is None:
            creds = self._credentials or self._build_credentials()
            self._service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        return self._service

    # Maximum body text extracted per message (characters) to keep memory bounded.
    BODY_SNIPPET_MAX_CHARS = 1000

    def fetch_recent_messages(self) -> list[dict]:
        try:
            service = self._get_service()
            query = self._build_query()
            messages: list[dict] = []
            page_token: Optional[str] = None

            while len(messages) < self.max_messages:
                page_size = min(self.page_size, self.max_messages - len(messages))
                response = (
                    service.users()
                    .messages()
                    .list(
                        userId=self._user_id,
                        q=query,
                        maxResults=page_size,
                        pageToken=page_token,
                    )
                    .execute()
                )
                messages.extend(response.get("messages", []))
                page_token = response.get("nextPageToken")
                if not page_token:
                    break

            message_ids = [msg["id"] for msg in messages]
            results = self._fetch_message_details(service, message_ids)

            logger.info("Fetched %s Gmail messages", len(results))
            return results
        except HttpError:
            logger.exception("Gmail API error")
            raise

    def _fetch_message_details(self, service, message_ids: list[str]) -> list[dict]:
        """Batch-fetch messages with full payload so body text can be extracted.

        Each batch costs 1 HTTP round-trip instead of 1 per message.
        Any messages that fail due to 429 rate-limit errors are retried once.
        """
        batch_size = self.batch_size
        fetched: dict[str, dict] = {}
        failed_ids: list[str] = []

        def _callback(request_id: str, response, exception) -> None:
            if exception:
                if isinstance(exception, HttpError) and exception.resp.status == 429:
                    failed_ids.append(request_id)
                else:
                    logger.warning("Batch get failed for message %s: %s", request_id, exception)
                return
            fetched[request_id] = self._parse_message(response)

        def _add_to_batch(batch, msg_id: str) -> None:
            batch.add(
                service.users()
                .messages()
                .get(
                    userId=self._user_id,
                    id=msg_id,
                    format="full",
                    fields="id,snippet,payload(headers,body,parts)",
                ),
                request_id=msg_id,
            )

        for i in range(0, len(message_ids), batch_size):
            chunk = message_ids[i : i + batch_size]
            batch = service.new_batch_http_request(callback=_callback)
            for msg_id in chunk:
                _add_to_batch(batch, msg_id)
            batch.execute()

        if failed_ids:
            logger.info("Retrying %s rate-limited messages after backoff", len(failed_ids))
            time.sleep(self.retry_backoff_seconds)
            for i in range(0, len(failed_ids), batch_size):
                retry_chunk = failed_ids[i : i + batch_size]
                retry_batch = service.new_batch_http_request(callback=_callback)
                for msg_id in retry_chunk:
                    _add_to_batch(retry_batch, msg_id)
                retry_batch.execute()

        # Return in original order, skipping any that permanently errored
        return [fetched[mid] for mid in message_ids if mid in fetched]

    def _build_query(self) -> str:
        """Build a Gmail search query that targets job/application emails.

        Searching at the Gmail API level means we only fetch messages that are
        likely job-related, so max_messages budget is spent effectively even in
        a busy inbox rather than pulling generic mail and filtering locally.
        """
        after_date = dt.date.today() - dt.timedelta(days=self.query_window_days)
        job_terms = " OR ".join([
            "application",
            "applied",
            "interview",
            "recruiter",
            "hiring",
            "candidate",
            "role",
            "position",
            "rejection",
            "offer",
            "assessment",
            '"thank you for applying"',
            '"we received your application"',
            '"not moving forward"',
            '"next steps"',
        ])
        exclusions = (
            ' -subject:"wants to connect"'
            ' -subject:"accepted your invitation"'
            ' -subject:"joined your network"'
            ' -subject:"now following you"'
            ' -subject:"You have a new message"'
            ' -from:connected@linkedin.com'
            ' -from:invitations@linkedin.com'
        )
        return f"after:{after_date.isoformat()} ({job_terms}){exclusions}"

    def _parse_message(self, msg: dict) -> dict:
        payload = msg.get("payload", {})
        headers = {
            h["name"].lower(): h.get("value")
            for h in payload.get("headers", [])
        }
        subject = headers.get("subject")
        sender = headers.get("from")
        date_raw = headers.get("date")
        received_at = self._parse_date(date_raw)
        snippet = msg.get("snippet")
        body_text = self._extract_body_text(payload)
        return {
            "gmail_message_id": msg.get("id"),
            "subject": subject,
            "sender": sender,
            "received_at": received_at,
            "snippet": snippet,
            "body_text": body_text,
        }

    def _extract_body_text(self, payload: dict) -> Optional[str]:
        """Extract a plain-text body snippet from a Gmail message payload.

        Walks the MIME tree preferring text/plain. Falls back to text/html
        with tags stripped. Returns at most BODY_SNIPPET_MAX_CHARS characters.
        """
        import base64

        def _decode(data: str) -> str:
            try:
                return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
            except Exception:
                return ""

        def _collect(part: dict) -> Optional[str]:
            mime = part.get("mimeType", "")
            body = part.get("body", {})
            data = body.get("data")

            if mime == "text/plain" and data:
                return _decode(data)

            if mime == "text/html" and data:
                text = _decode(data)
                # Strip HTML tags minimally — no extra deps needed.
                text = re.sub(r"<[^>]+>", " ", text)
                text = re.sub(r"\s+", " ", text).strip()
                return text

            for sub in part.get("parts", []):
                result = _collect(sub)
                if result:
                    return result

            return None

        text = _collect(payload)
        if not text:
            return None
        return text[: self.BODY_SNIPPET_MAX_CHARS]

    @staticmethod
    def _parse_date(date_str: str | None) -> dt.datetime:
        if not date_str:
            return dt.datetime.now(dt.timezone.utc)

        cleaned = date_str.strip()
        cleaned = re.sub(r"\s+\([^)]+\)$", "", cleaned)  # strip (UTC), (PST), …
        cleaned = re.sub(r"\s+GMT$", " +0000", cleaned)   # normalize bare GMT
        cleaned = re.sub(r"\bUT$", "+0000", cleaned)       # normalize bare UT

        for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%d %b %Y %H:%M:%S %z"):
            try:
                return dt.datetime.strptime(cleaned, fmt).astimezone(dt.timezone.utc)
            except ValueError:
                continue

        try:
            return dt.datetime.fromisoformat(cleaned)
        except Exception:
            logger.warning("Could not parse date string %r, using current time", date_str)
            return dt.datetime.now(dt.timezone.utc)
