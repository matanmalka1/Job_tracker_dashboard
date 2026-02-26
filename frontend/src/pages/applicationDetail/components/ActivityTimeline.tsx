import { useState } from "react";
import {
  Clock,
  CheckCircle,
  Mail,
  Zap,
  Bell,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import type { JobApplication } from "../../../types/index.ts";
import { formatDateTime } from "../utils.ts";

interface TimelineEvent {
  id: string;
  label: string;
  sublabel?: string;
  date: string;
  icon: React.ReactNode;
  color: string;
  glow: string;
  cardBg: string;
  cardBorder: string;
  detail?: string;
  gmailUrl?: string;
}

const formatRelative = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
};

const buildEvents = (app: JobApplication): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  if (app.applied_at) {
    events.push({
      id: "applied",
      label: "Applied",
      sublabel: app.source ? `via ${app.source}` : undefined,
      date: app.applied_at,
      icon: <CheckCircle size={13} />,
      color: "#3b82f6",
      glow: "rgba(59,130,246,0.35)",
      cardBg: "bg-blue-500/8",
      cardBorder: "border-blue-500/20",
      detail: app.role_title
        ? `Applied for ${app.role_title} at ${app.company_name}`
        : `Applied to ${app.company_name}`,
    });
  }

  if (app.source === "Gmail" && app.created_at) {
    events.push({
      id: "detected",
      label: "Detected via Gmail",
      sublabel: "Auto-created by scanner",
      date: app.created_at,
      icon: <Zap size={13} />,
      color: "#f59e0b",
      glow: "rgba(245,158,11,0.35)",
      cardBg: "bg-amber-500/8",
      cardBorder: "border-amber-500/20",
      detail:
        "This application was auto-created when a matching email was found in your Gmail inbox.",
    });
  }

  if (app.last_email_at) {
    const emailCount = app.email_count;
    events.push({
      id: "last-email",
      label: "Last email received",
      sublabel: emailCount > 1 ? `${emailCount} emails total` : "1 email",
      date: app.last_email_at,
      icon: <Mail size={13} />,
      color: "#8b5cf6",
      glow: "rgba(139,92,246,0.35)",
      cardBg: "bg-purple-500/8",
      cardBorder: "border-purple-500/20",
      detail: "Most recent email in this thread.",
    });
  }

  if (app.next_action_at) {
    const isOverdue = new Date(app.next_action_at) < new Date();
    events.push({
      id: "follow-up",
      label: isOverdue ? "Follow-up overdue" : "Follow-up scheduled",
      sublabel: isOverdue ? "Action required" : undefined,
      date: app.next_action_at,
      icon: <Bell size={13} />,
      color: isOverdue ? "#ef4444" : "#f59e0b",
      glow: isOverdue ? "rgba(239,68,68,0.35)" : "rgba(245,158,11,0.35)",
      cardBg: isOverdue ? "bg-red-500/8" : "bg-amber-500/8",
      cardBorder: isOverdue ? "border-red-500/20" : "border-amber-500/20",
      detail: isOverdue
        ? `Follow-up was due on ${formatDateTime(app.next_action_at)}.`
        : `Scheduled follow-up on ${formatDateTime(app.next_action_at)}.`,
    });
  }

  // Sort: newest first
  return events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
};

// ─── Event card ──────────────────────────────────────────────────────────────

const EventCard = ({
  event,
  isLast,
  delay,
}: {
  event: TimelineEvent;
  isLast: boolean;
  delay: number;
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="flex gap-3"
      style={{
        animation: "evIn 0.25s ease-out both",
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Dot + rail */}
      <div className="flex flex-col items-center shrink-0">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-150 hover:scale-110 focus:outline-none"
          style={{
            background: `${event.color}15`,
            borderColor: `${event.color}35`,
            color: event.color,
            boxShadow: expanded ? `0 0 0 3px ${event.color}20` : "none",
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

      {/* Card */}
      <div className={`flex-1 min-w-0 ${isLast ? "pb-0" : "pb-3"}`}>
        <div
          className={`rounded-lg border overflow-hidden transition-all duration-200 cursor-pointer hover:border-white/12 ${event.cardBg} ${event.cardBorder}`}
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-start gap-2 px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-medium truncate">
                  {event.label}
                </p>
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
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <Clock size={10} />
                  {formatRelative(event.date)}
                </span>
              </div>
            </div>
            <span
              className="text-gray-600 shrink-0 pt-0.5 transition-transform duration-150"
              style={{
                display: "inline-block",
                transform: expanded ? "rotate(180deg)" : "none",
              }}
            >
              <ChevronDown size={13} />
            </span>
          </div>

          {expanded && (
            <div
              className="px-3 pb-3 pt-0 border-t space-y-2"
              style={{ borderColor: `${event.color}18` }}
            >
              {event.detail && (
                <p className="text-gray-400 text-xs leading-relaxed pt-2">
                  {event.detail}
                </p>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-gray-600 text-[10px] font-mono">
                  {formatDateTime(event.date)}
                </span>
                {event.gmailUrl && (
                  <a
                    href={event.gmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-purple-300 transition-colors"
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
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ActivityTimeline = ({ app }: { app: JobApplication }) => {
  const events = buildEvents(app);

  return (
    <>
      <style>{`
        @keyframes evIn {
          from { opacity: 0; transform: translateX(-5px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={16} className="text-gray-400" />
          <h2 className="text-white font-semibold text-sm">Activity</h2>
          {events.length > 0 && (
            <span className="text-gray-600 text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded-full ml-1">
              {events.length}
            </span>
          )}
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/8 flex items-center justify-center">
              <Clock size={16} className="text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">No activity recorded yet.</p>
          </div>
        ) : (
          <div>
            {events.map((event, i) => (
              <EventCard
                key={event.id}
                event={event}
                isLast={i === events.length - 1}
                delay={i * 60}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ActivityTimeline;
