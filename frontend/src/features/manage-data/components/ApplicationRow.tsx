import { Pencil, Trash2 } from 'lucide-react'
import type { JobApplication } from '../../../shared/types/job-tracker.ts'
import { APPLICATION_STATUS_LABELS } from '../../../shared/constants/applicationStatus.ts'
import { formatShortDate } from '../../../shared/utils/date.ts'

interface Props {
  app: JobApplication
  onEdit: (app: JobApplication) => void
  onDelete: (app: JobApplication) => void
}

const CONFIDENCE_BAR_COLOR = (score: number) =>
  score > 0.7 ? 'bg-emerald-400' : score > 0.4 ? 'bg-amber-400' : 'bg-red-400'

const ApplicationRow = ({ app, onEdit, onDelete }: Props) => (
  <tr className="border-b border-DEFAULT hover:bg-hover transition-colors group">
    {/* Company */}
    <td className="px-4 py-2.5">
      <span className="text-[13px] font-medium text-t1">{app.company_name}</span>
    </td>

    {/* Role */}
    <td className="px-4 py-2.5 max-w-[220px]">
      <span className={`text-[12px] truncate block ${app.role_title ? 'text-t2' : 'text-t3'}`}>
        {app.role_title ?? '—'}
      </span>
    </td>

    {/* Status */}
    <td className="px-4 py-2.5">
      <span className={`badge badge-${app.status}`}>
        {APPLICATION_STATUS_LABELS[app.status]}
      </span>
    </td>

    {/* Source */}
    <td className="px-4 py-2.5">
      <span className="text-[12px] text-t2">{app.source ?? '—'}</span>
    </td>

    {/* Applied */}
    <td className="px-4 py-2.5">
      <span className="font-mono text-[11px] text-t2">{formatShortDate(app.applied_at) ?? '—'}</span>
    </td>

    {/* Confidence */}
    <td className="px-4 py-2.5">
      {app.confidence_score != null ? (
        <div className="flex items-center gap-2">
          <div className="h-1 w-14 rounded-full overflow-hidden bg-raised">
            <div
              className={`h-full rounded-full transition-all duration-300 ${CONFIDENCE_BAR_COLOR(app.confidence_score)}`}
              style={{ width: `${Math.round(app.confidence_score * 100)}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-t2">
            {Math.round(app.confidence_score * 100)}%
          </span>
        </div>
      ) : (
        <span className="text-[12px] text-t3">—</span>
      )}
    </td>

    {/* Emails */}
    <td className="px-4 py-2.5">
      <span className={`font-mono text-[12px] ${app.email_count > 0 ? 'text-t2' : 'text-t3'}`}>
        {app.email_count}
      </span>
    </td>

    {/* Updated */}
    <td className="px-4 py-2.5">
      <span className="font-mono text-[11px] text-t3">{formatShortDate(app.updated_at) ?? '—'}</span>
    </td>

    {/* Actions */}
    <td className="px-4 py-2.5">
      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
        <button
          onClick={() => onEdit(app)}
          title="Edit"
          aria-label={`Edit ${app.company_name}`}
          className="flex items-center justify-center w-7 h-7 rounded-md bg-raised border border-mid text-t2 hover:border-hi hover:text-t1 transition-colors"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(app)}
          title="Delete"
          aria-label={`Delete ${app.company_name}`}
          className="flex items-center justify-center w-7 h-7 rounded-md bg-red-500/[0.06] border border-red-500/20 text-red-500/60 hover:bg-red-500/[0.12] hover:border-red-500/40 hover:text-red-300 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </td>
  </tr>
)

export default ApplicationRow
