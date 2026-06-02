export type ApplicationStatus =
  | 'applied'
  | 'interviewing'
  | 'offer'
  | 'rejected'

export interface EmailReference {
  id: number
  gmail_message_id: string
  gmail_thread_id?: string
  subject?: string
  sender?: string
  received_at: string
  snippet?: string
  application_id?: number
}

export interface JobApplication {
  id: number
  company_name: string
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

export interface EventLogLine {
  id: number
  stage: string
  detail: string
  ts: number
  type: 'info' | 'success' | 'error' | 'warn'
}

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

// Pipeline types
export interface PipelineCard {
  id: number
  company_name: string
  role_title: string | null
  status: ApplicationStatus
  source?: string
  confidence_score?: number
  applied_at?: string
  last_email_at?: string
  updated_at: string
  email_count: number
}

export interface PipelineColumnPage {
  status: ApplicationStatus
  total: number
  page: number
  page_size: number
  has_next: boolean
  items: PipelineCard[]
}

// Companies summary types
export interface CompanySummary {
  company_name: string
  application_count: number
  latest_activity: string
  status_counts: Record<ApplicationStatus, number>
}

export interface CompanySummaryPage {
  total: number
  items: CompanySummary[]
}
