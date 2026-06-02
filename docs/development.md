# Development

## Requirements

- Python 3.11
- PostgreSQL
- Node.js compatible with Vite 7
- npm

Use the repo virtualenv for backend commands. Do not use global `python` / `python3` for this project.

## Backend Setup

```bash
cd backend
python3.11 -m venv .venv
./.venv/bin/pip install -r requirements-dev.txt
```

Create `backend/.env`:

```env
APP_ENV=development
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/job_dashboard
GMAIL_TOKEN_FILE=secrets/token.json
```

Create the local database:

```bash
createdb job_dashboard
```

Run migrations before starting the API:

```bash
./.venv/bin/alembic upgrade head
./.venv/bin/uvicorn app.main:app --reload
```

API docs: `http://localhost:8000/docs`

If using an alternate env file:

```bash
APP_ENV=development ENV_FILE=.env.development ./.venv/bin/uvicorn app.main:app --reload
```

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173`.

The frontend axios client uses relative URLs. In development, Vite proxies `/job-tracker/*` and `/health` to `http://localhost:8000`. Override the proxy target when needed:

```bash
VITE_API_PROXY_TARGET=http://localhost:8001 npm run dev
```

If `JOB_TRACKER_API_KEY` is configured on the backend, set the matching frontend env var so requests include `X-Api-Key`:

```env
VITE_JOB_TRACKER_API_KEY=...
```

## Tests

Backend tests:

```bash
cd backend
./.venv/bin/pytest scripts/test_all.py -v
```

The test suite uses in-memory SQLite through test fixtures. Application runtime uses PostgreSQL.

Frontend checks:

```bash
cd frontend
npm run typecheck
npm run build
```

## Gmail Token

Generate an OAuth token once:

```bash
cd backend
./.venv/bin/python scripts/generate_token.py
```

Set `GMAIL_TOKEN_FILE` to the generated token path. Gmail credentials and tokens stay outside normal source control.
