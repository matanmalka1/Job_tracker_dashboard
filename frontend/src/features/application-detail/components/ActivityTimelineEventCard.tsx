import { useState } from 'react'
import { ChevronDown, Clock, ExternalLink } from 'lucide-react'
import { formatDateTime, formatRelativeTime } from '../../../shared/utils/date.ts'
import type { TimelineEvent } from '../utils/activityTimeline.tsx'

interface ActivityTimelineEventCardProps {
  event: TimelineEvent
  isLast: boolean
  delay: number
}

const ActivityTimelineEventCard = ({ event, isLast, delay }: ActivityTimelineEventCardProps) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="flex gap-3"
      style={{
        animation: 'evIn 0.25s ease-out both',
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex flex-col items-center shrink-0">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-150 hover:scale-110 focus:outline-none"
          style={{
            background: `${event.color}15`,
            borderColor: `${event.color}35`,
            color: event.color,
            boxShadow: expanded ? `0 0 0 3px ${event.color}20` : 'none',
          }}
        >
          {event.icon}
        </button>
        {!isLast && (
          <div
            className="w-px mt-1 flex-1 min-h-[20px]"
            style={{
              background: `linear-gradient(to bottom, ${event.color}25 0%, transparent 100%)`,
            }}
          />
        )}
      </div>

      <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-3'}`}>
        <div
          className={`rounded-lg border overflow-hidden transition-all duration-200 cursor-pointer hover:border-white/12 ${event.cardBg} ${event.cardBorder}`}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-start gap-2 px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-t1 text-sm font-medium truncate">{event.label}</p>
                {event.sublabel && (
                  <span
                    className="shrink-0 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                    style={{
                      background: `${event.color}18`,
                      color: event.color,
                    }}
                  >
                    {event.sublabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-t2 text-xs flex items-center gap-1">
                  <Clock size={10} />
                  {formatRelativeTime(event.date)}
                </span>
              </div>
            </div>
            <span
              className="text-t3 shrink-0 pt-0.5 transition-transform duration-150"
              style={{
                display: 'inline-block',
                transform: expanded ? 'rotate(180deg)' : 'none',
              }}
            >
              <ChevronDown size={13} />
            </span>
          </div>

          {expanded && (
            <div className="px-3 pb-3 pt-0 border-t space-y-2" style={{ borderColor: `${event.color}18` }}>
              {event.detail && <p className="text-t2 text-xs leading-relaxed pt-2">{event.detail}</p>}
              <div className="flex items-center justify-between pt-1">
                <span className="text-t3 text-[10px] font-mono">{formatDateTime(event.date)}</span>
                {event.gmailUrl && (
                  <a
                    href={event.gmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-[10px] font-medium text-t2 hover:text-purple-300 transition-colors"
                  >
                    Open in Gmail
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActivityTimelineEventCard
