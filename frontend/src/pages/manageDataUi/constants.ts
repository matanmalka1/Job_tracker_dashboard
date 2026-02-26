import type { ApplicationStatus } from '../../types/index.ts'

export const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hired', label: 'Hired' },
]

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: 'bg-blue-500/10 text-blue-200 border-blue-500/30',
  applied: 'bg-purple-500/10 text-purple-200 border-purple-500/30',
  interviewing: 'bg-amber-500/10 text-amber-200 border-amber-500/30',
  offer: 'bg-green-500/10 text-green-200 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-200 border-red-500/30',
  hired: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30',
}

export const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
