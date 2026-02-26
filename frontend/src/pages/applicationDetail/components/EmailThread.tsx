import { ExternalLink, Mail, Calendar } from 'lucide-react'
import type { EmailReference } from '../../../types/index.ts'
import { formatDateTime, relativeTime } from '../utils.ts'

const EmailThread = ({ emails }: { emails: EmailReference[] }) => {
  if (emails.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail size={28} className="text-gray-700 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No emails linked yet</p>
        <p className="text-gray-600 text-xs mt-1">Run a Gmail scan to automatically link emails to this application.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {emails
        .slice()
        .sort((a, b) => b.received_at.localeCompare(a.received_at))
        .map((email) => (
          <div key={email.id} className="border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{email.subject ?? '(No subject)'}</p>
                <div className="flex items-center gap-3 mt-1">
                  {email.sender && <span className="text-purple-400 text-xs truncate">{email.sender}</span>}
                  <span className="flex items-center gap-1 text-gray-500 text-xs shrink-0">
                    <Calendar size={11} />
                    {formatDateTime(email.received_at)}
                  </span>
                  <span className="text-gray-600 text-xs shrink-0">{relativeTime(email.received_at)}</span>
                </div>
              </div>
              <a
                href={`https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(email.gmail_message_id)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-gray-600 hover:text-purple-400 transition-colors shrink-0 mt-0.5"
                title="Open in Gmail"
              >
                <ExternalLink size={13} />
              </a>
            </div>
            {email.snippet && <p className="text-gray-500 text-xs mt-2 leading-relaxed line-clamp-2">{email.snippet}</p>}
          </div>
        ))}
    </div>
  )
}

export default EmailThread
