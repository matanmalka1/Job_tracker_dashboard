# Frontend – Claude Guidelines

## Project Overview
React + TypeScript + Vite frontend for the **Job Dashboard** — a personal tool for tracking job application emails pulled from Gmail.

## Tech Stack
- **React 19** with TypeScript (strict mode)
- **Vite 7** for bundling and dev server
- **Tailwind CSS 3** for styling
- **PostCSS** + Autoprefixer

## Project Structure
```
frontend/
├── src/
│   └── App.tsx          # Root component (currently empty – start here)
├── index.html
├── vite.config.ts
├── tsconfig.app.json    # App-specific TS config
└── package.json
```

## Backend API
The FastAPI backend runs at `http://localhost:8000`. Key endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/job-tracker/emails` | List stored emails (`?limit=&offset=`) |
| `POST` | `/job-tracker/scan` | Trigger Gmail scan |
| `GET` | `/job-tracker/applications` | List applications (`?status=&limit=&offset=`) |
| `POST` | `/job-tracker/applications` | Create application |
| `GET` | `/job-tracker/applications/:id` | Get single application |
| `PATCH` | `/job-tracker/applications/:id` | Update application |
| `DELETE` | `/job-tracker/applications/:id` | Delete application |
| `POST` | `/job-tracker/applications/:id/emails/:emailId` | Link email to application |
| `GET` | `/health` | Health check |

### Key Types
```typescript
type ApplicationStatus = 'new' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'hired';

interface JobApplication {
  id: number;
  company_name: string;
  role_title: string;
  status: ApplicationStatus;
  source?: string;
  applied_at?: string;       // ISO datetime
  last_email_at?: string;    // ISO datetime
  confidence_score?: number;
  created_at: string;
  updated_at: string;
  emails: EmailReference[];
}

interface EmailReference {
  id: number;
  gmail_message_id: string;
  subject?: string;
  sender?: string;
  received_at: string;       // ISO datetime
  snippet?: string;
  application_id?: number;
}
```

## Development Commands
```bash
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Type-check + production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Code Conventions
- **TypeScript strict mode** – no `any`, no unused vars/params
- Use `verbatimModuleSyntax` – import types with `import type`
- Prefer functional components with hooks
- Keep components focused; extract shared logic to custom hooks
- Use `axios` for API calls ;
 add a proxy in `vite.config.ts` if needed to avoid CORS:
  ```ts
  server: { proxy: { '/job-tracker': 'http://localhost:8000', '/health': 'http://localhost:8000' } }
  ```
- Tailwind utility classes for all styling; avoid inline styles

## Design Notes
- Dashboard-style UI: sidebar or top nav, main content area
- Status badges should use distinct colours per `ApplicationStatus` value
- Emails panel should be collapsible / drawer-style to avoid clutter
- Scan button should show loading state during POST `/scan`
- Pagination controls for both emails and applications lists
