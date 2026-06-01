import { Bell, CheckCircle, Mail, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import type { JobApplication } from '../../../shared/types/job-tracker.ts'
import { formatDateTime } from '../../../shared/utils/date.ts'

export interface TimelineEvent {
  id: string
  label: string
  sublabel?: string
  date: string
  icon: ReactNode
  color: string
  cardBg: string
  cardBorder: string
  detail?: string
  gmailUrl?: string
}

export const buildTimelineEvents = (app: JobApplication): TimelineEvent[] => {
  const events: TimelineEvent[] = []

  if (app.applied_at) {
    events.push({
      id: 'applied',
      label: 'Applied',
      sublabel: app.source ? `via ${app.source}` : undefined,
      date: app.applied_at,
      icon: <CheckCircle size={13} />,
      color: '#3b82f6',
      cardBg: 'bg-blue-500/8',
      cardBorder: 'border-blue-500/20',
      detail: app.role_title
        ? `Applied for ${app.role_title} at ${app.company_name}`
        : `Applied to ${app.company_name}`,
    })
  }

  if (app.source === 'Gmail' && app.created_at) {
    events.push({
      id: 'detected',
      label: 'Detected via Gmail',
      sublabel: 'Auto-created by scanner',
      date: app.created_at,
      icon: <Zap size={13} />,
      color: '#f59e0b',
      cardBg: 'bg-amber-500/8',
      cardBorder: 'border-amber-500/20',
      detail: 'This application was auto-created when a matching email was found in your Gmail inbox.',
    })
  }

  if (app.last_email_at) {
    events.push({
      id: 'last-email',
      label: 'Last email received',
      sublabel: app.email_count > 1 ? `${app.email_count} emails total` : '1 email',
      date: app.last_email_at,
      icon: <Mail size={13} />,
      color: '#8b5cf6',
      cardBg: 'bg-purple-500/8',
      cardBorder: 'border-purple-500/20',
      detail: 'Most recent email in this thread.',
    })
  }

  if (app.next_action_at) {
    const isOverdue = new Date(app.next_action_at) < new Date()
    events.push({
      id: 'follow-up',
      label: isOverdue ? 'Follow-up overdue' : 'Follow-up scheduled',
      sublabel: isOverdue ? 'Action required' : undefined,
      date: app.next_action_at,
      icon: <Bell size={13} />,
      color: isOverdue ? '#ef4444' : '#f59e0b',
      cardBg: isOverdue ? 'bg-red-500/8' : 'bg-amber-500/8',
      cardBorder: isOverdue ? 'border-red-500/20' : 'border-amber-500/20',
      detail: isOverdue
        ? `Follow-up was due on ${formatDateTime(app.next_action_at)}.`
        : `Scheduled follow-up on ${formatDateTime(app.next_action_at)}.`,
    })
  }

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
