import re
from typing import Optional

# Keywords that must match at word boundaries to avoid substring false positives
# (e.g. "hr" must not match "through", "Thursday").
_WORD_BOUNDARY_KEYWORDS: list[re.Pattern] = [
    re.compile(r"\b" + re.escape(kw) + r"\b", re.IGNORECASE)
    for kw in [
        "interview",
        "application",
        "applied",
        "recruiter",
        "recruiting",
        "hr",
        "human resources",
        "job offer",
        "offer letter",
        "unfortunately",
        "regret to inform",
        "pleased to inform",
        "moving forward",
        "next steps",
        "hiring",
        "position",
        "candidate",
        "background check",
        "onboarding",
        "start date",
        "thank you for applying",
    ]
]

_EXCLUDE_PHRASES: list[str] = [
    "wants to connect",
    "accepted your invitation",
    "joined your network",
    "now following you",
    "invitation to connect",
    "connect with",
    "people you may know",
    "grow your network",
    "new connection",
]


def matches_job_keywords(subject: str | None, snippet: str | None, body_text: str | None = None) -> bool:
    haystack = " ".join(filter(None, [subject, snippet, body_text])).lower()
    if any(phrase in haystack for phrase in _EXCLUDE_PHRASES):
        return False
    return any(pat.search(haystack) for pat in _WORD_BOUNDARY_KEYWORDS)


_STRIP_WORDS = {
    "re", "fw", "fwd", "your", "application", "for", "at", "to", "the",
    "a", "an", "and", "or", "of", "in", "on", "is", "was", "has",
    "thank", "you", "update", "status", "interview", "position", "role",
    "opportunity", "offer", "letter", "regarding", "following", "up",
}


def _extract_keywords(text: str) -> set[str]:
    """Return a set of lowercased non-filler words from text."""
    words = re.findall(r"[a-zA-Z0-9]+", text.lower())
    return {w for w in words if w not in _STRIP_WORDS and len(w) > 2}


def match_email_to_application(email_reference, applications: list) -> Optional[object]:
    """Try to match an EmailReference to an existing JobApplication."""
    if not applications:
        return None

    subject = email_reference.subject or ""
    sender = email_reference.sender or ""
    haystack = f"{subject} {sender}".lower()

    best_match = None
    best_score = 0

    for app in applications:
        score = 0
        company_lower = app.company_name.lower()
        role_lower = (app.role_title or "").lower()

        if company_lower in haystack:
            score += 10
        if role_lower and role_lower in haystack:
            score += 8

        hay_kw = _extract_keywords(haystack)
        company_kw = _extract_keywords(company_lower)
        role_kw = _extract_keywords(role_lower) if role_lower else set()

        score += len(hay_kw & company_kw) * 3
        score += len(hay_kw & role_kw) * 2

        if score > best_score:
            best_score = score
            best_match = app

    return best_match if best_score >= 5 else None
