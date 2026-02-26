import { Pencil, Trash2 } from 'lucide-react'
import type { ApplicationStatus, JobApplication } from '../../../types/index.ts'
import { ALL_STATUSES, STATUS_LABELS } from '../constants.ts'

interface Props {
  app: JobApplication
  onEdit: () => void
  onDelete: () => void
  onChangeStatus: (status: ApplicationStatus) => void
}

const DetailHeader = ({ app, onEdit, onDelete, onChangeStatus }: Props) => (
  <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-6">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center">
          <span className="text-purple-400 font-bold text-lg">{app.company_name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h1 className="text-white text-xl font-bold">{app.company_name}</h1>
          <p className="text-gray-400 text-sm mt-0.5">{app.role_title ?? '—'}</p>
          <div className="flex items-center gap-3 mt-2">
            <select
              value={app.status}
              onChange={(e) => onChangeStatus(e.target.value as ApplicationStatus)}
              className="bg-transparent border border-white/10 rounded-lg px-2 py-1 text-xs font-medium text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors cursor-pointer [color-scheme:dark]"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {app.source && <span className="text-gray-500 text-xs">via {app.source}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-xs font-medium transition-colors"
        >
          <Pencil size={13} />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-600/20 text-red-400 hover:bg-red-600/10 text-xs font-medium transition-colors"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  </div>
)

export default DetailHeader
