# Database

## Runtime Database

Runtime database access is configured by `backend/app/config.py` and `backend/app/db.py`.

- `DATABASE_URL` defaults to `postgresql+asyncpg://postgres:postgres@localhost:5432/job_dashboard`.
- `postgres://` and `postgresql://` URLs are normalized to `postgresql+asyncpg://` for SQLAlchemy async runtime.
- Production rejects SQLite database URLs.

`app/db.py` exposes DB primitives only:

- `Base`
- async `engine`
- `AsyncSessionLocal`
- `get_session`
- `utcnow`

Do not add startup schema creation or migration compatibility hacks to `app/db.py`.

## Migrations

Alembic owns application schema changes.

```bash
cd backend
./.venv/bin/alembic upgrade head
./.venv/bin/alembic current
./.venv/bin/alembic history
```

Create a migration after model changes:

```bash
cd backend
./.venv/bin/alembic revision --autogenerate -m "describe change"
```

Review generated migrations before committing them.

## Startup Rule

Do not run migrations inside FastAPI lifespan/startup. `app/main.py` should stay limited to app construction, middleware, routers, static frontend mounting, Gmail token bootstrapping, and shutdown cleanup.

Correct local order:

```bash
cd backend
./.venv/bin/alembic upgrade head
./.venv/bin/uvicorn app.main:app --reload
```

Correct deploy order:

```bash
cd backend
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
```

Do not use `Base.metadata.create_all()` for runtime schema management. Tests may use `create_all()` inside isolated test fixtures.

## Current Models

- `JobApplication`: company, role, status, source, dates, confidence, notes, URL, email relationship, timestamps.
- `EmailReference`: Gmail message/thread IDs, subject, sender, received time, snippet/body, optional application link.
- `ScanRun`: scan timing, status, fetched/inserted/created counts, error text.

Application statuses are:

```text
applied, interviewing, offer, rejected
```
