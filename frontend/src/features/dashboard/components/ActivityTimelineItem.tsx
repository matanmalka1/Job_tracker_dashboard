import { useState } from 'react'
import { ChevronDown, Clock, ExternalLink } from 'lucide-react'
import type { EmailReference } from '../../../shared/types/job-tracker.ts'
import {
  CATEGORY_CONFIG,
  categorize,
  extractName,
  formatFull,
  formatRelative,
} from './activityTimelineModel.tsx'

interface Props {
  email: EmailReference
  isLast: boolean
  delay: number
}

const ActivityTimelineItem = ({ email, isLast, delay }: Props) => {
  const [expanded, setExpanded] = useState(false)
  const category = categorize(email)
  const config = CATEGORY_CONFIG[category]
  const gmailUrl = `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(email.gmail_message_id)}`

  return (
    <div className="flex gap-3" style={{ animation: 'tlIn 0.28s ease-out both', animationDelay: `${delay}ms` }}>
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <button
          onClick={() => setExpanded((value) => !value)}
          className="w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-150 hover:scale-110 focus:outline-none"
          style={{
            background: `${config.color}15`,
            borderColor: `${config.color}35`,
            color: config.color,
            boxShadow: expanded ? `0 0 0 3px ${config.color}20` : 'none',
          }}
          title={`${config.label} — click to ${expanded ? 'collapse' : 'expand'}`}
        >
          {config.icon}
        </button>
        {!isLast && (
          <div
            className="w-px mt-1 flex-1 min-h-[16px]"
            style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 100%)' }}
          />
        )}
      </div>

      <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-3'}`}>
        <div
          className={`rounded-lg border overflow-hidden transition-all duration-200 cursor-pointer hover:border-white/12 ${config.twBg} ${config.twBorder}`}
          onClick={() => setExpanded((value) => !value)}
        >
          <div className="flex items-start gap-2 px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white text-sm font-medium leading-snug truncate">
                  {email.subject ?? '(No subject)'}
                </p>
                <span className={`shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${config.pill}`}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-medium truncate" style={{ color: config.color }}>
                  {extractName(email.sender)}
                </span>
                <span className="text-gray-700 text-xs">·</span>
                <span className="text-gray-500 text-xs flex items-center gap-1 shrink-0">
                  <Clock size={10} />
                  {formatRelative(email.received_at)}
                </span>
                {email.application_id != null && (
                  <>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">linked</span>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
              <span
                className="text-gray-600 transition-transform duration-150"
                style={{ transform: expanded ? 'rotate(180deg)' : 'none', display: 'inline-block' }}
              >
                <ChevronDown size={13} />
              </span>
            </div>
          </div>

          {expanded && (
            <div className="px-3 pb-3 pt-0 border-t space-y-2" style={{ borderColor: `${config.color}18` }}>
              {email.snippet && <p className="text-gray-400 text-xs leading-relaxed pt-2">{email.snippet}</p>}
              <div className="flex items-center justify-between pt-1">
                <div className="text-gray-600 text-[10px] font-mono">{formatFull(email.received_at)}</div>
                <a
                  href={gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="flex items-center gap-1 text-[10px] font-medium transition-colors hover:text-purple-300 text-gray-500"
                >
                  Open in Gmail
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActivityTimelineItem
