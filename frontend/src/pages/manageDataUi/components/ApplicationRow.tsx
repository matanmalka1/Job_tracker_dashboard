import { Pencil, Trash2 } from 'lucide-react'
import { STATUS_COLORS, STATUS_OPTIONS, formatDate } from '../constants'
import type { JobApplication } from '../../../types/index.ts'

interface Props {
  app: JobApplication
  onEdit: (app: JobApplication) => void
  onDelete: (app: JobApplication) => void
}

const ApplicationRow = ({ app, onEdit, onDelete }: Props) => (
  <tr key={app.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
    <td className="px-4 py-3 text-white font-medium">{app.company_name}</td>
    <td className="px-4 py-3 text-gray-200">{app.role_title ?? '—'}</td>
    <td className="px-4 py-3">
      <span
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${STATUS_COLORS[app.status]}`}
      >
        <span className="w-2 h-2 rounded-full bg-current" />
        {STATUS_OPTIONS.find((o) => o.value === app.status)?.label ?? app.status}
      </span>
    </td>
    <td className="px-4 py-3 text-gray-300">{app.source ?? '—'}</td>
    <td className="px-4 py-3 text-gray-300">{formatDate(app.applied_at)}</td>
    <td className="px-4 py-3 text-gray-300">
      {app.confidence_score != null ? `${Math.round(app.confidence_score * 100)}%` : '—'}
    </td>
    <td className="px-4 py-3 text-gray-300">{app.email_count}</td>
    <td className="px-4 py-3 text-gray-400">{formatDate(app.updated_at)}</td>
    <td className="px-4 py-3 text-right">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => onEdit(app)}
          className="p-2 rounded-md bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
          title="Edit"
          aria-label={`Edit ${app.company_name}`}
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(app)}
          className="p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-200 hover:text-white hover:border-red-400/60 transition-colors"
          title="Delete"
          aria-label={`Delete ${app.company_name}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </td>
  </tr>
)

export default ApplicationRow
