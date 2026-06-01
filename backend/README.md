# Job Dashboard — Backend

FastAPI service that scans Gmail for job application emails, stores them in PostgreSQL, and exposes a REST + SSE API for the frontend dashboard.

## Stack

- **Python 3.11**
- **FastAPI** + Uvicorn (async, lifespan-managed)
- **SQLAlchemy 2.0** async ORM + **asyncpg** (PostgreSQL)
- **Google API Python Client** — Gmail OAuth 2.0
- **Pydantic Settings** — all config via env / `.env`

## Layer Pattern

```
Router (api/router.py)
  └─ Service (services/)
       └─ Repository (repositories/)
            └─ ORM Model (models/)
```

## Setup

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` (copy the table below). Then start PostgreSQL and create the database:

```bash
psql -U postgres -c "CREATE DATABASE job_dashboard;"
uvicorn app.main:app --reload   # tables auto-created on first start
```

## Configuration (`.env`)

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/job_dashboard` | SQLAlchemy async URL |
| `GMAIL_TOKEN_FILE` | — | Path to `token.json` (OAuth user token) |
| `GMAIL_DELEGATED_USER` | `None` | Mailbox to scan; defaults to `"me"` |
| `GMAIL_QUERY_WINDOW_DAYS` | `30` | Days back to search Gmail |
| `GMAIL_MAX_MESSAGES` | `200` | Max messages fetched per scan |
| `GMAIL_LIST_PAGE_SIZE` | `50` | Gmail API page size |
| `GMAIL_BATCH_SIZE` | `100` | Messages per Gmail batch-get request |
| `GMAIL_RETRY_BACKOFF_SECONDS` | `2` | Backoff before retrying 429-throttled messages |
| `SCAN_RATE_LIMIT_SECONDS` | `10` | Minimum gap between scans |
| `SCAN_EXECUTOR_MAX_WORKERS` | `4` | Thread-pool workers for Gmail I/O |
| `SSE_KEEPALIVE_TIMEOUT` | `60` | Seconds before SSE keepalive is sent |
| `SCAN_HISTORY_LIMIT` | `10` | Rows returned by `/scan/history` |
| `PAGINATION_LIMIT_DEFAULT` | `50` | Default page size |
| `PAGINATION_OFFSET_DEFAULT` | `0` | Default offset |
| `BULK_DELETE_MAX_IDS` | `100` | Max IDs for bulk-delete |
| `SEARCH_MAX_LENGTH` | `200` | Max chars for `?search=` |
| `ERROR_TRUNCATE_LENGTH` | `2000` | Max chars stored in `scan_run.error` |
| `CORS_ORIGINS` | localhost:5173/3000 | JSON list of allowed origins |

## Gmail Setup

1. Enable the **Gmail API** in Google Cloud Console.
2. Create an **OAuth 2.0 Client ID** (Desktop app), download the JSON, save it as `secrets/client_secret.json`.
3. Run the token generator once to get `secrets/token.json`:
   ```bash
   python scripts/generate_token.py
   ```
4. Set `GMAIL_TOKEN_FILE=secrets/token.json` in `.env`.

The token is refreshed automatically. On Render, base64-encode `token.json` and set it as `GMAIL_TOKEN_JSON` (the app writes it to disk at startup).

## API Endpoints

```
GET    /health                                      → {status, db}

GET    /job-tracker/applications                    → paginated list (limit, offset, status, search, sort)
POST   /job-tracker/applications                    → create
GET    /job-tracker/applications/:id                → single
PATCH  /job-tracker/applications/:id                → update
DELETE /job-tracker/applications/:id                → delete (single)
DELETE /job-tracker/applications                    → bulk delete (?ids=1&ids=2…)
POST   /job-tracker/applications/:id/emails/:eid    → link email
DELETE /job-tracker/applications/:id/emails/:eid    → unlink email

GET    /job-tracker/emails                          → paginated list
GET    /job-tracker/stats                           → {total, by_status, reply_rate}

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

## Running Tests

```bash
pytest scripts/test_all.py -v
```

- Uses **in-memory SQLite** (no Postgres needed for tests)
- 72 tests across ~15 test classes
- No Gmail credentials needed — scan tests mock the client

## Troubleshooting

| Error | Fix |
|---|---|
| `RuntimeError: GMAIL_TOKEN_FILE … does not exist` | Run `scripts/generate_token.py` |
| Gmail `HttpError` 403/401 | Check API is enabled and scopes match |
| `asyncpg … password authentication failed` | Verify `DATABASE_URL` credentials |
| `database "job_dashboard" does not exist` | Run `CREATE DATABASE job_dashboard;` in psql |
