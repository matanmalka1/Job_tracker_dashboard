import datetime as dt
from unittest.mock import MagicMock


class TestGmailClientParseDate:
    def test_rfc_with_timezone(self):
        from app.job_tracker.email_scanner.gmail_client import GmailClient

        result = GmailClient._parse_date("Mon, 01 Jan 2024 10:00:00 +0000")
        assert result.year == 2024
        assert result.tzinfo is not None

    def test_with_parenthetical_suffix(self):
        from app.job_tracker.email_scanner.gmail_client import GmailClient

        result = GmailClient._parse_date("Mon, 01 Jan 2024 10:00:00 +0000 (UTC)")
        assert result.year == 2024

    def test_bare_gmt(self):
        from app.job_tracker.email_scanner.gmail_client import GmailClient

        result = GmailClient._parse_date("Mon, 01 Jan 2024 10:00:00 GMT")
        assert result.year == 2024

    def test_none_returns_utc_now(self):
        from app.job_tracker.email_scanner.gmail_client import GmailClient

        before = dt.datetime.now(dt.timezone.utc)
        result = GmailClient._parse_date(None)
        after = dt.datetime.now(dt.timezone.utc)
        assert before <= result <= after

    def test_unparseable_returns_utc_now(self):
        from app.job_tracker.email_scanner.gmail_client import GmailClient

        before = dt.datetime.now(dt.timezone.utc)
        result = GmailClient._parse_date("not a date at all")
        after = dt.datetime.now(dt.timezone.utc)
        assert before <= result <= after


class TestKeywordMatching:
    def test_match_on_subject(self):
        from app.job_tracker.services.emails.email_matcher import matches_job_keywords

        assert matches_job_keywords("Your application has been received", None) is True

    def test_match_on_snippet(self):
        from app.job_tracker.services.emails.email_matcher import matches_job_keywords

        assert matches_job_keywords(None, "Thank you for applying to our team") is True

    def test_no_match(self):
        from app.job_tracker.services.emails.email_matcher import matches_job_keywords

        assert matches_job_keywords("Hello World", "How are you?") is False

    def test_both_none(self):
        from app.job_tracker.services.emails.email_matcher import matches_job_keywords

        assert matches_job_keywords(None, None) is False

    def test_case_insensitive(self):
        from app.job_tracker.services.emails.email_matcher import matches_job_keywords

        assert matches_job_keywords("INTERVIEW SCHEDULED", None) is True


class TestParseApplicationFromEmail:
    def _make_email(self, subject=None, snippet=None, sender="recruiter@acme.com"):
        email = MagicMock()
        email.subject = subject
        email.snippet = snippet
        email.sender = sender
        email.received_at = dt.datetime(2024, 6, 1, 12, 0, 0, tzinfo=dt.timezone.utc)
        return email

    def test_pattern1_role_and_company(self):
        from app.job_tracker.services.emails.email_parser import parse_application_from_email

        email = self._make_email("Your application to Software Engineer at Acme Corp")
        result = parse_application_from_email(email)
        assert result is not None
        assert "Acme Corp" in result["company_name"]
        assert "Software Engineer" in result["role_title"]

    def test_pattern2_thanks_for_applying(self):
        from app.job_tracker.services.emails.email_parser import parse_application_from_email

        email = self._make_email("Thanks for applying for Product Manager at Beta Inc")
        result = parse_application_from_email(email)
        assert result is not None
        assert "Beta Inc" in result["company_name"]

    def test_pattern3_company_only_no_role(self):
        from app.job_tracker.services.emails.email_parser import parse_application_from_email

        email = self._make_email("Thank you for applying to Gamma Ltd")
        result = parse_application_from_email(email)
        assert result is not None
        assert "Gamma" in result["company_name"]
        assert result["role_title"] is None

    def test_pattern4_application_sent_to(self):
        from app.job_tracker.services.emails.email_parser import parse_application_from_email

        email = self._make_email("Your application was sent to Delta Systems")
        result = parse_application_from_email(email)
        assert result is not None
        assert "Delta Systems" in result["company_name"]

    def test_pattern5_role_only_uses_sender_domain(self):
        from app.job_tracker.services.emails.email_parser import parse_application_from_email

        email = self._make_email(
            subject="Your application for Backend Engineer has been received",
            sender="noreply@epsilon.com",
        )
        result = parse_application_from_email(email)
        assert result is not None
        assert result["role_title"] is not None
        assert "Backend Engineer" in result["role_title"]
        assert result["company_name"] != ""

    def test_snippet_fallback(self):
        from app.job_tracker.services.emails.email_parser import parse_application_from_email

        email = self._make_email(
            subject="We received your application",
            snippet="Thank you for applying to Zeta Corp",
        )
        result = parse_application_from_email(email)
        assert result is not None
        assert "Zeta" in result["company_name"]

    def test_ats_greenhouse_domain_blocklisted(self):
        from app.job_tracker.services.emails.email_parser import extract_sender_domain

        result = extract_sender_domain("noreply@greenhouse.io")
        assert result is None

    def test_ats_taleo_domain_blocklisted(self):
        from app.job_tracker.services.emails.email_parser import extract_sender_domain

        result = extract_sender_domain("apply@taleo.net")
        assert result is None

    def test_status_inference_offer(self):
        from app.job_tracker.models.job_application import ApplicationStatus
        from app.job_tracker.services.emails.email_parser import infer_status

        assert infer_status("Congratulations! Job offer from Acme") == ApplicationStatus.OFFER

    def test_status_inference_rejected(self):
        from app.job_tracker.models.job_application import ApplicationStatus
        from app.job_tracker.services.emails.email_parser import infer_status

        assert infer_status("Unfortunately we are not moving forward") == ApplicationStatus.REJECTED

    def test_status_inference_interview(self):
        from app.job_tracker.models.job_application import ApplicationStatus
        from app.job_tracker.services.emails.email_parser import infer_status

        assert infer_status("Interview scheduled for next week") == ApplicationStatus.INTERVIEWING

    def test_status_inference_default_applied(self):
        from app.job_tracker.models.job_application import ApplicationStatus
        from app.job_tracker.services.emails.email_parser import infer_status

        assert infer_status("Thank you for applying") == ApplicationStatus.APPLIED

    def test_no_match_returns_none(self):
        from app.job_tracker.services.emails.email_parser import parse_application_from_email

        email = self._make_email("Hello! Happy Monday from us")
        result = parse_application_from_email(email)
        assert result is None


class TestWordBoundaryKeywordMatching:
    def test_hr_matches_hr_interview(self):
        from app.job_tracker.services.emails.email_matcher import matches_job_keywords

        assert matches_job_keywords("HR interview scheduled", None) is True

    def test_hr_does_not_match_through(self):
        from app.job_tracker.services.emails.email_matcher import matches_job_keywords

        assert matches_job_keywords("Shipping through Thursday", None) is False

    def test_hr_does_not_match_thursday(self):
        from app.job_tracker.services.emails.email_matcher import matches_job_keywords

        assert matches_job_keywords("See you Thursday", None) is False

    def test_hr_does_not_match_through_in_snippet(self):
        from app.job_tracker.services.emails.email_matcher import matches_job_keywords

        assert matches_job_keywords(None, "Shipping through Thursday") is False

    def test_interview_still_matches(self):
        from app.job_tracker.services.emails.email_matcher import matches_job_keywords

        assert matches_job_keywords("Interview scheduled next week", None) is True

    def test_application_still_matches(self):
        from app.job_tracker.services.emails.email_matcher import matches_job_keywords

        assert matches_job_keywords("Your application has been received", None) is True

    def test_body_text_contributes_to_match(self):
        from app.job_tracker.services.emails.email_matcher import matches_job_keywords

        assert matches_job_keywords("Hello", "Greetings", "We received your application") is True


class TestATSCompanyNameBlocklist:
    def _make_email(self, subject, sender="noreply@greenhouse.io"):
        email = MagicMock()
        email.subject = subject
        email.snippet = ""
        email.sender = sender
        email.received_at = dt.datetime(2024, 6, 1, 12, 0, 0, tzinfo=dt.timezone.utc)
        email.body_text = None
        return email

    def test_greenhouse_not_used_as_company(self):
        from app.job_tracker.services.emails.email_parser import parse_application_from_email

        email = self._make_email("Application Update from Greenhouse")
        result = parse_application_from_email(email)
        if result is not None:
            assert result["company_name"].lower() != "greenhouse"

    def test_lever_not_used_as_company(self):
        from app.job_tracker.services.emails.email_parser import parse_application_from_email

        email = self._make_email("Application Update from Lever", sender="noreply@lever.co")
        result = parse_application_from_email(email)
        if result is not None:
            assert result["company_name"].lower() != "lever"

    def test_non_ats_company_passes(self):
        from app.job_tracker.services.emails.email_parser import parse_application_from_email

        email = self._make_email(
            "Your application to Software Engineer at Acme Corp",
            sender="recruiter@acme.com",
        )
        result = parse_application_from_email(email)
        assert result is not None
        assert "Acme Corp" in result["company_name"]


class TestNoUnknownCompany:
    def _make_email(self, subject, sender="noreply@greenhouse.io"):
        email = MagicMock()
        email.subject = subject
        email.snippet = ""
        email.sender = sender
        email.received_at = dt.datetime(2024, 6, 1, 12, 0, 0, tzinfo=dt.timezone.utc)
        email.body_text = None
        return email

    def test_ats_role_only_returns_none(self):
        from app.job_tracker.services.emails.email_parser import parse_application_from_email

        email = self._make_email(
            "Your application for Backend Engineer has been received",
            sender="noreply@greenhouse.io",
        )
        result = parse_application_from_email(email)
        assert result is None or result["company_name"].lower() != "greenhouse"

    def test_unknown_company_never_created(self):
        from app.job_tracker.services.emails.email_parser import parse_application_from_email

        email = self._make_email(
            "Your application for Backend Engineer has been received",
            sender="noreply@greenhouse.io",
        )
        result = parse_application_from_email(email)
        if result is not None:
            assert "unknown" not in result["company_name"].lower()


class TestStatusInferenceOrder:
    def test_unfortunately_cannot_extend_offer_is_rejected(self):
        from app.job_tracker.models.job_application import ApplicationStatus
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("Unfortunately we cannot extend an offer at this time")
        assert result == ApplicationStatus.REJECTED

    def test_not_moving_forward_is_rejected(self):
        from app.job_tracker.models.job_application import ApplicationStatus
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("We will not be moving forward with your candidacy")
        assert result == ApplicationStatus.REJECTED

    def test_pleased_to_offer_is_offer(self):
        from app.job_tracker.models.job_application import ApplicationStatus
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("We are pleased to offer you the position")
        assert result == ApplicationStatus.OFFER

    def test_offer_letter_is_offer(self):
        from app.job_tracker.models.job_application import ApplicationStatus
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("Please find your offer letter attached")
        assert result == ApplicationStatus.OFFER

    def test_extend_you_an_offer_is_offer(self):
        from app.job_tracker.models.job_application import ApplicationStatus
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("We are excited to extend you an offer")
        assert result == ApplicationStatus.OFFER

    def test_plain_offer_word_alone_not_classified_as_offer(self):
        from app.job_tracker.models.job_application import ApplicationStatus
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("Unfortunately, we cannot offer you a position")
        assert result == ApplicationStatus.REJECTED
