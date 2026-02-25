# Job Dashboard API

FastAPI service that tracks job application emails. It scans a Gmail inbox for recent messages that look like application updates, stores references in a database, and exposes endpoints to list and rescan those emails.

## Features
- Async FastAPI app with startup DB initialization
- Gmail service account client with optional delegated user
- Keyword-based email scan to find application-related messages
- Paginated list endpoint for stored email references
- SQLite by default; works with other SQLAlchemy-compatible databases

## Tech Stack
- Python 3.11
- FastAPI + Uvicorn
- SQLAlchemy (async) + SQLite
- Google API Python Client
- Pydantic Settings for configuration

## Project Structure
- `app/main.py` — FastAPI application entry point
- `app/db.py` — async engine/session setup and DB init
- `app/config.py` — environment-based settings
- `app/job_tracker/` — domain logic (models, repos, services, API routes)
- `job_dashboard.db` — default SQLite database (auto-created)

## Setup
1) Create a virtualenv (or reuse the existing `.venv`):
```bash
python3.11 -m venv .venv
source .venv/bin/activate
```
2) Install dependencies:
```bash
pip install -r requirements.txt
```
3) Create a `.env` file (see variables below). The defaults work for local SQLite.

## Configuration (.env)
| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite+aiosqlite:///./job_dashboard.db` | SQLAlchemy URL. Use Postgres, etc., by changing this. |
| `GMAIL_SERVICE_ACCOUNT_FILE` | _required for scanning_ | Path to a Google service account JSON key with Gmail API enabled. |
| `GMAIL_DELEGATED_USER` | `None` | Optional user to impersonate (domain-wide delegation). If unset, uses `me`. |
| `GMAIL_QUERY_WINDOW_DAYS` | `30` | How many days back to search for emails. |
| `PAGINATION_LIMIT_DEFAULT` | `50` | Default page size for listing emails. |
| `PAGINATION_OFFSET_DEFAULT` | `0` | Default offset for listing emails. |

## Running the API
```bash
uvicorn app.main:app --reload
```
The app will create tables automatically on startup when using SQLite. For other databases, ensure the target DB exists and credentials are valid.

## API Endpoints
- `GET /job-tracker/emails?limit=&offset=` — returns `{ total, items: [...] }` sorted by `received_at` desc.
- `POST /job-tracker/scan` — triggers a Gmail scan; response `{ "inserted": <count> }` with `202 Accepted`.

### Sample cURL
List emails:
```bash
curl 'http://localhost:8000/job-tracker/emails?limit=20&offset=0'
```
Trigger a scan (requires Gmail config in `.env`):
```bash
curl -X POST http://localhost:8000/job-tracker/scan
```

## Gmail Setup Notes
- Enable the Gmail API for your GCP project.
- Create a service account and download its JSON key; set `GMAIL_SERVICE_ACCOUNT_FILE` to that path.
- If using a Workspace account, enable domain-wide delegation and set `GMAIL_DELEGATED_USER` to the mailbox to scan.
- The scanner filters messages from the last `GMAIL_QUERY_WINDOW_DAYS` days and matches simple keywords (see `app/job_tracker/services/email_scan_service.py`).

## Development Tips
- Auth is optional: if an `app.auth.get_current_user` dependency exists, it will be used; otherwise routes are open.
- `init_db` runs at startup; models live in `app/job_tracker/models/`.
- No tests are included yet—add pytest and coverage if you expand functionality.

## Troubleshooting
- `RuntimeError: GMAIL_SERVICE_ACCOUNT_FILE is not configured` — set the env var to a valid JSON key.
- Gmail `HttpError` 403/401 — ensure API is enabled and delegation/scopes are correct.
- Cannot connect to DB — verify `DATABASE_URL`; for Postgres, create the DB first.
