from app.config import get_settings
from app.job_tracker.email_scanner.gmail_client import GmailClient

def main():
    settings = get_settings()

    client = GmailClient(
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