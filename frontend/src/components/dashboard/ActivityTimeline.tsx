import type { EmailReference } from '../../types/index.ts'
import LoadingSpinner from '../ui/LoadingSpinner.tsx'

interface Props {
  emails: EmailReference[]
  isLoading: boolean
  isError: boolean
}

const formatRelative = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return new Date(iso).toLocaleDateString()
}

const extractDomain = (sender?: string): string => {
  if (!sender) return 'Unknown'
  const match = sender.match(/@([\w.-]+)/)
  return match ? match[1] : sender
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

const isJobEmail = (email: EmailReference): boolean => {
  if (email.application_id != null) return true
  const text = `${email.subject ?? ''} ${email.snippet ?? ''}`.toLowerCase()
  return JOB_KEYWORDS.some((kw) => text.includes(kw))
}

const ActivityTimeline = ({ emails, isLoading, isError }: Props) => {
  const filtered = emails.filter(isJobEmail)

  return (
    <div className="bg-[#1a1a24] rounded-xl p-5 border border-white/5 h-full">
      <h3 className="text-white font-semibold mb-4">Activity Timeline</h3>

      {isLoading && <LoadingSpinner size="sm" message="Loading emails..." />}

      {isError && (
        <p className="text-red-400 text-sm text-center py-4">
          Failed to load email activity.
        </p>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">No email activity yet.</p>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <ul className="space-y-4">
          {filtered.map((email) => (
            <li key={email.id} className="flex items-start gap-3">
              <div className="mt-2 w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-white text-base font-medium truncate">
                  {email.subject ?? '(No subject)'}
                </p>
                <p className="text-gray-400 text-sm mt-0.5">
                  from{' '}
                  <span className="text-purple-400 font-medium">
                    {extractDomain(email.sender)}
                  </span>
                </p>
                {email.snippet && (
                  <p className="text-gray-500 text-sm mt-0.5 truncate">{email.snippet}</p>
                )}
              </div>

              <span className="text-gray-500 text-sm shrink-0 mt-0.5">
                {formatRelative(email.received_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ActivityTimeline
