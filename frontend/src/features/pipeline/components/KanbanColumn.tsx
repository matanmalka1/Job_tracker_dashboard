import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ApplicationStatus, PipelineCard } from '../../../shared/types/job-tracker.ts'
import KanbanCard from './KanbanCard.tsx'

interface Props {
  status: ApplicationStatus
  label: string
  applications: PipelineCard[]
  total: number
}

const STATUS_HEX: Record<ApplicationStatus, string> = {
  applied:      '#3b82f6',
  interviewing: '#a78bfa',
  offer:        '#10b981',
  rejected:     '#ef4444',
}

const STATUS_EMOJI: Record<ApplicationStatus, string> = {
  applied:      '◎',
  interviewing: '◈',
  offer:        '◆',
  rejected:     '✕',
}

const KanbanColumn = ({ status, label, applications, total }: Props) => {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const accent = STATUS_HEX[status]
  const glyph = STATUS_EMOJI[status]

  return (
    <div className="kanban-col">
      {/* header */}
      <div className="kanban-col__header" style={{ '--col-accent': accent } as React.CSSProperties}>
        <div className="kanban-col__header-left">
          <span className="kanban-col__glyph" style={{ color: accent }}>{glyph}</span>
          <span className="kanban-col__label">{label}</span>
        </div>
        <span className="kanban-col__count" style={{ color: accent, background: `${accent}18`, borderColor: `${accent}30` }}>
          {total}
        </span>
      </div>

      {/* drop zone */}
      <div
        ref={setNodeRef}
        className={['kanban-col__zone', isOver ? 'kanban-col__zone--over' : ''].join(' ')}
        style={{
          borderTopColor: accent,
          background: isOver ? `${accent}06` : undefined,
          borderColor: isOver ? `${accent}30` : undefined,
        }}
      >
        <SortableContext items={applications.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {applications.map((app) => (
            <KanbanCard key={app.id} application={app} />
          ))}
        </SortableContext>

        {applications.length === 0 && (
          <div className="kanban-col__empty">
            <span style={{ color: `${accent}40` }}>{glyph}</span>
            <span>Drop here</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default KanbanColumn
