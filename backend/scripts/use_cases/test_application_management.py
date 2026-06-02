import pytest

from use_cases.helpers import make_email_data


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

    async def test_update_can_clear_nullable_field(self, db_session):
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        app = await repo.create({
            "company_name": "Acme",
            "role_title": "Engineer",
            "source": "LinkedIn",
        })
        await db_session.commit()

        updated = await repo.update(app.id, {"source": None})
        await db_session.commit()
        assert updated is not None
        assert updated.source is None

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
        from app.job_tracker.models.job_application import ApplicationStatus
        from app.job_tracker.repositories.job_application_repository import JobApplicationRepository

        repo = JobApplicationRepository(db_session)
        await repo.create({"company_name": "A", "role_title": "R", "status": ApplicationStatus.NEW})
        await repo.create({"company_name": "B", "role_title": "R", "status": ApplicationStatus.APPLIED})
        await db_session.commit()

        items, total = await repo.list_paginated(limit=10, offset=0, status=ApplicationStatus.APPLIED)
        assert total == 1
        assert items[0].company_name == "B"


@pytest.mark.asyncio
class TestApplicationsEndpoint:
    async def test_create_application_default_status_is_applied(self, client):
        response = await client.post(
            "/job-tracker/applications",
            json={"company_name": "Acme", "role_title": "Engineer"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["company_name"] == "Acme"
        assert data["status"] == "applied"
        assert "id" in data

    async def test_create_application_explicit_status(self, client):
        response = await client.post(
            "/job-tracker/applications",
            json={"company_name": "Acme", "role_title": "Engineer", "status": "new"},
        )
        assert response.status_code == 201
        assert response.json()["status"] == "new"

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
            json={"status": "interviewing"},
        )
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == "interviewing"

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
        email_record, _ = await repo.create_from_raw_message(make_email_data("assign1"))
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


@pytest.mark.asyncio
class TestUnassignEmailEndpoint:
    async def test_unassign_email(self, client, db_session):
        from app.job_tracker.repositories.email_reference_repository import EmailReferenceRepository

        repo = EmailReferenceRepository(db_session)
        email_rec, _ = await repo.create_from_raw_message(make_email_data("unassign1"))
        await db_session.commit()

        create_resp = await client.post(
            "/job-tracker/applications",
            json={"company_name": "UnassignCo", "role_title": "Dev"},
        )
        app_id = create_resp.json()["id"]

        assign_resp = await client.post(f"/job-tracker/applications/{app_id}/emails/{email_rec.id}")
        assert assign_resp.status_code == 200

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

    async def test_filter_by_exact_company_name(self, client):
        await client.post("/job-tracker/applications", json={"company_name": "Acme", "role_title": "Dev"})
        await client.post("/job-tracker/applications", json={"company_name": "Acme Labs", "role_title": "Dev"})

        response = await client.get("/job-tracker/applications?company_name=Acme")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["company_name"] == "Acme"

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
class TestPipelineEndpoint:
    async def test_pipeline_empty(self, client):
        response = await client.get("/job-tracker/applications/pipeline")
        assert response.status_code == 200
        data = response.json()
        assert "columns" in data
        assert "total" in data
        assert data["total"] == 0
        statuses = [col["status"] for col in data["columns"]]
        for status in ("new", "applied", "interviewing", "offer", "rejected", "hired"):
            assert status in statuses

    async def test_pipeline_groups_by_status(self, client):
        await client.post("/job-tracker/applications", json={"company_name": "A", "status": "applied"})
        await client.post("/job-tracker/applications", json={"company_name": "B", "status": "applied"})
        await client.post("/job-tracker/applications", json={"company_name": "C", "status": "interviewing"})

        response = await client.get("/job-tracker/applications/pipeline")
        assert response.status_code == 200
        data = response.json()

        col_map = {col["status"]: col for col in data["columns"]}
        assert col_map["applied"]["total"] == 2
        assert len(col_map["applied"]["items"]) == 2
        assert col_map["interviewing"]["total"] == 1
        assert data["total"] == 3

    async def test_pipeline_card_has_required_fields(self, client):
        await client.post("/job-tracker/applications", json={
            "company_name": "CardCo",
            "role_title": "Dev",
            "status": "new",
        })

        response = await client.get("/job-tracker/applications/pipeline")
        assert response.status_code == 200
        data = response.json()
        col_map = {col["status"]: col for col in data["columns"]}
        card = col_map["new"]["items"][0]
        assert "id" in card
        assert "company_name" in card
        assert "status" in card
        assert "email_count" in card
        assert "notes" not in card
        assert "job_url" not in card


@pytest.mark.asyncio
class TestCompaniesSummaryEndpoint:
    async def test_companies_summary_empty(self, client):
        response = await client.get("/job-tracker/companies/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []

    async def test_companies_summary_groups_correctly(self, client):
        await client.post("/job-tracker/applications", json={"company_name": "Acme", "status": "applied"})
        await client.post("/job-tracker/applications", json={"company_name": "Acme", "status": "interviewing"})
        await client.post("/job-tracker/applications", json={"company_name": "Beta", "status": "new"})

        response = await client.get("/job-tracker/companies/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2

        company_map = {item["company_name"]: item for item in data["items"]}
        assert "Acme" in company_map
        assert company_map["Acme"]["application_count"] == 2
        assert company_map["Acme"]["status_counts"]["applied"] == 1
        assert company_map["Acme"]["status_counts"]["interviewing"] == 1
        assert company_map["Beta"]["application_count"] == 1

    async def test_companies_summary_search(self, client):
        await client.post("/job-tracker/applications", json={"company_name": "SearchCo"})
        await client.post("/job-tracker/applications", json={"company_name": "OtherCo"})

        response = await client.get("/job-tracker/companies/summary?search=Search")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["company_name"] == "SearchCo"

    async def test_companies_summary_pagination(self, client):
        for i in range(5):
            await client.post("/job-tracker/applications", json={"company_name": f"Company{i}"})

        response = await client.get("/job-tracker/companies/summary?limit=2&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert len(data["items"]) == 2

    async def test_companies_summary_required_fields(self, client):
        await client.post("/job-tracker/applications", json={"company_name": "FieldCo", "status": "new"})

        response = await client.get("/job-tracker/companies/summary")
        assert response.status_code == 200
        item = response.json()["items"][0]
        assert "company_name" in item
        assert "application_count" in item
        assert "latest_activity" in item
        assert "status_counts" in item


@pytest.mark.asyncio
class TestExtendedSearchAndSort:
    async def test_search_by_source(self, client):
        await client.post("/job-tracker/applications", json={
            "company_name": "Any", "role_title": "Dev", "source": "linkedin"
        })
        await client.post("/job-tracker/applications", json={
            "company_name": "Other", "role_title": "Dev", "source": "referral"
        })

        response = await client.get("/job-tracker/applications?search=linkedin")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["source"] == "linkedin"

    async def test_sort_by_created_at(self, client):
        await client.post("/job-tracker/applications", json={"company_name": "First", "role_title": "Dev"})
        await client.post("/job-tracker/applications", json={"company_name": "Second", "role_title": "Dev"})

        response = await client.get("/job-tracker/applications?sort=created_at")
        assert response.status_code == 200
        data = response.json()
        assert data["items"][0]["company_name"] == "Second"

    async def test_sort_by_status(self, client):
        await client.post("/job-tracker/applications", json={"company_name": "Z", "status": "new"})
        await client.post("/job-tracker/applications", json={"company_name": "A", "status": "applied"})

        response = await client.get("/job-tracker/applications?sort=status")
        assert response.status_code == 200
        data = response.json()
        statuses = [item["status"] for item in data["items"]]
        assert statuses == sorted(statuses)

    async def test_invalid_sort_rejected(self, client):
        response = await client.get("/job-tracker/applications?sort=hacker_field")
        assert response.status_code == 422

    async def test_pagination_total_matches_filter(self, client):
        for i in range(10):
            await client.post("/job-tracker/applications", json={
                "company_name": f"PagCo{i}", "status": "applied"
            })
        await client.post("/job-tracker/applications", json={"company_name": "NewCo", "status": "new"})

        response = await client.get("/job-tracker/applications?status=applied&limit=3&offset=0")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 10
        assert len(data["items"]) == 3

    async def test_empty_result_pagination(self, client):
        response = await client.get("/job-tracker/applications?search=NoSuchCompanyXYZ123")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []
