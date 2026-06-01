import type { ApplicationStatus, ApplicationWritePayload, JobApplication } from '../types/job-tracker.ts'
import { dateInputToApiDate, toDateInputValue } from './date.ts'

export interface ApplicationFormState {
  company_name: string
  role_title: string
  status: ApplicationStatus
  source: string
  applied_at: string
  notes: string
  job_url: string
  next_action_at: string
}

export const EMPTY_APPLICATION_FORM: ApplicationFormState = {
  company_name: '',
  role_title: '',
  status: 'applied',
  source: '',
  applied_at: '',
  notes: '',
  job_url: '',
  next_action_at: '',
}

export const applicationToFormState = (application: JobApplication): ApplicationFormState => ({
  company_name: application.company_name,
  role_title: application.role_title ?? '',
  status: application.status,
  source: application.source ?? '',
  applied_at: toDateInputValue(application.applied_at),
  notes: application.notes ?? '',
  job_url: application.job_url ?? '',
  next_action_at: toDateInputValue(application.next_action_at),
})

export const formStateToApplicationPayload = (form: ApplicationFormState): ApplicationWritePayload => ({
  company_name: form.company_name.trim(),
  role_title: form.role_title.trim() || undefined,
  status: form.status,
  source: form.source.trim() || undefined,
  applied_at: dateInputToApiDate(form.applied_at),
  notes: form.notes.trim() || undefined,
  job_url: form.job_url.trim() || undefined,
  next_action_at: dateInputToApiDate(form.next_action_at),
})
