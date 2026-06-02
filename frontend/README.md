# Frontend

React dashboard for tracking job applications. It uses relative API URLs; in development Vite proxies backend requests to FastAPI.

## Stack

- **React 19** + **TypeScript** (strict, `verbatimModuleSyntax`)
- **Vite 7** — dev server on `:5173`
- **Tailwind CSS 3** — dark theme, `bg-[#0f0f17]` base
- **@tanstack/react-query** — server state, `staleTime: 30_000`, `retry: 1`
- **axios** — shared `apiClient` in `src/api/client.ts`
- **recharts** — donut PieChart in StageDistribution
- **lucide-react** — all icons
- **sonner** — toast notifications
- **@dnd-kit** — drag-and-drop Kanban board

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run typecheck
npm run build    # output → dist/
```

The backend must be running on `:8000` unless `VITE_API_PROXY_TARGET` points elsewhere.

If the backend has `JOB_TRACKER_API_KEY` set, set this before building or running the frontend:

```env
VITE_JOB_TRACKER_API_KEY=...
```

## Routes

| Path | Page | Description |
|---|---|---|
| `/dashboard` | DashboardPage | Stats cards, stage donut, activity timeline, recent apps |
| `/pipeline` | PipelinePage | Kanban board (DnD) + list view toggle |
| `/applications` | ApplicationsPage | Full table, status filter tabs, search, CSV export |
| `/applications/:id` | ApplicationDetailPage | Email thread, edit form, delete |
| `/interviews` | InterviewsPage | Interviewing applications |
| `/companies` | CompaniesPage | Expandable company cards |
| `/settings` | SettingsPage | Gmail scan trigger, SSE progress, scan history |
| `/manage-data` | redirect | Redirects to `/applications` |
| `/live-logger` | redirect | Redirects to `/settings` |

## Key Files

| File | Purpose |
|---|---|
| `src/main.tsx` | React entrypoint |
| `src/app/App.tsx` | Route definitions |
| `src/app/providers.tsx` | Error boundary, router, React Query provider |
| `src/shared/types/job-tracker.ts` | API-facing TypeScript types |
| `src/api/client.ts` | axios instance + all API functions |
| `src/shared/components/layout/` | Shell, sidebar, header |
| `src/shared/components/ui/` | Shared UI components |
| `src/features/*/` | Feature-owned pages, hooks, and components |

## Code Style

- Arrow functions only — no `function` declarations for components
- `import type` for type-only imports
- Use `axios`, not `fetch`
- Use `lucide-react`, not inline SVGs
- Use `sonner` `toast.success/error()`, not `alert()`

## Query Key Conventions

```ts
['stats']                         // DashboardPage
['applications', 'list']          // ApplicationsPage table
['applications', 'pipeline']      // PipelinePage
['applications', 'interviewing']  // InterviewsPage
['applications', 'companies']     // CompaniesPage
['applications', id]              // ApplicationDetailPage (single)
['emails', 'recent']              // ActivityTimeline
['scan-history']                  // SettingsPage
```

Invalidate all application queries:
```ts
queryClient.invalidateQueries({ queryKey: ['applications'] })
```

## Proxy Config (`vite.config.ts`)

All `/job-tracker` and `/health` requests are proxied to `http://localhost:8000`.  
Override the target with `VITE_API_PROXY_TARGET` env var.

Production builds use the same relative URLs. When the backend serves `frontend/dist`, API routes are handled before the SPA fallback.
