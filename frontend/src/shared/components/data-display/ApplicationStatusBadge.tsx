import type { ApplicationStatus } from '../../types/job-tracker.ts'
import { APPLICATION_STATUS_LABELS } from '../../constants/applicationStatus.ts'

interface Props {
  status: ApplicationStatus
  size?: 'sm' | 'md'
}

const ApplicationStatusBadge = ({ status, size = 'md' }: Props) => (
  <span
    className={`badge badge-${status}`}
    style={size === 'sm' ? { fontSize: 11, padding: '2px 8px' } : undefined}
  >
    {APPLICATION_STATUS_LABELS[status]}
  </span>
)

export default ApplicationStatusBadge
