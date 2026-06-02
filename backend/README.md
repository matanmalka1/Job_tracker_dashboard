# Backend

FastAPI service for job application records, Gmail scanning, and scan progress streaming.

## Setup

Use the repo virtualenv:

```bash
cd backend
python3.11 -m venv .venv
./.venv/bin/pip install -r requirements-dev.txt
createdb job_dashboard
./.venv/bin/alembic upgrade head
./.venv/bin/uvicorn app.main:app --reload
```

Do not run migrations in FastAPI startup. See [database docs](../docs/database.md).

## Stack

- Python 3.11
- FastAPI + Uvicorn
- SQLAlchemy 2.0 async ORM + asyncpg
- Alembic migrations
- Pydantic Settings
- Google API Python Client for Gmail OAuth

## Structure

```text
app/main.py                         FastAPI factory, middleware, routers, static frontend mount
app/config.py                       env-backed settings
app/db.py                           Base, engine, session helpers, get_session
app/health.py                       /health
app/job_tracker/api/router.py       /job-tracker router assembly
app/job_tracker/api/routes/         route modules by use case
app/job_tracker/models/             SQLAlchemy ORM models
app/job_tracker/repositories/       DB access layer
app/job_tracker/schemas/            Pydantic schemas
app/job_tracker/services/           application service and Gmail scan flow
migrations/                         Alembic environment and versions
scripts/test_all.py                 main backend test suite
scripts/generate_token.py           Gmail OAuth token generator
```

Layer pattern:

```text
Router -> Service -> Repository -> ORM model
```

## Configuration

Defined in `app/config.py`.

| Variable | Default | Description |
|---|---:|---|
| `APP_ENV` | `development` | Runtime environment |
| `DATABASE_URL` | local PostgreSQL URL | SQLAlchemy async URL |
| `GMAIL_TOKEN_FILE` | unset | OAuth token JSON path |
| `GMAIL_DELEGATED_USER` | unset | Mailbox to scan; unset uses `me` |
| `GMAIL_QUERY_WINDOW_DAYS` | `30` | Gmail search window |
| `GMAIL_MAX_MESSAGES` | `200` | Max messages per scan |
| `GMAIL_LIST_PAGE_SIZE` | `50` | Gmail list page size |
| `GMAIL_BATCH_SIZE` | `100` | Gmail batch-get size |
| `GMAIL_RETRY_BACKOFF_SECONDS` | `2` | Gmail 429 retry backoff |
| `SCAN_RATE_LIMIT_SECONDS` | `10` | Minimum gap between scans |
| `SCAN_EXECUTOR_MAX_WORKERS` | `4` | Gmail I/O worker threads |
| `SSE_KEEPALIVE_TIMEOUT` | `60` | SSE keepalive interval |
| `SCAN_HISTORY_LIMIT` | `10` | Rows returned by scan history |
| `PAGINATION_LIMIT_DEFAULT` | `50` | Default page size |
| `PAGINATION_OFFSET_DEFAULT` | `0` | Default offset |
| `BULK_DELETE_MAX_IDS` | `100` | Max IDs in bulk delete |
| `ERROR_TRUNCATE_LENGTH` | `2000` | Stored scan error length |
| `JOB_TRACKER_API_KEY` | unset | Optional `X-Api-Key` guard for `/job-tracker` |
| `CORS_ORIGINS` | localhost origins | JSON list of allowed origins |

`ENV_FILE` can point settings at a non-default env file. Production ignores `.env` unless `ENV_FILE` is explicitly set.

## API

```
GET    /health                                      → {status, db}

GET    /job-tracker/applications/pipeline           → applications grouped by status
GET    /job-tracker/applications                    → paginated list (limit, offset, status, search, sort)
POST   /job-tracker/applications                    → create
GET    /job-tracker/applications/:id                → single
PATCH  /job-tracker/applications/:id                → update
DELETE /job-tracker/applications/:id                → delete (single)
DELETE /job-tracker/applications                    → bulk delete (?ids=1&ids=2…)
POST   /job-tracker/applications/:id/emails/:eid    → link email
DELETE /job-tracker/applications/:id/emails/:eid    → unlink email

GET    /job-tracker/companies/summary               → paginated company summaries
GET    /job-tracker/emails                          → paginated list
GET    /job-tracker/stats                           → {total, by_status, reply_rate}

POST   /job-tracker/scan/token                      → short-lived SSE token when API key is enabled
GET    /job-tracker/scan/progress                   → SSE stream
POST   /job-tracker/scan                            → trigger scan (202)
GET    /job-tracker/scan/history                    → last N ScanRun records
```

### SSE Scan Events (`/scan/progress`)

```json
{"stage": "fetching",  "detail": "…"}
{"stage": "filtering", "detail": "…"}
{"stage": "saving",    "detail": "…"}
{"stage": "matching",  "detail": "…"}
{"stage": "creating",  "detail": "…"}
{"stage": "result",    "inserted": N, "applications_created": M}
{"stage": "error",     "detail": "error message"}
```

Keepalive comments (`: keepalive\n\n`) arrive as empty-string `data` — filter client-side.

## Gmail Setup

```bash
cd backend
./.venv/bin/python scripts/generate_token.py
```

Set `GMAIL_TOKEN_FILE=secrets/token.json`. On Render, set `GMAIL_TOKEN_JSON` to the base64-encoded token and `GMAIL_TOKEN_FILE=/tmp/gmail_token.json`.

## Tests

```bash
./.venv/bin/pytest scripts/test_all.py -v
```

- Uses in-memory SQLite fixtures.
- No Gmail credentials are needed for mocked scan tests.

## Troubleshooting

| Error | Fix |
|---|---|
| `RuntimeError: GMAIL_TOKEN_FILE … does not exist` | Run `scripts/generate_token.py` |
| Gmail `HttpError` 403/401 | Check API is enabled and scopes match |
| `asyncpg … password authentication failed` | Verify `DATABASE_URL` credentials |
| `database "job_dashboard" does not exist` | Run `CREATE DATABASE job_dashboard;` in psql |
