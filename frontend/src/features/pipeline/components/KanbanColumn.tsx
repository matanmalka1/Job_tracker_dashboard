import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ApplicationStatus, PipelineCard } from '../../../shared/types/job-tracker.ts'
import KanbanCard from './KanbanCard.tsx'

interface Props {
  status: ApplicationStatus
  label: string
  applications: PipelineCard[]
  color: string
  total: number
}

const STATUS_HEX: Record<ApplicationStatus, string> = {
  new:          '#6366f1',
  applied:      '#3b82f6',
  interviewing: '#8b5cf6',
  offer:        '#10b981',
  rejected:     '#ef4444',
  hired:        '#14b8a6',
}

const KanbanColumn = ({ status, label, applications, total }: Props) => {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const accent = STATUS_HEX[status]

  return (
    <div className="flex flex-col min-w-[260px] w-[260px]">
      {/* column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: accent }} />
        <span className="text-[13px] font-semibold flex-1" style={{ color: 'var(--text-1)' }}>
          {label}
        </span>
        <span
          className="col-count text-[11px] font-medium"
          style={{
            color: accent,
            background: `${accent}15`,
            borderColor: `${accent}30`,
          }}
        >
          {total}
        </span>
      </div>

      {/* drop zone */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 min-h-[140px] p-2.5 flex-1 rounded-xl transition-all duration-150"
        style={{
          background: isOver ? `${accent}06` : 'var(--bg-surface)',
          border: `1px solid ${isOver ? `${accent}35` : 'var(--border)'}`,
          borderTop: `2px solid ${accent}`,
        }}
      >
        <SortableContext items={applications.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {applications.map((app) => (
            <KanbanCard key={app.id} application={app} />
          ))}
        </SortableContext>

        {applications.length === 0 && (
          <p className="text-[12px] text-center py-5" style={{ color: 'var(--text-3)' }}>
            Drop here
          </p>
        )}
      </div>
    </div>
  )
}

export default KanbanColumn
