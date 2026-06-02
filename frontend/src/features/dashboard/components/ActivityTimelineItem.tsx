import { useState } from 'react'

const decodeHtmlEntities = (str: string): string => {
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}
import { ChevronDown, ExternalLink } from 'lucide-react'
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
  const cfg = CATEGORY_CONFIG[category]
  const gmailUrl = `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(email.gmail_message_id)}`

  return (
    <div className="flex gap-3 animate-tl-in" style={{ animationDelay: `${delay}ms` }}>
      {/* track */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="tl-dot"
          style={{ background: cfg.color }}
        />
        {!isLast && <div className="w-px flex-1 min-h-4 mt-1.5" style={{ background: 'var(--border)' }} />}
      </div>

      {/* card */}
      <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-3'}`}>
        <div
          className="tl-card"
          style={expanded ? { background: 'var(--bg-hover)', borderColor: `${cfg.color}28` } : undefined}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-start gap-2.5 px-3 py-2.5">
            {/* category tag */}
            <span
              className="cat-tag mt-0.5"
              style={{
                color: cfg.color,
                background: `${cfg.color}15`,
                borderColor: `${cfg.color}25`,
              }}
            >
              {cfg.label}
            </span>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-[13px] truncate m-0" style={{ color: 'var(--text-1)' }}>
                {email.subject ?? '(No subject)'}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[12px]" style={{ color: cfg.color }}>
                  {extractName(email.sender)}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {formatRelative(email.received_at)}
                </span>
                {email.application_id != null && (
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-3)' }}
                  >
                    Linked
                  </span>
                )}
              </div>
            </div>

            <ChevronDown
              size={13}
              className="shrink-0 mt-0.5 transition-transform duration-150"
              style={{ color: 'var(--text-3)', transform: expanded ? 'rotate(180deg)' : 'none' }}
            />
          </div>

          {expanded && (
            <div
              className="px-3 pb-3 pt-0"
              style={{ borderTop: `1px solid ${cfg.color}18` }}
            >
              {email.snippet && (
                <p
                  className="text-[12px] leading-relaxed pt-2.5 m-0"
                  style={{ color: 'var(--text-2)' }}
                >{decodeHtmlEntities(email.snippet)}</p>
              )}
              <div className="flex items-center justify-between pt-2.5">
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  {formatFull(email.received_at)}
                </span>
                <a
                  href={gmailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-[12px] font-medium no-underline transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  Open in Gmail <ExternalLink size={11} />
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
