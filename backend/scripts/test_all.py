"""
pytest test suite for the Job Dashboard API.

Run with:
    pip install pytest pytest-asyncio httpx aiosqlite
    pytest tests/ -v
"""
import datetime as dt
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from unittest.mock import MagicMock, patch, AsyncMock

# ── in-memory test DB ─────────────────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


# ── app fixtures ──────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def db_session():
    """Yield a fresh async session backed by an in-memory SQLite database."""
    from app.db import Base

    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        # Import models so metadata is populated
        import app.job_tracker.models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    """FastAPI test client wired to the in-memory DB session."""
    from app.main import app
    from app.db import get_session

    async def _override_session():
        yield db_session

    app.dependency_overrides[get_session] = _override_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ── helpers ───────────────────────────────────────────────────────────────────

def _make_email_data(suffix: str = "1") -> dict:
    return {
        "gmail_message_id": f"msg-{suffix}",
        "subject": f"Your application at Acme {suffix}",
        "sender": "recruiter@acme.com",
        "received_at": dt.datetime(2024, 1, 1, 12, 0, 0, tzinfo=dt.timezone.utc),
        "snippet": "Thank you for applying…",
    }


# ══════════════════════════════════════════════════════════════════════════════
# Unit tests — GmailClient._parse_date
# ══════════════════════════════════════════════════════════════════════════════

class TestGmailClientParseDate:
    from app.job_tracker.email_scanner.gmail_client import GmailClient

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
        result = GmailClient._parse_date("not a date at all ¯\\_(ツ)_/¯")
        after = dt.datetime.now(dt.timezone.utc)
        assert before <= result <= after


# ══════════════════════════════════════════════════════════════════════════════
# Unit tests — keyword matching
# ══════════════════════════════════════════════════════════════════════════════

class TestKeywordMatching:
    def test_match_on_subject(self):
        from app.job_tracker.services.email_scan_service import _matches_keywords
        assert _matches_keywords("Your application has been received", None) is True

    def test_match_on_snippet(self):
        from app.job_tracker.services.email_scan_service import _matches_keywords
        assert _matches_keywords(None, "Thank you for applying to our team") is True

    def test_no_match(self):
        from app.job_tracker.services.email_scan_service import _matches_keywords
        assert _matches_keywords("Hello World", "How are you?") is False

    def test_both_none(self):
        from app.job_tracker.services.email_scan_service import _matches_keywords
        assert _matches_keywords(None, None) is False

    def test_case_insensitive(self):
        from app.job_tracker.services.email_scan_service import _matches_keywords
        assert _matches_keywords("INTERVIEW SCHEDULED", None) is True


# ══════════════════════════════════════════════════════════════════════════════
# Unit tests — application_matcher
# ══════════════════════════════════════════════════════════════════════════════

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
        from app.job_tracker.services.application_matcher import match_email_to_application
        apps = [self._make_app("Acme Corp", "Software Engineer")]
        email = self._make_email("Your application at Acme Corp")
        result = match_email_to_application(email, apps)
        assert result is apps[0]

    def test_no_match_below_threshold(self):
        from app.job_tracker.services.application_matcher import match_email_to_application
        apps = [self._make_app("XYZ Inc", "Data Scientist")]
        email = self._make_email("Hello from Amazon AWS about Python")
        result = match_email_to_application(email, apps)
        assert result is None

    def test_empty_applications(self):
        from app.job_tracker.services.application_matcher import match_email_to_application
        email = self._make_email("Interview at Acme Corp")
        assert match_email_to_application(email, []) is None

    def test_picks_best_match(self):
        from app.job_tracker.services.application_matcher import match_email_to_application
        apps = [
            self._make_app("Google", "SWE"),
            self._make_app("Meta", "Product Manager"),
        ]
        email = self._make_email("Application status update from Google")
        result = match_email_to_application(email, apps)
        assert result is apps[0]


# ══════════════════════════════════════════════════════════════════════════════
# Repository tests
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestEmailReferenceRepository:
    async def test_create_and_retrieve(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        repo = EmailReferenceRepository(db_session)
        record, created = await repo.create_from_raw_message(_make_email_data("r1"))
        await db_session.commit()
        assert created is True
        assert record.gmail_message_id == "msg-r1"

    async def test_duplicate_not_inserted(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        repo = EmailReferenceRepository(db_session)
        await repo.create_from_raw_message(_make_email_data("dup"))
        await db_session.commit()
        _, created = await repo.create_from_raw_message(_make_email_data("dup"))
        assert created is False

    async def test_bulk_create_skips_duplicates(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        repo = EmailReferenceRepository(db_session)
        inserted, skipped = await repo.bulk_create([_make_email_data("b1"), _make_email_data("b2")])
        await db_session.commit()
        assert inserted == 2
        assert skipped == 0

        inserted2, skipped2 = await repo.bulk_create([_make_email_data("b1"), _make_email_data("b3")])
        await db_session.commit()
        assert inserted2 == 1
        assert skipped2 == 1

    async def test_list_paginated(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        repo = EmailReferenceRepository(db_session)
        for i in range(5):
            await repo.create_from_raw_message(_make_email_data(f"p{i}"))
        await db_session.commit()

        items, total = await repo.list_paginated(limit=3, offset=0)
        assert total == 5
        assert len(items) == 3

    async def test_missing_message_id_returns_none(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        repo = EmailReferenceRepository(db_session)
        record, created = await repo.create_from_raw_message({})
        assert record is None
        assert created is False


@pytest.mark.asyncio
class TestJobApplicationRepository:
    async def test_create_and_get(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "role_title": "Engineer"})
        await db_session.commit()
        fetched = await repo.get_by_id(app.id)
        assert fetched is not None
        assert fetched.company_name == "Acme"

    async def test_update_sets_field(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "role_title": "Engineer"})
        await db_session.commit()

        updated = await repo.update(app.id, {"role_title": "Senior Engineer"})
        await db_session.commit()
        assert updated.role_title == "Senior Engineer"

    async def test_update_nonexistent_returns_none(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
        repo = JobApplicationRepository(db_session)
        result = await repo.update(99999, {"role_title": "anything"})
        assert result is None

    async def test_delete(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "role_title": "Engineer"})
        await db_session.commit()
        deleted = await repo.delete(app.id)
        assert deleted is True
        assert await repo.get_by_id(app.id) is None

    async def test_delete_nonexistent_returns_false(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
        repo = JobApplicationRepository(db_session)
        assert await repo.delete(99999) is False

    async def test_list_paginated_with_status_filter(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
        from app.job_tracker.models.job_application import ApplicationStatus
        repo = JobApplicationRepository(db_session)
        await repo.create({"company_name": "A", "role_title": "R", "status": ApplicationStatus.NEW})
        await repo.create({"company_name": "B", "role_title": "R", "status": ApplicationStatus.APPLIED})
        await db_session.commit()

        items, total = await repo.list_paginated(limit=10, offset=0, status=ApplicationStatus.APPLIED)
        assert total == 1
        assert items[0].company_name == "B"


# ══════════════════════════════════════════════════════════════════════════════
# API endpoint integration tests
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestHealthEndpoint:
    async def test_health(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["db"] == "ok"


@pytest.mark.asyncio
class TestEmailsEndpoint:
    async def test_list_empty(self, client):
        response = await client.get("/job-tracker/emails")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []

    async def test_list_after_insert(self, client, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        repo = EmailReferenceRepository(db_session)
        await repo.create_from_raw_message(_make_email_data("api1"))
        await db_session.commit()

        response = await client.get("/job-tracker/emails")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["gmail_message_id"] == "msg-api1"

    async def test_pagination(self, client, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        repo = EmailReferenceRepository(db_session)
        for i in range(5):
            await repo.create_from_raw_message(_make_email_data(f"pg{i}"))
        await db_session.commit()

        response = await client.get("/job-tracker/emails?limit=2&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert len(data["items"]) == 2

    async def test_scan_without_config_returns_error_or_runs(self, client):
        """Scan endpoint responds — 503/502 if Gmail errors, 202 if it runs (no real credentials needed in unit tests)."""
        response = await client.post("/job-tracker/scan")
        assert response.status_code in (503, 502, 202)


@pytest.mark.asyncio
class TestApplicationsEndpoint:
    async def test_create_application(self, client):
        response = await client.post(
            "/job-tracker/applications",
            json={"company_name": "Acme", "role_title": "Engineer"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["company_name"] == "Acme"
        assert data["status"] == "applied"
        assert "id" in data

    async def test_get_application(self, client):
        create_resp = await client.post(
            "/job-tracker/applications",
            json={"company_name": "Beta Corp", "role_title": "Designer"},
        )
        app_id = create_resp.json()["id"]

        get_resp = await client.get(f"/job-tracker/applications/{app_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["company_name"] == "Beta Corp"

    async def test_get_nonexistent_returns_404(self, client):
        response = await client.get("/job-tracker/applications/99999")
        assert response.status_code == 404

    async def test_update_application(self, client):
        create_resp = await client.post(
            "/job-tracker/applications",
            json={"company_name": "Gamma", "role_title": "PM"},
        )
        app_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/job-tracker/applications/{app_id}",
            json={"status": "applied"},
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == "applied"

    async def test_update_nonexistent_returns_404(self, client):
        response = await client.patch(
            "/job-tracker/applications/99999",
            json={"status": "applied"},
        )
        assert response.status_code == 404

    async def test_delete_application(self, client):
        create_resp = await client.post(
            "/job-tracker/applications",
            json={"company_name": "Delete Me", "role_title": "Temp"},
        )
        app_id = create_resp.json()["id"]

        del_resp = await client.delete(f"/job-tracker/applications/{app_id}")
        assert del_resp.status_code == 204

        get_resp = await client.get(f"/job-tracker/applications/{app_id}")
        assert get_resp.status_code == 404

    async def test_list_applications_empty(self, client):
        response = await client.get("/job-tracker/applications")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0

    async def test_list_applications_status_filter(self, client):
        await client.post(
            "/job-tracker/applications",
            json={"company_name": "A", "role_title": "R", "status": "new"},
        )
        await client.post(
            "/job-tracker/applications",
            json={"company_name": "B", "role_title": "R", "status": "applied"},
        )

        response = await client.get("/job-tracker/applications?status=applied")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["company_name"] == "B"

    async def test_assign_email_to_application(self, client, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        repo = EmailReferenceRepository(db_session)
        email_record, _ = await repo.create_from_raw_message(_make_email_data("assign1"))
        await db_session.commit()

        create_resp = await client.post(
            "/job-tracker/applications",
            json={"company_name": "Assign Corp", "role_title": "Engineer"},
        )
        app_id = create_resp.json()["id"]

        assign_resp = await client.post(
            f"/job-tracker/applications/{app_id}/emails/{email_record.id}"
        )
        assert assign_resp.status_code == 200
        assert assign_resp.json()["assigned"] is True

    async def test_assign_nonexistent_email_returns_404(self, client):
        create_resp = await client.post(
            "/job-tracker/applications",
            json={"company_name": "Corp", "role_title": "Engineer"},
        )
        app_id = create_resp.json()["id"]
        response = await client.post(f"/job-tracker/applications/{app_id}/emails/99999")
        assert response.status_code == 404

    async def test_invalid_status_returns_422(self, client):
        response = await client.post(
            "/job-tracker/applications",
            json={"company_name": "Corp", "role_title": "R", "status": "not_a_status"},
        )
        assert response.status_code == 422


# ══════════════════════════════════════════════════════════════════════════════
# Executor lifecycle tests
# ══════════════════════════════════════════════════════════════════════════════

class TestExecutorLifecycle:
    def test_get_executor_returns_same_instance(self):
        from app.job_tracker.services import email_scan_service
        email_scan_service._executor = None  # reset
        e1 = email_scan_service._get_executor()
        e2 = email_scan_service._get_executor()
        assert e1 is e2

    def test_shutdown_sets_none(self):
        from app.job_tracker.services import email_scan_service
        email_scan_service._get_executor()  # ensure it exists
        email_scan_service.shutdown_executor()
        assert email_scan_service._executor is None

    def test_get_executor_after_shutdown_creates_new(self):
        from app.job_tracker.services import email_scan_service
        email_scan_service.shutdown_executor()
        executor = email_scan_service._get_executor()
        assert executor is not None
        assert not executor._shutdown
        email_scan_service.shutdown_executor()


# ══════════════════════════════════════════════════════════════════════════════
# Unit tests — _parse_application_from_email
# ══════════════════════════════════════════════════════════════════════════════

class TestParseApplicationFromEmail:
    def _make_email(self, subject=None, snippet=None, sender="recruiter@acme.com"):
        email = MagicMock()
        email.subject = subject
        email.snippet = snippet
        email.sender = sender
        email.received_at = dt.datetime(2024, 6, 1, 12, 0, 0, tzinfo=dt.timezone.utc)
        return email

    def test_pattern1_role_and_company(self):
        from app.job_tracker.services.email_scan_service import _parse_application_from_email
        email = self._make_email("Your application to Software Engineer at Acme Corp")
        result = _parse_application_from_email(email)
        assert result is not None
        assert "Acme Corp" in result["company_name"]
        assert "Software Engineer" in result["role_title"]

    def test_pattern2_thanks_for_applying(self):
        from app.job_tracker.services.email_scan_service import _parse_application_from_email
        email = self._make_email("Thanks for applying for Product Manager at Beta Inc")
        result = _parse_application_from_email(email)
        assert result is not None
        assert "Beta Inc" in result["company_name"]

    def test_pattern3_company_only_no_role(self):
        from app.job_tracker.services.email_scan_service import _parse_application_from_email
        email = self._make_email("Thank you for applying to Gamma Ltd")
        result = _parse_application_from_email(email)
        assert result is not None
        assert "Gamma" in result["company_name"]
        assert result["role_title"] is None

    def test_pattern4_application_sent_to(self):
        from app.job_tracker.services.email_scan_service import _parse_application_from_email
        email = self._make_email("Your application was sent to Delta Systems")
        result = _parse_application_from_email(email)
        assert result is not None
        assert "Delta Systems" in result["company_name"]

    def test_pattern5_role_only_uses_sender_domain(self):
        from app.job_tracker.services.email_scan_service import _parse_application_from_email
        email = self._make_email(
            subject="Your application for Backend Engineer has been received",
            sender="noreply@epsilon.com",
        )
        result = _parse_application_from_email(email)
        assert result is not None
        assert result["role_title"] is not None
        assert "Backend Engineer" in result["role_title"]
        # Company comes from sender domain
        assert result["company_name"] != ""

    def test_snippet_fallback(self):
        from app.job_tracker.services.email_scan_service import _parse_application_from_email
        email = self._make_email(
            subject="We received your application",
            snippet="Thank you for applying to Zeta Corp",
        )
        result = _parse_application_from_email(email)
        assert result is not None
        assert "Zeta" in result["company_name"]

    def test_ats_domain_blocklisted(self):
        from app.job_tracker.services.email_scan_service import _extract_sender_domain
        # greenhouse.io should be blocked — return None or fall through
        result = _extract_sender_domain("noreply@greenhouse.io")
        # Should NOT return "Greenhouse" — it's in the blocklist
        assert result is None

    def test_ats_taleo_domain_blocklisted(self):
        from app.job_tracker.services.email_scan_service import _extract_sender_domain
        result = _extract_sender_domain("apply@taleo.net")
        assert result is None

    def test_status_inference_offer(self):
        from app.job_tracker.services.email_scan_service import _infer_status
        from app.job_tracker.models.job_application import ApplicationStatus
        assert _infer_status("Congratulations! Job offer from Acme") == ApplicationStatus.OFFER

    def test_status_inference_rejected(self):
        from app.job_tracker.services.email_scan_service import _infer_status
        from app.job_tracker.models.job_application import ApplicationStatus
        assert _infer_status("Unfortunately we are not moving forward") == ApplicationStatus.REJECTED

    def test_status_inference_interview(self):
        from app.job_tracker.services.email_scan_service import _infer_status
        from app.job_tracker.models.job_application import ApplicationStatus
        assert _infer_status("Interview scheduled for next week") == ApplicationStatus.INTERVIEWING

    def test_status_inference_default_applied(self):
        from app.job_tracker.services.email_scan_service import _infer_status
        from app.job_tracker.models.job_application import ApplicationStatus
        assert _infer_status("Thank you for applying") == ApplicationStatus.APPLIED

    def test_no_match_returns_none(self):
        from app.job_tracker.services.email_scan_service import _parse_application_from_email
        email = self._make_email("Hello! Happy Monday from us")
        result = _parse_application_from_email(email)
        assert result is None


# ══════════════════════════════════════════════════════════════════════════════
# Integration tests — _auto_create_applications
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestAutoCreateApplications:
    async def test_parseable_email_creates_application(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
        from app.job_tracker.services.email_scan_service import EmailScanService

        email_repo = EmailReferenceRepository(db_session)
        app_repo = JobApplicationRepository(db_session)

        # Insert an unlinked email with a parseable subject
        data = {
            "gmail_message_id": "auto-create-1",
            "subject": "Your application to Data Scientist at AutoCo",
            "sender": "jobs@autoco.com",
            "received_at": dt.datetime(2024, 6, 1, tzinfo=dt.timezone.utc),
            "snippet": "We received your application.",
        }
        record, _ = await email_repo.create_from_raw_message(data)
        await db_session.commit()

        # Run auto-create (we pass a dummy gmail_client — it won't be called)
        service = EmailScanService(gmail_client=None, repo=email_repo, app_repo=app_repo)
        created = await service._auto_create_applications()

        assert created == 1
        # Email should now be linked
        await db_session.refresh(record)
        assert record.application_id is not None

    async def test_duplicate_does_not_create_second_app(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
        from app.job_tracker.services.email_scan_service import EmailScanService

        email_repo = EmailReferenceRepository(db_session)
        app_repo = JobApplicationRepository(db_session)

        # Pre-create an existing application
        existing = await app_repo.create({
            "company_name": "DupCo",
            "role_title": "Engineer",
        })
        await db_session.commit()

        # Insert an unlinked email matching the same company/role
        data = {
            "gmail_message_id": "dup-email-1",
            "subject": "Your application to Engineer at DupCo",
            "sender": "noreply@dupco.com",
            "received_at": dt.datetime(2024, 6, 2, tzinfo=dt.timezone.utc),
            "snippet": "",
        }
        await email_repo.create_from_raw_message(data)
        await db_session.commit()

        service = EmailScanService(gmail_client=None, repo=email_repo, app_repo=app_repo)
        created = await service._auto_create_applications()

        # No new app should be created — it matched the existing one
        assert created == 0

    async def test_unparseable_email_is_skipped(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
        from app.job_tracker.services.email_scan_service import EmailScanService

        email_repo = EmailReferenceRepository(db_session)
        app_repo = JobApplicationRepository(db_session)

        data = {
            "gmail_message_id": "unparseable-1",
            "subject": "Hello have a great day!",
            "sender": "someone@example.com",
            "received_at": dt.datetime(2024, 6, 3, tzinfo=dt.timezone.utc),
            "snippet": "",
        }
        await email_repo.create_from_raw_message(data)
        await db_session.commit()

        service = EmailScanService(gmail_client=None, repo=email_repo, app_repo=app_repo)
        created = await service._auto_create_applications()
        assert created == 0


# ══════════════════════════════════════════════════════════════════════════════
# API endpoint tests — new endpoints
# ══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
class TestStatsEndpoint:
    async def test_stats_empty(self, client):
        response = await client.get("/job-tracker/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["reply_rate"] == 0.0

    async def test_stats_counts_match(self, client):
        await client.post("/job-tracker/applications", json={"company_name": "A", "role_title": "R", "status": "applied"})
        await client.post("/job-tracker/applications", json={"company_name": "B", "role_title": "R", "status": "interviewing"})
        await client.post("/job-tracker/applications", json={"company_name": "C", "role_title": "R", "status": "applied"})

        response = await client.get("/job-tracker/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert data["by_status"]["applied"] == 2
        assert data["by_status"]["interviewing"] == 1


@pytest.mark.asyncio
class TestScanHistoryEndpoint:
    async def test_scan_history_empty(self, client):
        response = await client.get("/job-tracker/scan/history")
        assert response.status_code == 200
        assert response.json() == []

    async def test_scan_history_after_run(self, db_session, client):
        from app.job_tracker.repositories.scan_run_repository import ScanRunRepository
        repo = ScanRunRepository(db_session)
        run = await repo.create()
        await repo.complete(run.id, emails_fetched=10, emails_inserted=5, apps_created=2)

        response = await client.get("/job-tracker/scan/history")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "completed"
        assert data[0]["emails_inserted"] == 5
        assert data[0]["apps_created"] == 2


@pytest.mark.asyncio
class TestUnassignEmailEndpoint:
    async def test_unassign_email(self, client, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        repo = EmailReferenceRepository(db_session)
        email_rec, _ = await repo.create_from_raw_message(_make_email_data("unassign1"))
        await db_session.commit()

        create_resp = await client.post(
            "/job-tracker/applications",
            json={"company_name": "UnassignCo", "role_title": "Dev"},
        )
        app_id = create_resp.json()["id"]

        # Assign first
        assign_resp = await client.post(f"/job-tracker/applications/{app_id}/emails/{email_rec.id}")
        assert assign_resp.status_code == 200

        # Then unassign
        unassign_resp = await client.delete(f"/job-tracker/applications/{app_id}/emails/{email_rec.id}")
        assert unassign_resp.status_code == 200
        assert unassign_resp.json()["unassigned"] is True

    async def test_unassign_nonexistent_returns_404(self, client):
        create_resp = await client.post(
            "/job-tracker/applications",
            json={"company_name": "Corp", "role_title": "Dev"},
        )
        app_id = create_resp.json()["id"]
        response = await client.delete(f"/job-tracker/applications/{app_id}/emails/99999")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestSearchAndSort:
    async def test_search_by_company(self, client):
        await client.post("/job-tracker/applications", json={"company_name": "SearchMe Inc", "role_title": "Dev"})
        await client.post("/job-tracker/applications", json={"company_name": "OtherCo", "role_title": "Dev"})

        response = await client.get("/job-tracker/applications?search=SearchMe")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["company_name"] == "SearchMe Inc"

    async def test_search_by_role(self, client):
        await client.post("/job-tracker/applications", json={"company_name": "AnyCompany", "role_title": "UniqueRoleXYZ"})

        response = await client.get("/job-tracker/applications?search=UniqueRoleXYZ")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1

    async def test_sort_by_company_name(self, client):
        await client.post("/job-tracker/applications", json={"company_name": "Zebra Corp", "role_title": "Dev"})
        await client.post("/job-tracker/applications", json={"company_name": "Alpha Corp", "role_title": "Dev"})

        response = await client.get("/job-tracker/applications?sort=company_name")
        assert response.status_code == 200
        data = response.json()
        assert data["items"][0]["company_name"] == "Alpha Corp"


@pytest.mark.asyncio
class TestNewSchemaFields:
    async def test_create_application_with_notes_and_url(self, client):
        response = await client.post(
            "/job-tracker/applications",
            json={
                "company_name": "NotesCo",
                "role_title": "Engineer",
                "notes": "Great team, good benefits",
                "job_url": "https://notesCo.com/jobs/123",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["notes"] == "Great team, good benefits"
        assert data["job_url"] == "https://notesCo.com/jobs/123"

    async def test_update_notes(self, client):
        create_resp = await client.post(
            "/job-tracker/applications",
            json={"company_name": "UpdateNotesCo", "role_title": "Dev"},
        )
        app_id = create_resp.json()["id"]

        patch_resp = await client.patch(
            f"/job-tracker/applications/{app_id}",
            json={"notes": "Updated interview notes here"},
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["notes"] == "Updated interview notes here"


@pytest.mark.asyncio
class TestHealthEndpointWithDb:
    async def test_health_includes_db_status(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["db"] == "ok"
