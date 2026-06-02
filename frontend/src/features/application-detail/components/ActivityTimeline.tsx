import { Clock } from 'lucide-react'
import type { JobApplication } from '../../../shared/types/job-tracker.ts'
import ActivityTimelineEventCard from './ActivityTimelineEventCard.tsx'
import { buildTimelineEvents } from '../utils/activityTimeline.tsx'

const ActivityTimeline = ({ app }: { app: JobApplication }) => {
  const events = buildTimelineEvents(app)

  return (
    <>
      <style>{`
        @keyframes evIn {
          from { opacity: 0; transform: translateX(-5px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="bg-surface border border-DEFAULT rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={16} className="text-t2" />
          <h2 className="text-t1 font-semibold text-sm">Activity</h2>
          {events.length > 0 && (
            <span className="text-t3 text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded-full ml-1">
              {events.length}
            </span>
          )}
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/8 flex items-center justify-center">
              <Clock size={16} className="text-t3" />
            </div>
            <p className="text-t2 text-sm">No activity recorded yet.</p>
          </div>
        ) : (
          <div>
            {events.map((event, index) => (
              <ActivityTimelineEventCard
                key={event.id}
                event={event}
                isLast={index === events.length - 1}
                delay={index * 60}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default ActivityTimeline
