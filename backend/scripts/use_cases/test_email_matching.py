from unittest.mock import MagicMock


class TestDomainHelpers:
    def test_extract_email_domain_simple(self):
        from app.job_tracker.services.emails.email_matcher import extract_email_domain
        assert extract_email_domain("recruiter@google.com") == "google.com"

    def test_extract_email_domain_display_name(self):
        from app.job_tracker.services.emails.email_matcher import extract_email_domain
        assert extract_email_domain("Recruiter Name <recruiter@google.com>") == "google.com"

    def test_extract_email_domain_subdomain(self):
        from app.job_tracker.services.emails.email_matcher import extract_email_domain
        assert extract_email_domain("noreply@mail.careers.acme.com") == "mail.careers.acme.com"

    def test_extract_email_domain_none(self):
        from app.job_tracker.services.emails.email_matcher import extract_email_domain
        assert extract_email_domain(None) is None

    def test_extract_email_domain_no_at(self):
        from app.job_tracker.services.emails.email_matcher import extract_email_domain
        assert extract_email_domain("notanemail") is None

    def test_normalize_domain_simple(self):
        from app.job_tracker.services.emails.email_matcher import normalize_domain
        assert normalize_domain("google.com") == "google.com"

    def test_normalize_domain_subdomain(self):
        from app.job_tracker.services.emails.email_matcher import normalize_domain
        assert normalize_domain("mail.careers.acme.com") == "acme.com"

    def test_normalize_domain_ccsld(self):
        from app.job_tracker.services.emails.email_matcher import normalize_domain
        # sub.company.co.il -> company.co.il (three labels because co is ccSLD)
        assert normalize_domain("sub.company.co.il") == "company.co.il"

    def test_is_generic_gmail(self):
        from app.job_tracker.services.emails.email_matcher import is_generic_email_domain
        assert is_generic_email_domain("gmail.com") is True

    def test_is_generic_outlook(self):
        from app.job_tracker.services.emails.email_matcher import is_generic_email_domain
        assert is_generic_email_domain("outlook.com") is True

    def test_is_not_generic_company_domain(self):
        from app.job_tracker.services.emails.email_matcher import is_generic_email_domain
        assert is_generic_email_domain("google.com") is False

    def test_is_not_generic_subdomain_normalizes(self):
        from app.job_tracker.services.emails.email_matcher import is_generic_email_domain
        # mail.gmail.com normalizes to gmail.com → generic
        assert is_generic_email_domain("mail.gmail.com") is True


class TestDomainMatchApplication:
    def _make_app(self, company: str, status: str = "applied", app_id: int = 1):
        app = MagicMock()
        app.company_name = company
        app.role_title = None  # ensure str-compatible, not a MagicMock
        app.status = status
        app.id = app_id
        return app

    def test_google_domain_matches_google_app(self):
        from app.job_tracker.services.emails.email_matcher import match_application_by_domain
        apps = [self._make_app("Google", app_id=1)]
        assert match_application_by_domain("google.com", apps) is apps[0]

    def test_subdomain_normalizes_and_matches(self):
        from app.job_tracker.services.emails.email_matcher import match_application_by_domain
        apps = [self._make_app("Acme Corp", app_id=1)]
        assert match_application_by_domain("careers.acme.com", apps) is apps[0]

    def test_no_match_returns_none(self):
        from app.job_tracker.services.emails.email_matcher import match_application_by_domain
        apps = [self._make_app("Microsoft", app_id=1)]
        assert match_application_by_domain("google.com", apps) is None

    def test_ambiguous_same_domain_active_preferred(self):
        from app.job_tracker.services.emails.email_matcher import match_application_by_domain
        active = self._make_app("Google LLC", status="interviewing", app_id=2)
        rejected = self._make_app("Google", status="rejected", app_id=1)
        result = match_application_by_domain("google.com", [rejected, active])
        assert result is active

    def test_ambiguous_both_active_picks_newest(self):
        from app.job_tracker.services.emails.email_matcher import match_application_by_domain
        older = self._make_app("Google", status="applied", app_id=1)
        newer = self._make_app("Google Cloud", status="applied", app_id=5)
        result = match_application_by_domain("google.com", [older, newer])
        assert result is newer

    def test_generic_domain_skipped_via_full_matcher(self):
        from app.job_tracker.services.emails.email_matcher import match_email_to_application
        apps = [self._make_app("SomeCompany", app_id=1)]
        email = MagicMock()
        email.subject = "Hello"
        email.sender = "personal@gmail.com"
        result = match_email_to_application(email, apps)
        assert result is None

    def test_domain_match_fallback_when_text_score_low(self):
        from app.job_tracker.services.emails.email_matcher import match_email_to_application
        apps = [self._make_app("Stripe", app_id=1)]
        email = MagicMock()
        email.subject = "Next steps for your interview"
        email.sender = "recruiter@stripe.com"
        result = match_email_to_application(email, apps)
        assert result is apps[0]

    def test_existing_company_name_match_still_works(self):
        from app.job_tracker.services.emails.email_matcher import match_email_to_application
        apps = [self._make_app("Acme Corp", app_id=1)]
        email = MagicMock()
        email.subject = "Your application at Acme Corp has been received"
        email.sender = "noreply@careers.acme.com"
        result = match_email_to_application(email, apps)
        assert result is apps[0]


class TestApplicationMatcher:
    def _make_app(self, company: str, role: str):
        app = MagicMock()
        app.company_name = company
        app.role_title = role
        return app

    def _make_email(self, subject: str, sender: str = ""):
        email = MagicMock()
        email.subject = subject
        email.sender = sender
        return email

    def test_exact_company_match(self):
        from app.job_tracker.services.emails.email_matcher import match_email_to_application

        apps = [self._make_app("Acme Corp", "Software Engineer")]
        email = self._make_email("Your application at Acme Corp")
        result = match_email_to_application(email, apps)
        assert result is apps[0]

    def test_no_match_below_threshold(self):
        from app.job_tracker.services.emails.email_matcher import match_email_to_application

        apps = [self._make_app("XYZ Inc", "Data Scientist")]
        email = self._make_email("Hello from Amazon AWS about Python")
        result = match_email_to_application(email, apps)
        assert result is None

    def test_empty_applications(self):
        from app.job_tracker.services.emails.email_matcher import match_email_to_application

        email = self._make_email("Interview at Acme Corp")
        assert match_email_to_application(email, []) is None

    def test_picks_best_match(self):
        from app.job_tracker.services.emails.email_matcher import match_email_to_application

        apps = [
            self._make_app("Google", "SWE"),
            self._make_app("Meta", "Product Manager"),
        ]
        email = self._make_email("Application status update from Google")
        result = match_email_to_application(email, apps)
        assert result is apps[0]
