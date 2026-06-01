import type { ApplicationStatus, JobApplication } from '../../shared/types/job-tracker.ts'

export interface CompanyGroup {
  name: string
  applications: JobApplication[]
  latestActivity: string
  statusCounts: Partial<Record<ApplicationStatus, number>>
  totalEmails: number
}
