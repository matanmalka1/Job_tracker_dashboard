# Job Dashboard — CLAUDE.md

## Project Overview
A personal job application tracker that scans Gmail for application emails, auto-creates application records, and provides a dashboard for tracking progress through the hiring pipeline.

## Architecture
```
job_dashboard/
  backend/   FastAPI + SQLAlchemy 2.0 async + aiosqlite (SQLite)
  frontend/  React 19 + Vite 7 + TypeScript (strict) + Tailwind CSS 3
```

---

## Dev Commands

### Backend
```bash
cd backend
uvicorn app.main:app --reload        # dev server on :8000
pytest scripts/test_all.py -v        # run all 72 tests
```

### Frontend
```bash
cd frontend
npm run dev                          # Vite dev server on :5173 (proxied to :8000)
npm run build
```

---

## Backend

### Stack
- **FastAPI** — async routes, Pydantic v2 schemas
- **SQLAlchemy 2.0** async ORM, **aiosqlite** driver
- **Gmail API** via `google-auth` / `google-api-python-client`
- **SSE** (Server-Sent Events) for live scan progress streaming

### Layer Pattern
```
Router (api/router.py)
  └─ Service (services/)
       └─ Repository (repositories/)
            └─ ORM Model (models/)
```

Dependency injection via `FastAPI.Depends`. Session provided by `get_session()`.

### Key Files
| File | Purpose |
|------|---------|
| `app/main.py` | `create_app()` factory, CORS middleware, logging, lifespan |
| `app/job_tracker/api/router.py` | All HTTP + SSE endpoints |
| `app/job_tracker/models/` | SQLAlchemy ORM models |
| `app/job_tracker/schemas/` | Pydantic request/response schemas |
| `app/job_tracker/repositories/` | DB access layer (raw SQLAlchemy) |
| `app/job_tracker/services/email_scan_service.py` | Gmail scan + email parsing |
| `app/job_tracker/services/job_application_service.py` | Application CRUD + email linking |
| `scripts/test_all.py` | Full test suite (72 tests, in-memory SQLite) |

### Models
- `JobApplication` — `id, company_name, role_title, status, applied_at, last_email_at, notes, job_url, next_action_at`
- `EmailReference` — `id, gmail_message_id, subject, snippet, sender, received_at, application_id (FK)`
- `ScanRun` — `id, started_at, completed_at, status, emails_fetched, emails_inserted, apps_created, error`

### `ApplicationStatus` Enum
`new | applied | interviewing | offer | rejected | hired`

### API Endpoints
```
GET    /health                                      → {status, db}
GET    /job-tracker/applications                    → paginated list (limit, offset, status, search, sort)
POST   /job-tracker/applications                    → create
GET    /job-tracker/applications/:id                → single
PATCH  /job-tracker/applications/:id                → update
DELETE /job-tracker/applications/:id                → delete
POST   /job-tracker/applications/:id/emails/:eid    → link email to application
DELETE /job-tracker/applications/:id/emails/:eid    → unlink email
GET    /job-tracker/emails                          → paginated list
GET    /job-tracker/stats                           → {total, by_status, reply_rate}
GET    /job-tracker/scan/progress                   → SSE stream (scan progress events)
GET    /job-tracker/scan/history                    → last 10 ScanRun records
```

### SSE Scan Progress Events
Events sent as JSON on `GET /job-tracker/scan/progress`:
```json
{"stage": "fetching", "detail": "..."}
{"stage": "filtering", "detail": "..."}
{"stage": "saving", "detail": "..."}
{"stage": "matching", "detail": "..."}
{"stage": "creating", "detail": "..."}
{"stage": "result", "inserted": N, "applications_created": M}
{"stage": "error", "detail": "error message"}
```
Keepalive comments (`: keepalive\n\n`) are sent to prevent connection timeouts — filter these client-side (they arrive as empty-string `data`).

### Email Parsing (`email_scan_service.py`)
- Regex patterns match `subject` first, then `snippet` as fallback
- ATS platform domains (greenhouse, lever, workday, taleo, icims, etc.) are blocklisted from being used as company names — the sender domain is only used as a last resort
- Status inference: keywords like "offer" → OFFER, "unfortunately"/"regret" → REJECTED, default → APPLIED

### Transaction Boundaries
- `ScanRunRepository.create()` uses `flush()` only — the service owns the `commit()` so scan_run creation is part of the same transaction as email/app writes
- Always commit via the `_session` property on `JobApplicationService` (not directly from repos)

---

## Frontend

### Stack
- **React 19**, **TypeScript** strict (`verbatimModuleSyntax`)
- **Vite 7** with proxy to `:8000`
- **Tailwind CSS 3** — dark theme, `bg-[#0f0f17]` base
- **@tanstack/react-query** — `staleTime: 30_000` everywhere
- **axios** — shared `apiClient` in `src/api/client.ts`
- **recharts** — donut PieChart in StageDistribution
- **lucide-react** — all icons
- **sonner** — toasts (`<Toaster theme="dark">` in Layout)
- **@dnd-kit** — drag-and-drop Kanban board

### Code Style
- Arrow functions only (no `function` declarations for components/exports)
- `import type` for type-only imports
- Use `axios`, not `fetch`
- Use `lucide-react`, not inline SVGs
- Use `sonner` `toast.success/error()`, not `alert()`

### Key Files
| File | Purpose |
|------|---------|
| `src/main.tsx` | Entry: BrowserRouter + QueryClientProvider |
| `src/App.tsx` | Route definitions |
| `src/types/index.ts` | All TypeScript interfaces |
| `src/api/client.ts` | axios instance + all API functions |
| `src/components/layout/Layout.tsx` | Shell: sidebar + header + Toaster |
| `src/components/layout/Sidebar.tsx` | NavLinks, active=purple, mobile support |
| `src/pages/DashboardPage.tsx` | Stats cards, stage donut, activity timeline, recent apps |
| `src/pages/PipelinePage.tsx` | Kanban board (DnD) + list view toggle |
| `src/pages/ApplicationsPage.tsx` | Full table, status filter tabs, search, CSV export |
| `src/pages/ApplicationDetailPage.tsx` | Single app: email thread, edit SlideOver, delete |
| `src/pages/InterviewsPage.tsx` | Week-grouped interviewing cards |
| `src/pages/CompaniesPage.tsx` | Expandable company cards |
| `src/pages/SettingsPage.tsx` | Gmail scan trigger, SSE progress, persistent scan history |

### Routes
```
/dashboard          DashboardPage
/pipeline           PipelinePage
/applications       ApplicationsPage
/applications/:id   ApplicationDetailPage
/interviews         InterviewsPage
/companies          CompaniesPage
/settings           SettingsPage
```

### Query Key Conventions
```
['stats']                        DashboardPage stats
['applications', 'dashboard-recent']  Recent 5 for dashboard
['applications', 'list']         ApplicationsPage table
['applications', 'pipeline']     PipelinePage
['applications', 'interviewing'] InterviewsPage
['applications', 'companies']    CompaniesPage
['applications', 'search-pool']  GlobalSearch
['applications', id]             ApplicationDetailPage (single)
['emails', 'recent']             ActivityTimeline
['scan-history']                 SettingsPage history
```

Invalidate all application queries: `queryClient.invalidateQueries({ queryKey: ['applications'] })`

### `JobApplication` TypeScript Interface (key fields)
```ts
interface JobApplication {
  id: number
  company_name: string
  role_title: string | null
  status: ApplicationStatus
  applied_at: string | null
  last_email_at: string | null
  notes?: string | null
  job_url?: string | null
  next_action_at?: string | null
  email_count: number
}
```

---

## Testing

All tests are in `backend/scripts/test_all.py`. Run from the `backend/` directory:
```bash
pytest scripts/test_all.py -v
```

- Uses **in-memory SQLite** (`sqlite+aiosqlite:///:memory:`)
- Uses **httpx `AsyncClient`** with `ASGITransport`
- 72 tests total across ~15 test classes
- No real Gmail credentials needed — scan tests mock or accept 202/503

### Test Classes
- `TestHealth` — `/health` endpoint with DB check
- `TestApplicationCRUD` — create, read, update, delete, list
- `TestEmailEndpoints` — email listing
- `TestEmailLinking` — assign/unassign email to application
- `TestSearch` — search query param filtering
- `TestSort` — sort query param
- `TestStats` — `/stats` aggregation accuracy
- `TestScanHistory` — `/scan/history` returns ScanRun records
- `TestParseApplicationFromEmail` — unit tests for email regex parsing
- `TestAutoCreateApplications` — integration test for full email→app creation
- (and more)

---

## Gmail Setup
Gmail OAuth credentials are stored outside the repo. The scan service reads them from the path configured in `settings.py` (env var `GMAIL_CREDENTIALS_FILE`). On first run, it opens a browser for OAuth consent and caches the token.
