# Job Dashboard

Personal job application tracker. The backend scans Gmail for job-related emails, stores application and email records in PostgreSQL, and exposes a REST + SSE API. The frontend is a React dashboard for pipeline, application, company, interview, and scan views.

## Project Layout

```text
job_dashboard/
  backend/    FastAPI + SQLAlchemy async + Alembic
  frontend/   React + Vite + TypeScript + Tailwind
  docs/       Development, database, and deployment notes
```

## Quick Start

Backend:

```bash
cd backend
python3.11 -m venv .venv
./.venv/bin/pip install -r requirements-dev.txt
createdb job_dashboard
./.venv/bin/alembic upgrade head
./.venv/bin/uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. API docs are at `http://localhost:8000/docs`.

## Source Of Truth

- [Development](docs/development.md)
- [Database and migrations](docs/database.md)
- [Deployment](docs/deployment.md)
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)

## Key Decisions

- Do not run Alembic migrations inside FastAPI startup or lifespan.
- Run migrations as an explicit dev/deploy step before `uvicorn`.
- Keep `app/main.py` free of migration calls.
- Keep `app/db.py` limited to DB primitives: `Base`, `engine`, session helpers, `get_session`, and small DB utilities.
- Do not use `Base.metadata.create_all()` for application startup schema management.
