import { useSortable } from '@dnd-kit/sortable'
import { useNavigate } from 'react-router-dom'
import { CSS } from '@dnd-kit/utilities'
import { Mail, Calendar, GripVertical } from 'lucide-react'
import type { PipelineCard } from '../../../shared/types/job-tracker.ts'

interface Props {
  application: PipelineCard
  isOverlay?: boolean
}

const STATUS_ACCENT: Record<string, string> = {
  applied:      '#3b82f6',
  interviewing: '#a78bfa',
  offer:        '#10b981',
  rejected:     '#ef4444',
}

const STATUS_AVATAR_BG: Record<string, string> = {
  applied:      'rgba(59,130,246,0.15)',
  interviewing: 'rgba(167,139,250,0.15)',
  offer:        'rgba(16,185,129,0.15)',
  rejected:     'rgba(239,68,68,0.10)',
}

const formatDate = (iso?: string) => {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

const KanbanCard = ({ application, isOverlay = false }: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: application.id })
  const navigate = useNavigate()

  // Lock scaleX to 1 — prevents card from stretching during cross-column drags.
  // Use a smooth spring-like easing instead of dnd-kit's default linear transition.
  const transformStr = transform
    ? CSS.Transform.toString({ ...transform, scaleX: 1, scaleY: 1 })
    : undefined
  const style = {
    transform: transformStr,
    // transition comes from dnd-kit during sort; undefined when idle (no extra CSS delay)
    transition,
  }
  const accent = STATUS_ACCENT[application.status] ?? '#6366f1'
  const avatarBg = STATUS_AVATAR_BG[application.status] ?? 'rgba(99,102,241,0.15)'
  const date = formatDate(application.applied_at ?? application.last_email_at)
  const initials = getInitials(application.company_name)

  const handleClick = (e: React.MouseEvent) => {
    // Don't navigate if this was a drag (pointer moved > 4px)
    if (isDragging) { e.preventDefault(); return }
    navigate(`/applications/${application.id}`)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, '--card-accent': accent } as React.CSSProperties}
      className={[
        'kanban-card group select-none',
        isDragging && !isOverlay ? 'kanban-card--dragging' : '',
        isOverlay ? 'kanban-card--overlay' : '',
      ].join(' ')}
      {...attributes}
      {...listeners}
    >
      <div className="kanban-card__inner" onClick={handleClick}>
        {/* left accent bar */}
        <div className="kanban-card__accent-bar" style={{ background: accent }} />

        {/* avatar */}
        <div
          className="kanban-card__avatar"
          style={{ background: avatarBg, color: accent }}
        >
          {initials}
        </div>

        {/* main content */}
        <div className="kanban-card__content">
          <p className="kanban-card__company">{application.company_name}</p>
          {application.role_title && (
            <p className="kanban-card__role">{application.role_title}</p>
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

        {/* visual drag hint */}
        <div className="kanban-card__handle" aria-hidden>
          <GripVertical size={13} />
        </div>
      </div>
    </div>
  )
}

export default KanbanCard
