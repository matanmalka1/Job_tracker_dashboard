import datetime as dt
import logging
from typing import Dict, List, Optional

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


class GmailClient:
    def __init__(
        self,
        *,
        service_account_file: str,
        delegated_user: Optional[str],
        query_window_days: int,
        max_messages: int,
        page_size: int,
    ):
        self.service_account_file = service_account_file
        self.delegated_user = delegated_user
        self.query_window_days = max(1, query_window_days)
        self.max_messages = max(1, max_messages)
        self.page_size = max(1, min(page_size, self.max_messages))
        self._credentials = None
        self._service = None
        self._user_id = delegated_user or "me"

    def _build_credentials(self):
        if not self.service_account_file:
            raise RuntimeError("GMAIL_SERVICE_ACCOUNT_FILE is not configured")

        creds = service_account.Credentials.from_service_account_file(
            self.service_account_file, scopes=SCOPES
        )
        if self.delegated_user:
            creds = creds.with_subject(self.delegated_user)
        self._credentials = creds
        return creds

    def _get_service(self):
        if self._service is None:
            creds = self._credentials or self._build_credentials()
            # Building the discovery client is blocking; keep it here so callers can run off the event loop.
            self._service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        return self._service

    def fetch_recent_messages(self) -> List[Dict]:
        try:
            service = self._get_service()
            query = self._date_query()
            messages: List[Dict] = []
            page_token: Optional[str] = None
            # Paginate to avoid unbounded list calls; still needs per-message fetch until Gmail batch is available.
            while len(messages) < self.max_messages:
                page_size = min(self.page_size, self.max_messages - len(messages))
                response = (
                    service.users()
                    .messages()
                    .list(userId=self._user_id, q=query, maxResults=page_size, pageToken=page_token)
                    .execute()
                )
                messages.extend(response.get("messages", []))
                page_token = response.get("nextPageToken")
                if not page_token:
                    break

            results: List[Dict] = []
            for msg in messages:
                msg_detail = (
                    service.users()
                    .messages()
                    .get(
                        userId=self._user_id,
                        id=msg["id"],
                        format="metadata",
                        metadataHeaders=["Subject", "From", "Date"],
                        fields="id,payload/headers,snippet",
                    )
                    .execute()
                )
                results.append(self._parse_message(msg_detail))

            logger.info("Fetched %s Gmail messages", len(results))
            return results
        except HttpError:
            logger.exception("Gmail API error")
            raise

    def _date_query(self) -> str:
        after_date = dt.date.today() - dt.timedelta(days=self.query_window_days)
        return f"after:{after_date.isoformat()}"

    def _parse_message(self, msg: Dict) -> Dict:
        headers = {h["name"].lower(): h.get("value") for h in msg.get("payload", {}).get("headers", [])}
        subject = headers.get("subject")
        sender = headers.get("from")
        date_raw = headers.get("date")
        received_at = self._parse_date(date_raw)
        snippet = msg.get("snippet")
        return {
            "gmail_message_id": msg.get("id"),
            "subject": subject,
            "sender": sender,
            "received_at": received_at,
            "snippet": snippet,
        }

    @staticmethod
    def _parse_date(date_str: str | None) -> dt.datetime:
        if not date_str:
            return dt.datetime.utcnow()
        try:
            return dt.datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S %z").astimezone(dt.timezone.utc)
        except ValueError:
            try:
                return dt.datetime.fromisoformat(date_str)
            except Exception:
                return dt.datetime.utcnow()
