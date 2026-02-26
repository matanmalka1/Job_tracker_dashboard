import type { ApplicationStatus } from '../../types/index.ts'

export interface EditFormState {
  company_name: string
  role_title: string
  status: ApplicationStatus
  source: string
  applied_at: string
  notes: string
  job_url: string
  next_action_at: string
}
