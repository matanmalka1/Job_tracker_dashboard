import { useSortable } from '@dnd-kit/sortable'
import { useNavigate } from 'react-router-dom'
import { CSS } from '@dnd-kit/utilities'
import { Mail, Calendar, ExternalLink } from 'lucide-react'
import type { PipelineCard } from '../../../shared/types/job-tracker.ts'

interface Props {
  application: PipelineCard
  isOverlay?: boolean
}

const STATUS_ACCENT: Record<string, string> = {
  new:          '#6366f1',
  applied:      '#3b82f6',
  interviewing: '#a78bfa',
  offer:        '#10b981',
  rejected:     '#ef4444',
  hired:        '#14b8a6',
}

const formatDate = (iso?: string) => {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const KanbanCard = ({ application, isOverlay = false }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: application.id })
  const navigate = useNavigate()

  const style = { transform: CSS.Transform.toString(transform), transition }
  const accent = STATUS_ACCENT[application.status] ?? '#6366f1'
  const date = formatDate(application.applied_at ?? application.last_email_at)

  const confidencePct = application.confidence_score
    ? Math.round(application.confidence_score * 100)
    : null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'kanban-card group select-none',
        isDragging && !isOverlay ? 'kanban-card--dragging' : '',
        isOverlay ? 'kanban-card--overlay' : '',
      ].join(' ')}
    >
      {/* drag handle strip */}
      <div
        {...attributes}
        {...listeners}
        className="kanban-card__handle"
        aria-label="Drag to reorder"
      >
        <span className="kanban-card__handle-dots">⠿</span>
      </div>

      {/* content */}
      <div
        onClick={() => navigate(`/applications/${application.id}`)}
        className="kanban-card__body"
      >
        <div className="kanban-card__top">
          <p className="kanban-card__company">{application.company_name}</p>
          <ExternalLink
            size={11}
            className="kanban-card__ext opacity-0 group-hover:opacity-60 transition-opacity"
          />
        </div>

        {application.role_title && (
          <p className="kanban-card__role">{application.role_title}</p>
        )}

        {confidencePct !== null && (
          <div className="kanban-card__confidence">
            <div
              className="kanban-card__confidence-bar"
              style={{
                width: `${confidencePct}%`,
                background: accent,
                opacity: 0.7,
              }}
            />
          </div>
        )}

        <div className="kanban-card__footer">
          {application.email_count > 0 && (
            <span className="kanban-card__meta">
              <Mail size={10} />
              {application.email_count}
            </span>
          )}
          {date && (
            <span className="kanban-card__meta kanban-card__meta--date">
              <Calendar size={10} />
              {date}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default KanbanCard
