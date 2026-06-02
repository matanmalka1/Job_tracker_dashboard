import { useSortable } from '@dnd-kit/sortable'
import { useNavigate } from 'react-router-dom'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Mail } from 'lucide-react'
import type { PipelineCard } from '../../../shared/types/job-tracker.ts'

interface Props {
  application: PipelineCard
}

const confColorClass = (pct: number) =>
  pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-accent' : 'bg-red-500'

const confTextClass = (pct: number) =>
  pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-accent' : 'text-red-400'

const KanbanCard = ({ application }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: application.id })
  const navigate = useNavigate()

  const style = { transform: CSS.Transform.toString(transform), transition }

  const confidencePct = application.confidence_score
    ? Math.round(application.confidence_score * 100)
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'rounded-xl select-none border border-DEFAULT bg-base transition-opacity',
        isDragging ? 'opacity-30' : 'opacity-100',
      ].join(' ')}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex justify-end px-2.5 pt-2 cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={13} className="text-t3" />
      </div>

      <div
        onClick={() => navigate(`/applications/${application.id}`)}
        className="px-3 pb-3 cursor-pointer"
      >
        <p className="font-semibold text-[13px] truncate m-0 text-t1">
          {application.company_name}
        </p>
        <p className="text-[12px] truncate m-0 mt-0.5 text-t2">
          {application.role_title ?? '—'}
        </p>

        {confidencePct !== null && (
          <div className="mt-2.5">
            <div className="flex justify-between mb-1">
              <span className="text-[11px] text-t3">Confidence</span>
              <span className={`text-[11px] font-medium ${confTextClass(confidencePct)}`}>
                {confidencePct}%
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-hover">
              <div
                className={`h-full rounded-full transition-all duration-500 ${confColorClass(confidencePct)}`}
                style={{ width: `${confidencePct}%` }}
              />
            </div>
          </div>
        )}

        {application.email_count > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <Mail size={11} className="text-t3" />
            <span className="text-[11px] text-t3">
              {application.email_count} email{application.email_count > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default KanbanCard
