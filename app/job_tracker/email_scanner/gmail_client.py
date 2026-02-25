import datetime as dt
import logging
from typing import List, Dict

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.config import get_settings

logger = logging.getLogger(__name__)
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


class GmailClient:
    def __init__(self):
        self.settings = get_settings()
        self.credentials = self._build_credentials()
        self.service = build("gmail", "v1", credentials=self.credentials, cache_discovery=False)

    def _build_credentials(self):
        if not self.settings.GMAIL_SERVICE_ACCOUNT_FILE:
            raise RuntimeError("GMAIL_SERVICE_ACCOUNT_FILE is not configured")

        creds = service_account.Credentials.from_service_account_file(
            self.settings.GMAIL_SERVICE_ACCOUNT_FILE, scopes=SCOPES
        )
        if self.settings.GMAIL_DELEGATED_USER:
            creds = creds.with_subject(self.settings.GMAIL_DELEGATED_USER)
        return creds

    def fetch_recent_messages(self) -> List[Dict]:
        try:
            user_id = self.settings.GMAIL_DELEGATED_USER or "me"
            query = self._date_query()
            response = (
                self.service.users()
                .messages()
                .list(userId=user_id, q=query, maxResults=200)
                .execute()
            )
            messages = response.get("messages", [])
            results: List[Dict] = []
            for msg in messages:
                msg_detail = (
                    self.service.users()
                    .messages()
                    .get(userId=user_id, id=msg["id"], format="metadata", metadataHeaders=["Subject", "From", "Date"])
                    .execute()
                )
                results.append(self._parse_message(msg_detail))
            logger.info("Fetched %s Gmail messages", len(results))
            return results
        except HttpError as e:
            logger.exception("Gmail API error")
            raise

    def _date_query(self) -> str:
        days = max(1, self.settings.GMAIL_QUERY_WINDOW_DAYS)
        after_date = dt.date.today() - dt.timedelta(days=days)
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
