import { Pencil, Trash2 } from 'lucide-react'
import type { JobApplication } from '../../../shared/types/job-tracker.ts'
import {
  APPLICATION_STATUS_BORDERED_STYLES,
  APPLICATION_STATUS_LABELS,
} from '../../../shared/constants/applicationStatus.ts'
import { formatShortDate } from '../../../shared/utils/date.ts'

interface Props {
  app: JobApplication
  onEdit: (app: JobApplication) => void
  onDelete: (app: JobApplication) => void
}

const ApplicationRow = ({ app, onEdit, onDelete }: Props) => (
  <tr key={app.id} className="border-t border-DEFAULT hover:bg-white/5 transition-colors">
    <td className="px-4 py-3 text-t1 font-medium">{app.company_name}</td>
    <td className="px-4 py-3 text-gray-200">{app.role_title ?? '—'}</td>
    <td className="px-4 py-3">
      <span
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${APPLICATION_STATUS_BORDERED_STYLES[app.status]}`}
      >
        <span className="w-2 h-2 rounded-full bg-current" />
        {APPLICATION_STATUS_LABELS[app.status]}
      </span>
    </td>
    <td className="px-4 py-3 text-t1">{app.source ?? '—'}</td>
    <td className="px-4 py-3 text-t1">{formatShortDate(app.applied_at)}</td>
    <td className="px-4 py-3 text-t1">
      {app.confidence_score != null ? `${Math.round(app.confidence_score * 100)}%` : '—'}
    </td>
    <td className="px-4 py-3 text-t1">{app.email_count}</td>
    <td className="px-4 py-3 text-t2">{formatShortDate(app.updated_at)}</td>
    <td className="px-4 py-3 text-right">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => onEdit(app)}
          className="p-2 rounded-md bg-white/5 border border-DEFAULT text-t1 hover:text-t1 hover:border-hi transition-colors"
          title="Edit"
          aria-label={`Edit ${app.company_name}`}
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(app)}
          className="p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-200 hover:text-t1 hover:border-red-400/60 transition-colors"
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
