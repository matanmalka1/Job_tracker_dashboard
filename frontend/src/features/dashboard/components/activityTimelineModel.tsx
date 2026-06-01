import { Briefcase, CheckCircle, Mail, Star, XCircle } from 'lucide-react'
import type { EmailReference } from '../../../shared/types/job-tracker.ts'

export type Category = 'offer' | 'rejection' | 'interview' | 'application' | 'general'

export interface CategoryConfig {
  icon: React.ReactNode
  color: string
  twBg: string
  twBorder: string
  label: string
  pill: string
}

export const formatRelative = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export const formatDateLabel = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export const formatFull = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

export const extractDomain = (sender?: string): string => {
  if (!sender) return 'Unknown'
  const match = sender.match(/@([\w.-]+)/)
  return match ? match[1] : sender
}

export const extractName = (sender?: string): string => {
  if (!sender) return 'Unknown'
  const match = sender.match(/^([^<]+)</)
  if (match) return match[1].trim()
  return extractDomain(sender)
}

export const categorize = (email: EmailReference): Category => {
  const text = `${email.subject ?? ''} ${email.snippet ?? ''}`.toLowerCase()
  if (/\b(offer|congratulations|pleased to inform|job offer)\b/.test(text)) return 'offer'
  if (/\b(unfortunately|regret|not moving forward|not selected|declined)\b/.test(text)) return 'rejection'
  if (/\b(interview|schedule|assessment|screening|phone screen)\b/.test(text)) return 'interview'
  if (/\b(application|applied|received your|thank you for applying)\b/.test(text)) return 'application'
  return 'general'
}

const JOB_KEYWORDS = [
  'application',
  'applied',
  'interview',
  'offer',
  'position',
  'role',
  'job',
  'hiring',
  'recruiter',
  'recruitment',
  'candidat',
  'opportunity',
  'resume',
  'cv',
  'assessment',
  'screening',
  'onboard',
]

export const isJobEmail = (email: EmailReference): boolean => {
  if (email.application_id != null) return true
  const text = `${email.subject ?? ''} ${email.snippet ?? ''}`.toLowerCase()
  return JOB_KEYWORDS.some((keyword) => text.includes(keyword))
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  offer: {
    icon: <Star size={12} />,
    color: '#10b981',
    twBg: 'bg-emerald-500/8',
    twBorder: 'border-emerald-500/20',
    label: 'Offer',
    pill: 'bg-emerald-500/15 text-emerald-300',
  },
  rejection: {
    icon: <XCircle size={12} />,
    color: '#ef4444',
    twBg: 'bg-red-500/8',
    twBorder: 'border-red-500/20',
    label: 'Rejection',
    pill: 'bg-red-500/15 text-red-300',
  },
  interview: {
    icon: <Briefcase size={12} />,
    color: '#8b5cf6',
    twBg: 'bg-purple-500/8',
    twBorder: 'border-purple-500/20',
    label: 'Interview',
    pill: 'bg-purple-500/15 text-purple-300',
  },
  application: {
    icon: <CheckCircle size={12} />,
    color: '#3b82f6',
    twBg: 'bg-blue-500/8',
    twBorder: 'border-blue-500/20',
    label: 'Application',
    pill: 'bg-blue-500/15 text-blue-300',
  },
  general: {
    icon: <Mail size={12} />,
    color: '#6b7280',
    twBg: 'bg-white/4',
    twBorder: 'border-white/8',
    label: 'Email',
    pill: 'bg-white/8 text-gray-400',
  },
}

export const ALL_CATEGORIES: Category[] = ['offer', 'interview', 'application', 'rejection', 'general']
