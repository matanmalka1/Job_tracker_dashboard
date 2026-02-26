import datetime as dt
import logging
import os
import re
from typing import Dict, List, Optional

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
        service_account_file: Optional[str] = None,  # deprecated alias
        delegated_user: Optional[str],
        query_window_days: int,
        max_messages: int,
        page_size: int,
    ):
        self._token_file = token_file or service_account_file
        self.delegated_user = delegated_user
        self.query_window_days = max(1, query_window_days)
        self.max_messages = max(1, max_messages)
        self.page_size = max(1, min(page_size, self.max_messages))
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
                # Persist refreshed token so the next startup doesn't need to re-auth
                with open(self._token_file, "w") as fh:
                    fh.write(creds.to_json())
                logger.info("Gmail OAuth token refreshed and saved to %s", self._token_file)
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

    def fetch_recent_messages(self) -> List[Dict]:
        try:
            service = self._get_service()
            query = self._date_query()
            messages: List[Dict] = []
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
        return (
            f"after:{after_date.isoformat()}"
            ' -subject:"wants to connect"'
            ' -subject:"accepted your invitation"'
            ' -subject:"joined your network"'
            ' -subject:"now following you"'
            ' -subject:"You have a new message"'
            ' -from:connected@linkedin.com'
            ' -from:invitations@linkedin.com'
        )

    def _parse_message(self, msg: Dict) -> Dict:
        headers = {
            h["name"].lower(): h.get("value")
            for h in msg.get("payload", {}).get("headers", [])
        }
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