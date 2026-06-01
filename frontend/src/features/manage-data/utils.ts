import type { ApplicationWritePayload, JobApplication } from '../../shared/types/job-tracker.ts'
import { dateInputToApiDate, toDateInputValue } from '../../shared/utils/date.ts'
import type { FormState } from './types.ts'

export const filterApplications = (
  applications: JobApplication[],
  search: string,
  statusFilter: FormState['status'] | 'all',
): JobApplication[] => {
  const query = search.trim().toLowerCase()
  return applications.filter((application) => {
    const matchesStatus = statusFilter === 'all' || application.status === statusFilter
    const matchesSearch =
      !query ||
      application.company_name.toLowerCase().includes(query) ||
      (application.role_title?.toLowerCase().includes(query) ?? false) ||
      (application.source ?? '').toLowerCase().includes(query)
    return matchesStatus && matchesSearch
  })
}

export const applicationToFormState = (application: JobApplication): FormState => ({
  company_name: application.company_name,
  role_title: application.role_title ?? '',
  status: application.status,
  source: application.source ?? '',
  applied_at: toDateInputValue(application.applied_at),
  confidence_score:
    application.confidence_score != null && !Number.isNaN(application.confidence_score)
      ? String(Math.round(application.confidence_score * 100))
      : '',
})

export const formStateToPayload = (form: FormState): ApplicationWritePayload => ({
  company_name: form.company_name.trim(),
  role_title: form.role_title.trim() || undefined,
  status: form.status,
  source: form.source.trim() || undefined,
  applied_at: dateInputToApiDate(form.applied_at),
  confidence_score: form.confidence_score.trim() === '' ? undefined : Number(form.confidence_score) / 100,
})
