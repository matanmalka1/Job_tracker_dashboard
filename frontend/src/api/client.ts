import axios from 'axios'
import type {
  JobApplication,
  JobApplicationPage,
  EmailReferencePage,
} from '../types/index.ts'

const apiClient = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  (r) => r,
  (err) =>
    Promise.reject(
      new Error(err.response?.data?.detail ?? err.message ?? 'Unknown API error'),
    ),
)

export const fetchApplication = (id: number): Promise<JobApplication> =>
  apiClient
    .get<JobApplication>(`/job-tracker/applications/${id}`)
    .then((r) => r.data)

export const fetchApplications = (params?: {
  limit?: number
  offset?: number
  status?: string
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

export const triggerScan = (): Promise<{ inserted: number; applications_created: number }> =>
  apiClient
    .post<{ inserted: number; applications_created: number }>('/job-tracker/scan')
    .then((r) => r.data)

export const createApplication = (
  body: Pick<
    JobApplication,
    'company_name' | 'role_title' | 'status' | 'source' | 'applied_at' | 'confidence_score'
  >,
): Promise<JobApplication> =>
  apiClient
    .post<JobApplication>('/job-tracker/applications', body)
    .then((r) => r.data)

export const updateApplication = (
  id: number,
  body: Partial<
    Pick<
      JobApplication,
      'company_name' | 'role_title' | 'status' | 'source' | 'applied_at' | 'confidence_score'
    >
  >,
): Promise<JobApplication> =>
  apiClient
    .patch<JobApplication>(`/job-tracker/applications/${id}`, body)
    .then((r) => r.data)

export const deleteApplication = (id: number): Promise<void> =>
  apiClient.delete(`/job-tracker/applications/${id}`).then(() => undefined)
