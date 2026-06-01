import type { ApplicationStatus } from '../types/job-tracker.ts'

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'new',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'hired',
]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  hired: 'Hired',
}

export const APPLICATION_STATUS_OPTIONS = APPLICATION_STATUSES.map((status) => ({
  value: status,
  label: APPLICATION_STATUS_LABELS[status],
}))

export const APPLICATION_STATUS_BADGE_STYLES: Record<ApplicationStatus, string> = {
  new: 'bg-gray-500/20 text-gray-300',
  applied: 'bg-blue-500/20 text-blue-300',
  interviewing: 'bg-purple-500/20 text-purple-300',
  offer: 'bg-green-500/20 text-green-300',
  rejected: 'bg-red-500/20 text-red-300',
  hired: 'bg-teal-500/20 text-teal-300',
}

export const APPLICATION_STATUS_BORDERED_STYLES: Record<ApplicationStatus, string> = {
  new: 'bg-blue-500/10 text-blue-200 border-blue-500/30',
  applied: 'bg-purple-500/10 text-purple-200 border-purple-500/30',
  interviewing: 'bg-amber-500/10 text-amber-200 border-amber-500/30',
  offer: 'bg-green-500/10 text-green-200 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-200 border-red-500/30',
  hired: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30',
}
