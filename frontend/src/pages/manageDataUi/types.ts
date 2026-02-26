import type { ApplicationStatus } from '../../types/index.ts'

export interface FormState {
  company_name: string
  role_title: string
  status: ApplicationStatus
  source: string
  applied_at: string
  confidence_score: string
}

export const EMPTY_FORM: FormState = {
  company_name: '',
  role_title: '',
  status: 'applied',
  source: '',
  applied_at: '',
  confidence_score: '',
}
