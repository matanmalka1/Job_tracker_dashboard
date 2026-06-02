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

const STATUS_ICONS: Record<ApplicationStatus, string> = {
  applied:      '↗',
  interviewing: '◈',
  offer:        '✦',
  rejected:     '—',
}

const KanbanColumn = ({ status, label, applications, total }: Props) => {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const accent = STATUS_HEX[status]
  const icon = STATUS_ICONS[status]

  return (
    <div className="kanban-col">
      {/* header */}
      <div className="kanban-col__header" style={{ '--col-accent': accent } as React.CSSProperties}>
        <div className="kanban-col__header-inner">
          <div className="kanban-col__header-left">
            <span className="kanban-col__icon" style={{ color: accent }}>{icon}</span>
            <span className="kanban-col__label">{label}</span>
          </div>
          <span className="kanban-col__count" style={{ color: accent, background: `${accent}18`, borderColor: `${accent}28` }}>
            {total}
          </span>
        </div>
        {/* accent progress strip */}
        <div className="kanban-col__strip" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}40)` }} />
      </div>

      {/* drop zone */}
      <div
        ref={setNodeRef}
        className={['kanban-col__zone', isOver ? 'kanban-col__zone--over' : ''].join(' ')}
        style={isOver ? { borderColor: `${accent}40`, background: `${accent}04` } : undefined}
      >
        <SortableContext items={applications.map((a) => a.id)} strategy={verticalListSortingStrategy}>
          {applications.map((app) => (
            <KanbanCard key={app.id} application={app} />
          ))}
        </SortableContext>

        {applications.length === 0 && (
          <div className="kanban-col__empty">
            <div className="kanban-col__empty-icon" style={{ color: `${accent}50`, borderColor: `${accent}20` }}>
              {icon}
            </div>
            <span className="kanban-col__empty-text">Drop cards here</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default KanbanColumn
