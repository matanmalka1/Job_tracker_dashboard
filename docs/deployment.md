# Deployment

## Render

`render.yaml` defines one Python web service rooted at `backend/` and one managed PostgreSQL database.

Build command:

```bash
pip install -r requirements.txt &&
cd ../frontend && npm ci && npm run build
```

Start command:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

The migration step must happen before `uvicorn` starts. Do not move migration execution into FastAPI startup/lifespan.

## Environment

Required production variables:

```env
APP_ENV=production
DATABASE_URL=<Render Postgres connection string>
CORS_ORIGINS=["https://<frontend-or-service-host>"]
```

Optional API guard:

```env
JOB_TRACKER_API_KEY=...
VITE_JOB_TRACKER_API_KEY=...
```

`VITE_JOB_TRACKER_API_KEY` is compiled into the frontend build. Set it in the frontend build environment if the backend requires `JOB_TRACKER_API_KEY`.

## Gmail Token On Render

Generate `backend/secrets/token.json` locally, then base64 encode it:

```bash
base64 -i backend/secrets/token.json | tr -d '\n'
```

Set:

```env
GMAIL_TOKEN_JSON=<base64 token>
GMAIL_TOKEN_FILE=/tmp/gmail_token.json
```

At startup, `app/main.py` writes `GMAIL_TOKEN_JSON` to `GMAIL_TOKEN_FILE` if the file does not already exist. This is a lightweight token bootstrap, not a database migration.

## Startup Imports

Avoid long blocking imports or data loads on every production restart unless that behavior is explicitly intended. If a startup command imports seed, question, or fixture data, document that it is one-time or intentional recurring work and keep it separate from normal `uvicorn` startup where possible.

## Static Frontend

When `frontend/dist` exists, the backend mounts `/assets` and serves the React `index.html` fallback for non-API GET routes. API routes are registered before the fallback.
