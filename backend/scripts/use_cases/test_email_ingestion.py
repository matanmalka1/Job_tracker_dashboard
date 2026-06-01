import pytest

from use_cases.helpers import make_email_data


@pytest.mark.asyncio
class TestEmailReferenceRepository:
    async def test_create_and_retrieve(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository

        repo = EmailReferenceRepository(db_session)
        record, created = await repo.create_from_raw_message(make_email_data("r1"))
        await db_session.commit()
        assert created is True
        assert record.gmail_message_id == "msg-r1"

    async def test_duplicate_not_inserted(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository

        repo = EmailReferenceRepository(db_session)
        await repo.create_from_raw_message(make_email_data("dup"))
        await db_session.commit()
        _, created = await repo.create_from_raw_message(make_email_data("dup"))
        assert created is False

    async def test_bulk_create_skips_duplicates(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository

        repo = EmailReferenceRepository(db_session)
        inserted, skipped = await repo.bulk_create([make_email_data("b1"), make_email_data("b2")])
        await db_session.commit()
        assert inserted == 2
        assert skipped == 0

        inserted2, skipped2 = await repo.bulk_create([make_email_data("b1"), make_email_data("b3")])
        await db_session.commit()
        assert inserted2 == 1
        assert skipped2 == 1

    async def test_list_paginated(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository

        repo = EmailReferenceRepository(db_session)
        for i in range(5):
            await repo.create_from_raw_message(make_email_data(f"p{i}"))
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
        await repo.create_from_raw_message(make_email_data("api1"))
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
            await repo.create_from_raw_message(make_email_data(f"pg{i}"))
        await db_session.commit()

        response = await client.get("/job-tracker/emails?limit=2&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert len(data["items"]) == 2

    async def test_scan_without_config_returns_error_or_runs(self, client):
        """Scan endpoint responds: 503/502 if Gmail is not configured, 202 if it succeeds."""
        response = await client.post("/job-tracker/scan")
        assert response.status_code in (503, 502, 202)


@pytest.mark.asyncio
class TestBulkInsertIdempotency:
    async def test_duplicate_ids_in_same_batch_deduplicated(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository

        repo = EmailReferenceRepository(db_session)
        dup_item = make_email_data("dup-batch")
        inserted, skipped = await repo.bulk_create([dup_item, dup_item, dup_item])
        await db_session.commit()
        assert inserted == 1
        assert skipped == 0

    async def test_second_scan_is_idempotent(self, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository

        repo = EmailReferenceRepository(db_session)
        item = make_email_data("idempotent-1")
        await repo.bulk_create([item])
        await db_session.commit()

        inserted2, skipped2 = await repo.bulk_create([item])
        await db_session.commit()
        assert inserted2 == 0
        assert skipped2 == 1
