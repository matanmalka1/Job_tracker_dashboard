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

# Free email providers and other generic domains that should never be used
# as a company-matching signal.
_GENERIC_EMAIL_DOMAINS: frozenset[str] = frozenset([
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "yahoo.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
    "live.com",
    "msn.com",
    "me.com",
    "aol.com",
    "mail.com",
    "yandex.com",
    "zoho.com",
])


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


def extract_email_domain(sender: str | None) -> Optional[str]:
    """Extract the full domain from a sender address.

    'Recruiter Name <recruiter@google.com>' -> 'google.com'
    'noreply@mail.careers.acme.com'         -> 'mail.careers.acme.com'
    """
    if not sender:
        return None
    m = re.search(r"@([\w.\-]+)", sender)
    return m.group(1).lower() if m else None


def normalize_domain(domain: str) -> str:
    """Return the registrable root of a domain (last two labels).

    'mail.careers.acme.com' -> 'acme.com'
    'google.com'            -> 'google.com'
    'sub.company.co.il'     -> 'co.il' would be wrong, so we keep three labels
                              when the second-to-last is a known ccSLD (co, com, org, net).
    """
    parts = domain.lower().split(".")
    if len(parts) <= 2:
        return domain.lower()
    # Known second-level ccTLD labels: co, com, org, net, gov, edu, ac
    _CCSLD = {"co", "com", "org", "net", "gov", "edu", "ac"}
    if parts[-2] in _CCSLD and len(parts) >= 3:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def is_generic_email_domain(domain: str) -> bool:
    """Return True if domain is a free/personal provider that carries no company signal."""
    return normalize_domain(domain) in _GENERIC_EMAIL_DOMAINS


def match_application_by_domain(
    sender_domain: str,
    applications: list,
) -> Optional[object]:
    """Find a single unambiguous application whose company name matches sender_domain.

    Matching priority (when multiple candidates share the domain):
    1. Prefer active/open applications (not rejected).
    2. Prefer the newest application (highest id as proxy).
    3. If still ambiguous (more than one candidate after filtering), return None.
    """
    root = normalize_domain(sender_domain)
    # Strip TLD to get a bare brand name for matching
    brand = root.split(".")[0]  # e.g. 'google' from 'google.com'
    if len(brand) <= 2:
        return None

    candidates = []
    for app in applications:
        company_lower = app.company_name.lower()
        # Match if brand appears as a word inside the company name
        if re.search(r"\b" + re.escape(brand) + r"\b", company_lower):
            candidates.append(app)

    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]

    # Multiple matches — prefer active ones
    active = [a for a in candidates if getattr(a, "status", None) not in ("rejected",)]
    pool = active if active else candidates
    if len(pool) == 1:
        return pool[0]

    # Still ambiguous — pick newest by id
    newest = max(pool, key=lambda a: a.id)
    # Only auto-link if there isn't another equally-new tie
    ties = [a for a in pool if a.id == newest.id]
    return newest if len(ties) == 1 else None


def match_email_to_application(email_reference, applications: list) -> Optional[object]:
    """Try to match an EmailReference to an existing JobApplication.

    Priority:
    1. Strong company-name / role-name text match (score >= 5).
    2. Domain match with a non-generic sender domain.
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

    if best_score >= 5:
        return best_match

    # Fallback: domain-based match
    domain = extract_email_domain(sender)
    if domain and not is_generic_email_domain(domain):
        return match_application_by_domain(domain, applications)

    return None
