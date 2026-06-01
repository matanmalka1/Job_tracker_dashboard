import logging
import re
from typing import Optional

from app.job_tracker.models.email_reference import EmailReference
from app.job_tracker.models.job_application import ApplicationStatus

logger = logging.getLogger(__name__)

# Domains blocklisted for use as company_name derived from sender address.
_ATS_SENDER_DOMAINS: set[str] = {
    "mail", "email", "notification", "notifications", "noreply",
    "no-reply", "careers", "jobs", "comeet", "greenhouse", "lever",
    "workday", "bamboohr", "smartrecruiters", "taleo", "icims",
    "jobvite", "ashbyhq", "ashby", "rippling", "gusto", "myworkday",
    "successfactors", "oracle", "peoplesoft", "ultipro", "adp",
    "paychex", "zenefits", "breezy", "jazz", "applytojob",
    "hire", "recruiting", "workable", "pinpoint", "recruitee",
}

# Names blocklisted for use as company_name extracted from subject/body.
# These are ATS platform brands, not companies.
_ATS_COMPANY_NAMES: set[str] = {
    "greenhouse", "lever", "workable", "smartrecruiters", "ashby",
    "recruitee", "comeet", "breezy", "bamboohr", "jobvite", "icims",
    "taleo", "workday", "myworkday", "successfactors", "rippling",
    "pinpoint", "jazz", "applytojob",
}


def _is_ats_company_name(name: str) -> bool:
    return name.lower().strip() in _ATS_COMPANY_NAMES


_APPLICATION_SUBJECT_PATTERNS = [
    re.compile(
        r"(?:your\s+)?application\s+(?:to|for)\s+(?P<role>.+?)\s+at\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:thank(?:s|\s+you)\s+for\s+apply(?:ing)?(?:\s+for)?)\s+(?:the\s+)?(?P<role>.+?)\s+(?:position\s+)?at\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"thank(?:s|\s+you)\s+for\s+applying\s+to\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"thanks?\s+for\s+applying\s+to\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"application\s+was\s+sent\s+to\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*\([^)]*\))?(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"application\s+was\s+viewed\s+by\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"application\s+update\s+from\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:re:\s*)?(?:your\s+)?application\s+to\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"^(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]{1,50}?)\s*[\-–—]\s*thank\s+you\s+for\s+your\s+application\s*[\-–—]\s*(?P<role>[A-Za-z0-9][A-Za-z0-9\s&.,'\-/]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:we\s+got\s+it[:\s]+)?thanks?\s+for\s+applying\s+for\s+(?P<role>[A-Za-z0-9][A-Za-z0-9\s&.,'\-/]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?P<role>[A-Za-z0-9][A-Za-z0-9\s&.,'\-/]{2,60}?)\s+opportunity\s+at\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:your\s+)?application\s*[\-–—]\s*(?P<role>[A-Za-z0-9][A-Za-z0-9\s&.,'\-/]{3,80}?)(?:\s*[\-–—]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"interest\s+in\s+joining\s+(?:us\s+)?at\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:your\s+)?application\s+for\s+(?P<role>[A-Za-z0-9][A-Za-z0-9\s&.,'\-/]+?)(?:\s+has\s+been|\s+was|\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:we\s+)?received\s+your\s+application\s+(?:for\s+(?P<role>.+?)\s+)?at\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"next\s+steps?\s+for\s+your\s+(?:job\s+)?application[:\s]+(?P<role>[A-Za-z0-9][A-Za-z0-9\s&.,'\-/]+?)\s+at\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"next\s+steps?\s+(?:for\s+your\s+(?:application|candidacy)\s+)?at\s+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"interview\s+invitation[\s\-–—]+(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)(?:\s*[|,!]|$)",
        re.IGNORECASE,
    ),
    re.compile(
        r"^(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]+?)\s*[\-–—]+\s*(?:interview|phone\s+screen|technical\s+screen)",
        re.IGNORECASE,
    ),
    re.compile(
        r"^(?P<company>[A-Za-z0-9][A-Za-z0-9\s&.,'\-]{2,40})\s*[\-–—:]\s*(?P<role>[A-Za-z0-9][A-Za-z0-9\s&.,'\-/]{2,80})\s*[\-–—]\s*application",
        re.IGNORECASE,
    ),
]

# Rejection is checked before offer to prevent false positives on phrases like
# "unfortunately we cannot extend an offer".
_STATUS_HINTS: list[tuple[re.Pattern, ApplicationStatus]] = [
    (
        re.compile(
            r"\b(unfortunately|not moving forward|unable to proceed|cannot extend an offer|"
            r"decided not to proceed|regret to inform|not selected|declined|"
            r"we will not be moving forward|we won't be moving forward)\b",
            re.IGNORECASE,
        ),
        ApplicationStatus.REJECTED,
    ),
    (
        re.compile(
            r"\b(pleased to offer|we are excited to offer|offer letter|"
            r"extend you an offer|congratulations.*offer|job offer)\b",
            re.IGNORECASE,
        ),
        ApplicationStatus.OFFER,
    ),
    (
        re.compile(r"\b(interview|assessment|screening|schedule)\b", re.IGNORECASE),
        ApplicationStatus.INTERVIEWING,
    ),
]


def extract_sender_domain(sender: str | None) -> str | None:
    """Extract bare domain from a sender like 'noreply@careers.acme.com' -> 'Acme'."""
    if not sender:
        return None
    m = re.search(r"@([\w.\-]+)", sender)
    if not m:
        return None
    parts = m.group(1).lower().split(".")
    meaningful = [p for p in parts[:-1] if p not in _ATS_SENDER_DOMAINS]
    if meaningful:
        return meaningful[-1].capitalize()
    first = parts[0] if parts else None
    if first and first not in _ATS_SENDER_DOMAINS:
        return first.capitalize()
    return None


def infer_status(text: str) -> ApplicationStatus:
    for pattern, app_status in _STATUS_HINTS:
        if pattern.search(text):
            return app_status
    return ApplicationStatus.APPLIED


def parse_application_from_email(email: EmailReference) -> Optional[dict]:
    """
    Try to extract company_name + role_title from an email subject/body.
    Returns a dict suitable for JobApplicationRepository.create(), or None.
    Returns None, rather than "Unknown Company", when company cannot be identified.
    """
    subject = email.subject or ""
    snippet = email.snippet or ""
    _raw_body = getattr(email, "body_text", None)
    body_text = _raw_body if isinstance(_raw_body, str) else ""
    haystack = f"{subject} {snippet} {body_text}"

    search_texts = [t for t in (subject, snippet, body_text) if t]

    for search_text in search_texts:
        for pattern in _APPLICATION_SUBJECT_PATTERNS:
            m = pattern.search(search_text)
            if not m:
                continue
            groups = m.groupdict()
            company = groups.get("company", "").strip().rstrip(".,!")
            role = groups.get("role", "").strip().rstrip(".,!")

            if not company:
                company = extract_sender_domain(email.sender) or ""

            if company and _is_ats_company_name(company):
                company = extract_sender_domain(email.sender) or ""

            if not company:
                continue

            if len(role) > 120:
                logger.warning("Role title exceeds 120 chars (%d), skipping: %r", len(role), role[:40])
                continue
            if len(company) > 120:
                logger.warning(
                    "Company name exceeds 120 chars (%d), skipping: %r", len(company), company[:40]
                )
                continue

            return {
                "company_name": company,
                "role_title": role or None,
                "status": infer_status(haystack),
                "source": "Gmail",
                "applied_at": email.received_at,
            }

    return None


def extract_role_from_subjects(subjects: list[str | None]) -> str | None:
    for subject in subjects:
        if not subject:
            continue
        for pattern in _APPLICATION_SUBJECT_PATTERNS:
            m = pattern.search(subject)
            if m:
                role = m.groupdict().get("role", "").strip().rstrip(".,!")
                if role:
                    return role
    return None
