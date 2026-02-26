import axios from 'axios'
import type {
  ApplicationWritePayload,
  JobApplication,
  JobApplicationPage,
  EmailReferencePage,
  DashboardStatsResponse,
  ScanRun,
} from '../types/index.ts'

const apiClient = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    // BUG FIX: The original error handler lost the HTTP status code. Preserve
    // it on the Error object so callers can branch on status when needed.
    const message: string =
      err.response?.data?.detail ?? err.message ?? 'Unknown API error'
    const error = new Error(message) as Error & { status?: number }
    error.status = err.response?.status as number | undefined
    return Promise.reject(error)
  },
)

export const fetchApplication = (id: number): Promise<JobApplication> =>
  apiClient
    .get<JobApplication>(`/job-tracker/applications/${id}`)
    .then((r) => r.data)

export const fetchApplications = (params?: {
  limit?: number
  offset?: number
  status?: string
  search?: string
  sort?: string
}): Promise<JobApplicationPage> =>
  apiClient
    .get<JobApplicationPage>('/job-tracker/applications', { params })
    .then((r) => r.data)

export const fetchEmails = (params?: {
  limit?: number
  offset?: number
}): Promise<EmailReferencePage> =>
  apiClient
    .get<EmailReferencePage>('/job-tracker/emails', { params })
    .then((r) => r.data)

export const fetchStats = (): Promise<DashboardStatsResponse> =>
  apiClient
    .get<DashboardStatsResponse>('/job-tracker/stats')
    .then((r) => r.data)

export const fetchScanHistory = (): Promise<ScanRun[]> =>
  apiClient
    .get<ScanRun[]>('/job-tracker/scan/history')
    .then((r) => r.data)

export const triggerScan = (): Promise<{ inserted: number; applications_created: number }> =>
  apiClient
    .post<{ inserted: number; applications_created: number }>('/job-tracker/scan')
    .then((r) => r.data)

// BUG FIX: Use the shared ApplicationWritePayload type instead of the
// ad-hoc inline Pick/Omit chain that diverged from the actual schema.
export const createApplication = (
  body: ApplicationWritePayload,
): Promise<JobApplication> =>
  apiClient
    .post<JobApplication>('/job-tracker/applications', body)
    .then((r) => r.data)

export const updateApplication = (
  id: number,
  body: Partial<ApplicationWritePayload>,
): Promise<JobApplication> =>
  apiClient
    .patch<JobApplication>(`/job-tracker/applications/${id}`, body)
    .then((r) => r.data)

export const deleteApplication = (id: number): Promise<void> =>
  apiClient.delete(`/job-tracker/applications/${id}`).then(() => undefined)

export const assignEmail = (applicationId: number, emailId: number): Promise<void> =>
  apiClient
    .post(`/job-tracker/applications/${applicationId}/emails/${emailId}`)
    .then(() => undefined)

export const unassignEmail = (applicationId: number, emailId: number): Promise<void> =>
  apiClient
    .delete(`/job-tracker/applications/${applicationId}/emails/${emailId}`)
    .then(() => undefined)