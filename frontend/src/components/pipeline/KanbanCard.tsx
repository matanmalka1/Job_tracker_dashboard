import { useSortable } from '@dnd-kit/sortable'
import { useNavigate } from 'react-router-dom'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Mail } from 'lucide-react'
import type { JobApplication } from '../../types/index.ts'

interface Props {
  application: JobApplication
}

const KanbanCard = ({ application }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: application.id })
  const navigate = useNavigate()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const confidencePct = application.confidence_score
    ? Math.round(application.confidence_score * 100)
    : null

  const confidenceColor =
    confidencePct === null
      ? ''
      : confidencePct >= 80
        ? 'bg-green-500'
        : confidencePct >= 60
          ? 'bg-yellow-500'
          : 'bg-red-500'

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => navigate(`/applications/${application.id}`)}
      className="bg-[#0f0f13] rounded-lg p-3.5 border border-white/5 cursor-default select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-semibold truncate">{application.company_name}</p>
          <p className="text-gray-400 text-xs mt-0.5 truncate">{application.role_title}</p>
        </div>

        <button
          {...attributes}
          {...listeners}
          className="text-gray-600 hover:text-gray-400 transition-colors cursor-grab active:cursor-grabbing mt-0.5 shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>
      </div>

      {confidencePct !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-500 text-xs">Confidence</span>
            <span className="text-gray-300 text-xs font-medium">{confidencePct}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={['h-full rounded-full transition-all', confidenceColor].join(' ')}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>
      )}

      {application.emails.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1 text-gray-500 text-xs">
          <Mail size={12} />
          <span>{application.emails.length} email{application.emails.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {application.source && (
        <p className="mt-1.5 text-gray-600 text-xs">{application.source}</p>
      )}
    </div>
  )
}

export default KanbanCard
