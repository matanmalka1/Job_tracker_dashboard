import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button, Card } from '@/shared/components/ui'
import type { JobApplication } from '../../../shared/types/job-tracker.ts'
import ApplicationStatusBadge from '../../../shared/components/data-display/ApplicationStatusBadge.tsx'
import LoadingSpinner from '../../../shared/components/feedback/LoadingSpinner.tsx'

interface Props {
  applications: JobApplication[]
  isLoading: boolean
  isError: boolean
}

const fmt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'

const RecentApplications = ({ applications, isLoading, isError }: Props) => {
  const navigate = useNavigate()

  return (
    <Card padding={false}>
      {/* header */}
      <div className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text-1)' }}>
            Recent Applications
          </span>
          {applications.length > 0 && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-3)' }}
            >
              {applications.length}
            </span>
          )}
        </div>
        <Button
          onClick={() => navigate('/applications')}
          variant="ghost"
          size="sm"
          icon={<ArrowRight size={13} />}
          iconPosition="right"
          className="text-[13px] text-accent hover:text-accent"
        >
          View all
        </Button>
      </div>

      {isLoading && <div className="p-6"><LoadingSpinner size="sm" message="Loading..." /></div>}

      {isError && (
        <p className="text-[13px] text-red-400 text-center py-5">
          Failed to load applications
        </p>
      )}

      {!isLoading && !isError && applications.length === 0 && (
        <p className="text-[13px] text-center py-8" style={{ color: 'var(--text-3)' }}>
          No applications yet
        </p>
      )}

      {!isLoading && !isError && applications.length > 0 && (
        <div className="overflow-x-auto">
          {/* column heads */}
          <div
            className="grid px-5 py-2.5 gap-4"
            style={{ gridTemplateColumns: '1fr 1fr 140px 90px', borderBottom: '1px solid var(--border)' }}
          >
            {['Company', 'Role', 'Status', 'Date'].map((col) => (
              <span key={col} className="section-label">{col}</span>
            ))}
          </div>

          {applications.map((app) => (
            <div
              key={app.id}
              onClick={() => navigate(`/applications/${app.id}`)}
              className="hover-row grid px-5 py-3.5 gap-4 items-center cursor-pointer"
              style={{ gridTemplateColumns: '1fr 1fr 140px 90px' }}
            >
              <span className="font-medium text-[13px] truncate" style={{ color: 'var(--text-1)' }}>
                {app.company_name}
              </span>
              <span className="text-[13px] truncate" style={{ color: 'var(--text-2)' }}>
                {app.role_title ?? '—'}
              </span>
              <ApplicationStatusBadge status={app.status} size="sm" />
              <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>
                {fmt(app.applied_at ?? app.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default RecentApplications
