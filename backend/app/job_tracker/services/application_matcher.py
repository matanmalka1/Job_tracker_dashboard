"""
Heuristic matcher: given an EmailReference, try to find an existing JobApplication
by matching company/role keywords extracted from subject and sender.
"""

import re
from typing import Optional

# Common job-related filler words to strip from subject lines
_STRIP_WORDS = {
    "re", "fw", "fwd", "your", "application", "for", "at", "to", "the",
    "a", "an", "and", "or", "of", "in", "on", "is", "was", "has",
    "thank", "you", "update", "status", "interview", "position", "role",
    "opportunity", "offer", "letter", "regarding", "following", "up",
}

# Patterns that signal what comes after is a role/company name
_ROLE_PATTERNS = [
    re.compile(r"(?:application for|applied for|position of|role of|applying for)[:\s]+(.+)", re.IGNORECASE),
    re.compile(r"(?:interview|offer|update|status)\s+(?:for|at|with)[:\s]+(.+)", re.IGNORECASE),
]

_COMPANY_PATTERNS = [
    re.compile(r"(?:at|with|from|@)\s+([A-Z][a-zA-Z0-9\s&.,'-]{2,40})(?:\s|$|,|\.)", re.MULTILINE),
]


def _extract_keywords(text: str) -> set[str]:
    """Return a set of lowercased non-filler words from text."""
    words = re.findall(r"[a-zA-Z0-9]+", text.lower())
    return {w for w in words if w not in _STRIP_WORDS and len(w) > 2}


def match_email_to_application(email_reference, applications: list) -> Optional[object]:
    """
    Try to match an EmailReference to an existing JobApplication.

    Parameters
    ----------
    email_reference : EmailReference ORM object
    applications    : list of JobApplication ORM objects to search

    Returns
    -------
    The best-matching JobApplication, or None if no match found.
    """
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

        # Exact substring match is strong signal
        if company_lower in haystack:
            score += 10
        if role_lower and role_lower in haystack:
            score += 8

        # Keyword overlap as secondary signal
        hay_kw = _extract_keywords(haystack)
        company_kw = _extract_keywords(company_lower)
        role_kw = _extract_keywords(role_lower) if role_lower else set()

        company_overlap = len(hay_kw & company_kw)
        role_overlap = len(hay_kw & role_kw)
        score += company_overlap * 3
        score += role_overlap * 2

        if score > best_score:
            best_score = score
            best_match = app

    # Require at least a minimal confidence threshold
    return best_match if best_score >= 5 else None