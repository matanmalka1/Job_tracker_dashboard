import { Pencil, Trash2 } from 'lucide-react'
import type { JobApplication } from '../../../types/index.ts'
import StatusBadge from '../../../components/ui/StatusBadge.tsx'
import { formatDate } from '../utils.ts'

interface Props {
  applications: JobApplication[]
  selectedIds: Set<number>
  allOnPageSelected: boolean
  onToggleSelectAll: () => void
  onToggleSelect: (id: number) => void
  onEdit: (app: JobApplication) => void
  onDelete: (app: JobApplication) => void
  onRowClick: (id: number) => void
  dimmed: boolean
}

const ApplicationsTable = ({
  applications,
  selectedIds,
  allOnPageSelected,
  onToggleSelectAll,
  onToggleSelect,
  onEdit,
  onDelete,
  onRowClick,
  dimmed,
}: Props) => (
  <div className={['bg-[#1a1a24] rounded-xl border border-white/5 overflow-x-auto transition-opacity', dimmed ? 'opacity-70' : ''].join(' ')}>
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/5">
          <th className="px-4 py-3 w-8">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onChange={onToggleSelectAll}
              className="accent-purple-500 cursor-pointer"
              aria-label="Select all on page"
            />
          </th>
          {['Company', 'Role', 'Status', 'Source', 'Date', 'Emails', ''].map((col) => (
            <th key={col} className="text-left text-gray-400 font-medium text-xs uppercase tracking-wider px-4 py-3">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {applications.length === 0 && (
          <tr>
            <td colSpan={8} className="px-4 py-10 text-center text-gray-500 text-sm">
              No applications match your filter.
            </td>
          </tr>
        )}
        {applications.map((app) => (
          <tr
            key={app.id}
            onClick={() => onRowClick(app.id)}
            className={[
              'border-b border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer',
              selectedIds.has(app.id) ? 'bg-purple-600/5' : '',
            ].join(' ')}
          >
            <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); onToggleSelect(app.id) }}>
              <input
                type="checkbox"
                checked={selectedIds.has(app.id)}
                onChange={() => onToggleSelect(app.id)}
                className="accent-purple-500 cursor-pointer"
                aria-label={`Select ${app.company_name}`}
              />
            </td>
            <td className="px-4 py-3">
              <span className="text-white font-medium">{app.company_name}</span>
            </td>
            <td className="px-4 py-3">
              <span className="text-gray-300">{app.role_title ?? '—'}</span>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={app.status} />
            </td>
            <td className="px-4 py-3">
              <span className="text-gray-400 text-xs">{app.source ?? '—'}</span>
            </td>
            <td className="px-4 py-3">
              <span className="text-gray-400 text-xs">{formatDate(app.applied_at ?? app.created_at)}</span>
            </td>
            <td className="px-4 py-3">
              <span className="text-gray-500 text-xs">
                {app.email_count > 0 ? `${app.email_count} email${app.email_count !== 1 ? 's' : ''}` : '—'}
              </span>
            </td>
            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => onEdit(app)}
                  className="text-gray-500 hover:text-purple-400 transition-colors"
                  title="Edit"
                  aria-label={`Edit ${app.company_name}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => onDelete(app)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  title="Delete"
                  aria-label={`Delete ${app.company_name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export default ApplicationsTable
