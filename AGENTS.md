# Job Dashboard Agent Notes

Use this file for repo-specific guidance. The concise source-of-truth docs are:

- [Development](docs/development.md)
- [Database and migrations](docs/database.md)
- [Deployment](docs/deployment.md)
- [Backend](backend/README.md)
- [Frontend](frontend/README.md)

## Project Overview

Personal job application tracker:

```text
backend/   FastAPI + SQLAlchemy async + PostgreSQL + Alembic
frontend/  React 19 + Vite 7 + TypeScript + Tailwind CSS
```

The backend scans Gmail, stores email/application records, and exposes REST + SSE endpoints. The frontend renders dashboard, pipeline, applications, interviews, companies, and settings views.

## Commands

Backend:

```bash
cd backend
./.venv/bin/alembic upgrade head
./.venv/bin/uvicorn app.main:app --reload
./.venv/bin/pytest scripts/test_all.py -v
```

Frontend:

```bash
cd frontend
npm run dev
npm run typecheck
npm run build
```

Use the repo virtualenv for Python commands. Do not use global `python` / `python3`.

## Database Rules

- Do not run Alembic migrations inside FastAPI lifespan/startup.
- Run migrations before starting the backend: `./.venv/bin/alembic upgrade head`.
- Keep `app/main.py` free from migration calls.
- Keep `app/db.py` limited to DB primitives: `Base`, engine/session helpers, `get_session`, and small DB utilities.
- Do not use `Base.metadata.create_all()` or compatibility schema hacks in app startup.
- Tests may use isolated SQLite fixtures.

## Backend Shape

```text
Router -> Service -> Repository -> ORM model
```

Key paths:

```text
backend/app/main.py
backend/app/config.py
backend/app/db.py
backend/app/job_tracker/api/routes/
backend/app/job_tracker/models/
backend/app/job_tracker/repositories/
backend/app/job_tracker/schemas/
backend/app/job_tracker/services/
backend/migrations/
```

## Frontend Shape

```text
frontend/src/app/       routes and providers
frontend/src/api/       axios client and API functions
frontend/src/features/  feature-owned pages, hooks, components
frontend/src/shared/    layout, UI, constants, types, utils
```

Frontend API calls are relative. Vite proxies `/job-tracker/*` and `/health` to the backend during local development.

## Code Style

- Frontend components use arrow functions.
- Use `import type` for type-only imports.
- Use `axios`, not `fetch`, for frontend API calls.
- Use `lucide-react` icons, not inline SVGs.
- Use `sonner` toasts, not `alert()`.
