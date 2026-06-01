# Job Dashboard — Frontend

React dashboard for tracking job applications. Connects to the FastAPI backend at `:8000` via Vite proxy.

## Stack

- **React 19** + **TypeScript** (strict, `verbatimModuleSyntax`)
- **Vite 7** — dev server on `:5173`, proxied to `:8000`
- **Tailwind CSS 3** — dark theme, `bg-[#0f0f17]` base
- **@tanstack/react-query** — server state, `staleTime: 30 000 ms`
- **axios** — shared `apiClient` in `src/api/client.ts`
- **recharts** — donut PieChart in StageDistribution
- **lucide-react** — all icons
- **sonner** — toast notifications
- **@dnd-kit** — drag-and-drop Kanban board

## Setup

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output → dist/
```

The backend must be running on `:8000` for API calls to work.

## Routes

| Path | Page | Description |
|---|---|---|
| `/dashboard` | DashboardPage | Stats cards, stage donut, activity timeline, recent apps |
| `/pipeline` | PipelinePage | Kanban board (DnD) + list view toggle |
| `/applications` | ApplicationsPage | Full table, status filter tabs, search, CSV export |
| `/applications/:id` | ApplicationDetailPage | Email thread, edit SlideOver, delete |
| `/interviews` | InterviewsPage | Week-grouped interviewing cards |
| `/companies` | CompaniesPage | Expandable company cards |
| `/settings` | SettingsPage | Gmail scan trigger, SSE progress, scan history |
| `/manage-data` | ManageDataUiPage | Raw CRUD table with inline edit/delete |
| `/live-logger` | LiveLoggerPage | SSE stream viewer for scan progress |

## Key Files

| File | Purpose |
|---|---|
| `src/main.tsx` | Entry: `BrowserRouter` + `QueryClientProvider` |
| `src/App.tsx` | Route definitions |
| `src/types/index.ts` | All TypeScript interfaces |
| `src/api/client.ts` | axios instance + all API functions |
| `src/components/layout/Layout.tsx` | Shell: sidebar + header + Toaster |
| `src/components/layout/Sidebar.tsx` | NavLinks, active = purple |
| `src/components/ui/` | Shared UI: StatusBadge, SlideOver, ConfirmDialog, GlobalSearch, … |

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
['applications', 'search-pool']   // GlobalSearch
['applications', 'manage-data']   // ManageDataUiPage
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
