export type ApplicationStatus =
  | 'new'
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected'
  | 'hired'

export interface EmailReference {
  id: number
  gmail_message_id: string
  subject?: string
  sender?: string
  received_at: string
  snippet?: string
  application_id?: number
}

export interface JobApplication {
  id: number
  company_name: string
  // FIX: nullable in backend model — was incorrectly required in TS type
  role_title: string | null
  status: ApplicationStatus
  source?: string
  applied_at?: string
  confidence_score?: number
  last_email_at?: string
  notes?: string
  job_url?: string
  next_action_at?: string
  created_at: string
  updated_at: string
  emails: EmailReference[]
  /** Computed by the API — avoids `app.emails.length` everywhere in the UI. */
  email_count: number
}

export interface JobApplicationPage {
  total: number
  items: JobApplication[]
}

export interface EmailReferencePage {
  total: number
  items: EmailReference[]
}

export interface DashboardStats {
  totalApplications: number
  activeInterviews: number
  offersReceived: number
  replyRate: number
  statusCounts: Record<ApplicationStatus, number>
}

export interface DashboardStatsResponse {
  total: number
  by_status: Record<ApplicationStatus, number>
  reply_rate: number
}

export interface ScanRun {
  id: number
  started_at: string
  completed_at?: string
  status: 'running' | 'completed' | 'failed'
  emails_fetched?: number
  emails_inserted?: number
  apps_created?: number
  error?: string
}

// ─── API write payloads ───────────────────────────────────────────────────────

export interface ApplicationWritePayload {
  company_name: string
  role_title?: string | null
  status?: ApplicationStatus
  source?: string
  applied_at?: string
  confidence_score?: number
  notes?: string
  job_url?: string
  next_action_at?: string
}