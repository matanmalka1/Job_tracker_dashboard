import datetime as dt


def make_email_data(suffix: str = "1") -> dict:
    return {
        "gmail_message_id": f"msg-{suffix}",
        "subject": f"Your application at Acme {suffix}",
        "sender": "recruiter@acme.com",
        "received_at": dt.datetime(2024, 1, 1, 12, 0, 0, tzinfo=dt.timezone.utc),
        "snippet": "Thank you for applying...",
    }
