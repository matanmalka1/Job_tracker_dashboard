import type { ApplicationStatus } from '../../types/index.ts'

interface Props {
  status: ApplicationStatus
}

const STATUS_STYLES: Record<ApplicationStatus, string> = {
  new: 'bg-gray-500/20 text-gray-300',
  applied: 'bg-blue-500/20 text-blue-300',
  interviewing: 'bg-purple-500/20 text-purple-300',
  offer: 'bg-green-500/20 text-green-300',
  rejected: 'bg-red-500/20 text-red-300',
  hired: 'bg-teal-500/20 text-teal-300',
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  hired: 'Hired',
}

const StatusBadge = ({ status }: Props) => (
  <span
    className={[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      STATUS_STYLES[status],
    ].join(' ')}
  >
    {STATUS_LABELS[status]}
  </span>
)

export default StatusBadge
