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
  role_title: string
  status: ApplicationStatus
  source?: string
  applied_at?: string
  confidence_score?: number
  last_email_at?: string
  created_at: string
  updated_at: string
  emails: EmailReference[]
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
