import { useNavigate } from 'react-router-dom'
import type { JobApplication } from '../../types/index.ts'
import StatusBadge from '../ui/StatusBadge.tsx'
import LoadingSpinner from '../ui/LoadingSpinner.tsx'

interface Props {
  applications: JobApplication[]
  isLoading: boolean
  isError: boolean
}

const formatDate = (iso?: string): string => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const RecentApplications = ({ applications, isLoading, isError }: Props) => {
  const navigate = useNavigate()

  return (
    <div className="bg-[#1a1a24] rounded-xl border border-white/5">
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Recent Applications</h3>
        <button
          onClick={() => navigate('/applications')}
          className="text-purple-400 text-xs hover:text-purple-300 transition-colors"
        >
          View all →
        </button>
      </div>

      {isLoading && <LoadingSpinner size="sm" message="Loading applications..." />}

      {isError && (
        <p className="text-red-400 text-sm text-center py-6 px-5">
          Failed to load applications.
        </p>
      )}

      {!isLoading && !isError && applications.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-6 px-5">
          No applications yet. Add your first one!
        </p>
      )}

      {!isLoading && !isError && applications.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Company', 'Role', 'Status', 'Date'].map((col) => (
                  <th
                    key={col}
                    className="text-left text-gray-400 font-medium text-xs uppercase tracking-wider px-5 py-3"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applications.map((app, idx) => (
                <tr
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  className={[
                    'hover:bg-white/[0.04] transition-colors cursor-pointer',
                    idx < applications.length - 1 ? 'border-b border-white/5' : '',
                  ].join(' ')}
                >
                  <td className="px-5 py-3.5">
                    <span className="text-white font-medium">{app.company_name}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-gray-300">{app.role_title}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-gray-400 text-xs">
                      {formatDate(app.applied_at ?? app.created_at)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default RecentApplications
