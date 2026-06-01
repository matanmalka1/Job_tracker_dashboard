from unittest.mock import MagicMock


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
