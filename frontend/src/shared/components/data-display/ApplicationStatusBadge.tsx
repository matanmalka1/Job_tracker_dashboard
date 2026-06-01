import type { ApplicationStatus } from '../../types/job-tracker.ts'
import { APPLICATION_STATUS_BADGE_STYLES, APPLICATION_STATUS_LABELS } from '../../constants/applicationStatus.ts'

interface Props {
  status: ApplicationStatus
}

const ApplicationStatusBadge = ({ status }: Props) => (
  <span
    className={[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      APPLICATION_STATUS_BADGE_STYLES[status],
    ].join(' ')}
  >
    {APPLICATION_STATUS_LABELS[status]}
  </span>
)

export default ApplicationStatusBadge
