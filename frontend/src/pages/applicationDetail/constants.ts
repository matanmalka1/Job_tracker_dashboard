import type { ApplicationStatus } from '../../types/index.ts'

export const ALL_STATUSES: ApplicationStatus[] = [
  'new',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'hired',
]

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  hired: 'Hired',
}
