"""Tests for update_status_from_email() priority logic."""
import pytest

from app.job_tracker.models.job_application import ApplicationStatus


@pytest.mark.asyncio
class TestUpdateStatusFromEmail:
    async def test_interview_email_upgrades_applied(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "status": "applied"})
        await db_session.commit()

        changed = await repo.update_status_from_email(app, ApplicationStatus.INTERVIEWING)
        await db_session.commit()

        assert changed is True
        assert app.status == ApplicationStatus.INTERVIEWING

    async def test_applied_inference_does_not_change_status(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "status": "applied"})
        await db_session.commit()

        changed = await repo.update_status_from_email(app, ApplicationStatus.APPLIED)
        await db_session.commit()

        assert changed is False
        assert app.status == ApplicationStatus.APPLIED

    async def test_applied_inference_does_not_downgrade_interviewing(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "status": "interviewing"})
        await db_session.commit()

        changed = await repo.update_status_from_email(app, ApplicationStatus.APPLIED)
        await db_session.commit()

        assert changed is False
        assert app.status == ApplicationStatus.INTERVIEWING

    async def test_rejection_email_upgrades_applied(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "status": "applied"})
        await db_session.commit()

        changed = await repo.update_status_from_email(app, ApplicationStatus.REJECTED)
        await db_session.commit()

        assert changed is True
        assert app.status == ApplicationStatus.REJECTED

    async def test_rejection_does_not_override_interviewing(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "status": "interviewing"})
        await db_session.commit()

        changed = await repo.update_status_from_email(app, ApplicationStatus.REJECTED)
        await db_session.commit()

        assert changed is False
        assert app.status == ApplicationStatus.INTERVIEWING

    async def test_rejection_does_not_override_offer(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "status": "offer"})
        await db_session.commit()

        changed = await repo.update_status_from_email(app, ApplicationStatus.REJECTED)
        await db_session.commit()

        assert changed is False
        assert app.status == ApplicationStatus.OFFER

    async def test_offer_upgrades_interviewing(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "status": "interviewing"})
        await db_session.commit()

        changed = await repo.update_status_from_email(app, ApplicationStatus.OFFER)
        await db_session.commit()

        assert changed is True
        assert app.status == ApplicationStatus.OFFER

    async def test_interviewing_does_not_downgrade_offer(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "status": "offer"})
        await db_session.commit()

        changed = await repo.update_status_from_email(app, ApplicationStatus.INTERVIEWING)
        await db_session.commit()

        assert changed is False
        assert app.status == ApplicationStatus.OFFER

    async def test_rejected_is_terminal_does_not_revert_to_interviewing(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "status": "rejected"})
        await db_session.commit()

        changed = await repo.update_status_from_email(app, ApplicationStatus.INTERVIEWING)
        await db_session.commit()

        assert changed is False
        assert app.status == ApplicationStatus.REJECTED

    async def test_rejected_is_terminal_does_not_revert_to_offer(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "status": "rejected"})
        await db_session.commit()

        changed = await repo.update_status_from_email(app, ApplicationStatus.OFFER)
        await db_session.commit()

        assert changed is False
        assert app.status == ApplicationStatus.REJECTED

    async def test_same_status_no_change(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        app = await repo.create({"company_name": "Acme", "status": "interviewing"})
        await db_session.commit()

        changed = await repo.update_status_from_email(app, ApplicationStatus.INTERVIEWING)
        await db_session.commit()

        assert changed is False


@pytest.mark.asyncio
class TestInferStatusIntegration:
    """Test infer_status() produces sensible output for real-world strings."""

    def test_interview_text_infers_interviewing(self):
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("We'd like to invite you to an interview next week")
        assert result == ApplicationStatus.INTERVIEWING

    def test_rejection_text_infers_rejected(self):
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("Unfortunately we will not be moving forward with your application")
        assert result == ApplicationStatus.REJECTED

    def test_offer_text_infers_offer(self):
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("We are pleased to offer you the position")
        assert result == ApplicationStatus.OFFER

    def test_generic_ack_infers_applied(self):
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("Thank you for applying to Acme Corp")
        assert result == ApplicationStatus.APPLIED

    def test_assessment_infers_interviewing(self):
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("Please complete the following assessment")
        assert result == ApplicationStatus.INTERVIEWING

    def test_bare_schedule_does_not_infer_interviewing(self):
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("Please schedule a call to discuss your candidacy")
        assert result == ApplicationStatus.APPLIED

    def test_schedule_interview_infers_interviewing(self):
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status("We'd like to schedule an interview with you")
        assert result == ApplicationStatus.INTERVIEWING

    def test_rejection_before_offer_phrase(self):
        from app.job_tracker.services.emails.email_parser import infer_status

        # "cannot extend an offer" should be REJECTED not OFFER
        result = infer_status("Unfortunately we cannot extend an offer at this time")
        assert result == ApplicationStatus.REJECTED

    def test_wont_be_continuing_infers_rejected(self):
        """Regression test: real rejection email phrasing ("we won't be
        continuing with the process for this role") wasn't in the REJECTED
        keyword list at all, so it fell through to the APPLIED default."""
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status(
            "After reviewing your application, we won't be continuing with "
            "the process for this role."
        )
        assert result == ApplicationStatus.REJECTED

    def test_typographic_apostrophe_still_matches_rejection(self):
        """Regression test: real emails commonly use a curly apostrophe (’)
        in contractions, which the straight-apostrophe regex patterns
        silently failed to match at all."""
        from app.job_tracker.services.emails.email_parser import infer_status

        result = infer_status(
            "After reviewing your application, we won’t be continuing "
            "with the process for this role."
        )
        assert result == ApplicationStatus.REJECTED


@pytest.mark.asyncio
class TestAssignEmailStatusInference:
    """Integration test: assign_email triggers status update."""

    async def test_assign_interview_email_updates_status(self, db_session):
        import datetime as dt
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        from app.job_tracker.services.job_application_service import JobApplicationService

        app_repo = JobApplicationRepository(db_session)
        email_repo = EmailReferenceRepository(db_session)
        service = JobApplicationService(app_repo, email_repo)

        app = await app_repo.create({"company_name": "Acme", "status": "applied"})
        await db_session.commit()

        email_data = {
            "gmail_message_id": "msg-interview-001",
            "subject": "Interview invitation at Acme",
            "snippet": "We'd like to schedule an interview with you",
            "sender": "recruiter@acme.com",
            "received_at": dt.datetime(2024, 6, 1, tzinfo=dt.timezone.utc),
        }
        from app.job_tracker.models.email_reference import EmailReference
        email = EmailReference(**email_data)
        db_session.add(email)
        await db_session.flush()

        result = await service.assign_email(app.id, email.id)
        assert result is True

        refreshed = await app_repo.get_by_id(app.id)
        assert refreshed.status == ApplicationStatus.INTERVIEWING

    async def test_reassigning_email_updates_previous_applications_last_email_at(self, db_session):
        """assign_email must recompute the OLD application's last_email_at when an
        email is reassigned away from it — otherwise it's left with a stale
        timestamp that no longer corresponds to any of its linked emails."""
        import datetime as dt
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository
        from app.job_tracker.services.job_application_service import JobApplicationService
        from app.job_tracker.models.email_reference import EmailReference

        app_repo = JobApplicationRepository(db_session)
        email_repo = EmailReferenceRepository(db_session)
        service = JobApplicationService(app_repo, email_repo)

        app_a = await app_repo.create({"company_name": "A Corp", "status": "applied"})
        app_b = await app_repo.create({"company_name": "B Corp", "status": "applied"})
        await db_session.commit()

        email = EmailReference(
            gmail_message_id="msg-reassign-001",
            subject="Application received",
            snippet="Thanks for applying",
            sender="hr@acorp.com",
            received_at=dt.datetime(2024, 6, 1, tzinfo=dt.timezone.utc),
        )
        db_session.add(email)
        await db_session.flush()

        # Link to A first, so A.last_email_at is driven by this email
        assert await service.assign_email(app_a.id, email.id) is True
        refreshed_a = await app_repo.get_by_id(app_a.id)
        assert refreshed_a.last_email_at == email.received_at

        # Reassign the same email to B — A no longer has any linked emails,
        # so A.last_email_at must be cleared, not left stale.
        assert await service.assign_email(app_b.id, email.id) is True

        refreshed_a_after = await app_repo.get_by_id(app_a.id)
        refreshed_b = await app_repo.get_by_id(app_b.id)
        assert refreshed_a_after.last_email_at is None
        assert refreshed_b.last_email_at == email.received_at
