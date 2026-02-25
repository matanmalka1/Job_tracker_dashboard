"""
Quick smoke-test: fetch recent Gmail messages and print the first few.

Usage:
    python scripts/test_gmail_fetch.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from app.job_tracker.email_scanner.gmail_client import GmailClient


def main() -> None:
    settings = get_settings()

    client = GmailClient(
        token_file=settings.GMAIL_TOKEN_FILE,        
        delegated_user=settings.GMAIL_DELEGATED_USER,
        query_window_days=settings.GMAIL_QUERY_WINDOW_DAYS,
        max_messages=settings.GMAIL_MAX_MESSAGES,
        page_size=settings.GMAIL_LIST_PAGE_SIZE,
    )

    messages = client.fetch_recent_messages()
    print(f"Fetched {len(messages)} messages")

    for m in messages[:5]:
        print(m["subject"], "-", m["sender"])


if __name__ == "__main__":
    main()
