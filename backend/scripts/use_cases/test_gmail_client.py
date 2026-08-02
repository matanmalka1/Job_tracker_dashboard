"""Tests for GmailClient: pagination, batch-get/429-retry, and credential handling.

These mock the googleapiclient service object entirely — no real network I/O.
"""
from unittest.mock import MagicMock

import pytest
from google.auth.exceptions import RefreshError
from google.oauth2.credentials import Credentials
from googleapiclient.errors import HttpError

from app.job_tracker.email_scanner.gmail_client import GmailClient


def _make_client(
    *,
    token_file: str | None = None,
    delegated_user: str | None = None,
    query_window_days: int = 30,
    max_messages: int = 200,
    page_size: int = 50,
    batch_size: int = 10,
    retry_backoff_seconds: int = 0,
) -> GmailClient:
    return GmailClient(
        token_file=token_file,
        delegated_user=delegated_user,
        query_window_days=query_window_days,
        max_messages=max_messages,
        page_size=page_size,
        batch_size=batch_size,
        retry_backoff_seconds=retry_backoff_seconds,
    )


def _make_http_error(status: int) -> HttpError:
    resp = MagicMock()
    resp.status = status
    return HttpError(resp, b"error body")


class FakeBatch:
    """Mimics googleapiclient's BatchHttpRequest for controlled callback testing."""

    def __init__(self, callback, outcome_fn):
        self._callback = callback
        self._outcome_fn = outcome_fn
        self._request_ids: list[str] = []

    def add(self, request, request_id):
        self._request_ids.append(request_id)

    def execute(self):
        for request_id in self._request_ids:
            response, exception = self._outcome_fn(request_id)
            self._callback(request_id, response, exception)


def _make_service(outcome_fn) -> MagicMock:
    service = MagicMock()
    service.new_batch_http_request.side_effect = lambda callback: FakeBatch(callback, outcome_fn)
    service.users.return_value.messages.return_value.get.return_value = MagicMock()
    return service


class TestFetchMessageDetailsBatchingAndRetry:
    def test_batches_respect_batch_size(self):
        client = _make_client(batch_size=2)
        created_batches: list[FakeBatch] = []

        def outcome_fn(request_id):
            return {"id": request_id, "snippet": "hi", "payload": {}}, None

        service = _make_service(outcome_fn)
        service.new_batch_http_request.side_effect = (
            lambda callback: created_batches.append(FakeBatch(callback, outcome_fn)) or created_batches[-1]
        )

        message_ids = ["a", "b", "c", "d", "e"]
        results = client._fetch_message_details(service, message_ids)

        assert [r["gmail_message_id"] for r in results] == message_ids
        assert len(created_batches) == 3  # ceil(5 / 2)

    def test_429_errors_are_retried_once_and_succeed(self):
        client = _make_client()
        attempt_counts: dict[str, int] = {}

        def outcome_fn(request_id):
            attempt_counts[request_id] = attempt_counts.get(request_id, 0) + 1
            if request_id == "throttled" and attempt_counts[request_id] == 1:
                return None, _make_http_error(429)
            return {"id": request_id, "snippet": "ok", "payload": {}}, None

        service = _make_service(outcome_fn)
        results = client._fetch_message_details(service, ["ok1", "throttled"])

        assert {r["gmail_message_id"] for r in results} == {"ok1", "throttled"}
        assert attempt_counts["throttled"] == 2

    def test_non_429_and_permanent_failures_are_dropped_not_raised(self):
        client = _make_client()

        def outcome_fn(request_id):
            if request_id == "bad":
                return None, RuntimeError("boom")
            return {"id": request_id, "snippet": "ok", "payload": {}}, None

        service = _make_service(outcome_fn)
        results = client._fetch_message_details(service, ["good", "bad"])

        assert [r["gmail_message_id"] for r in results] == ["good"]


class TestFetchRecentMessagesPagination:
    def test_pages_until_max_messages_reached(self, monkeypatch):
        client = _make_client(max_messages=5, page_size=2)

        pages = [
            {"messages": [{"id": "1"}, {"id": "2"}], "nextPageToken": "p2"},
            {"messages": [{"id": "3"}, {"id": "4"}], "nextPageToken": "p3"},
            {"messages": [{"id": "5"}], "nextPageToken": None},
        ]
        call_index = {"n": 0}

        def execute_side_effect():
            page = pages[call_index["n"]]
            call_index["n"] += 1
            return page

        list_mock = MagicMock()
        list_mock.return_value.execute.side_effect = execute_side_effect

        service = MagicMock()
        service.users.return_value.messages.return_value.list = list_mock

        monkeypatch.setattr(client, "_get_service", lambda: service)
        monkeypatch.setattr(
            client, "_fetch_message_details", lambda svc, ids: [{"gmail_message_id": i} for i in ids]
        )

        results = client.fetch_recent_messages()

        assert len(results) == 5
        assert call_index["n"] == 3
        # Last page should only have requested the remaining budget (5 - 4 = 1)
        assert list_mock.call_args_list[2].kwargs["maxResults"] == 1

    def test_stops_early_when_no_next_page_token(self, monkeypatch):
        client = _make_client(max_messages=200, page_size=50)

        list_mock = MagicMock()
        list_mock.return_value.execute.return_value = {"messages": [{"id": "1"}], "nextPageToken": None}

        service = MagicMock()
        service.users.return_value.messages.return_value.list = list_mock

        monkeypatch.setattr(client, "_get_service", lambda: service)
        monkeypatch.setattr(
            client, "_fetch_message_details", lambda svc, ids: [{"gmail_message_id": i} for i in ids]
        )

        results = client.fetch_recent_messages()

        assert len(results) == 1
        assert list_mock.call_count == 1  # no second page requested


class TestBuildCredentials:
    def test_no_token_file_configured_raises_runtime_error(self):
        client = _make_client(token_file=None)
        with pytest.raises(RuntimeError, match="GMAIL_TOKEN_FILE"):
            client._build_credentials()

    def test_missing_token_file_raises_runtime_error(self, tmp_path):
        client = _make_client(token_file=str(tmp_path / "nonexistent.json"))
        with pytest.raises(RuntimeError, match="GMAIL_TOKEN_FILE"):
            client._build_credentials()

    def test_refresh_error_raises_friendly_runtime_error(self, tmp_path, monkeypatch):
        token_file = tmp_path / "token.json"
        token_file.write_text("{}")

        fake_creds = MagicMock()
        fake_creds.expired = True
        fake_creds.refresh_token = "rt"
        fake_creds.refresh.side_effect = RefreshError("revoked")

        monkeypatch.setattr(Credentials, "from_authorized_user_file", lambda *a, **k: fake_creds)

        client = _make_client(token_file=str(token_file))
        with pytest.raises(RuntimeError, match="expired or was revoked"):
            client._build_credentials()

    def test_invalid_credentials_after_refresh_attempt_raises_runtime_error(self, tmp_path, monkeypatch):
        token_file = tmp_path / "token.json"
        token_file.write_text("{}")

        fake_creds = MagicMock()
        fake_creds.expired = False
        fake_creds.refresh_token = None
        fake_creds.valid = False

        monkeypatch.setattr(Credentials, "from_authorized_user_file", lambda *a, **k: fake_creds)

        client = _make_client(token_file=str(token_file))
        with pytest.raises(RuntimeError, match="invalid or expired"):
            client._build_credentials()

    def test_valid_credentials_are_returned_without_refresh(self, tmp_path, monkeypatch):
        token_file = tmp_path / "token.json"
        token_file.write_text("{}")

        fake_creds = MagicMock()
        fake_creds.expired = False
        fake_creds.valid = True

        monkeypatch.setattr(Credentials, "from_authorized_user_file", lambda *a, **k: fake_creds)

        client = _make_client(token_file=str(token_file))
        creds = client._build_credentials()

        assert creds is fake_creds
        fake_creds.refresh.assert_not_called()
