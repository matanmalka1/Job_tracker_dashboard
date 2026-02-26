import { Clock } from 'lucide-react'
import type { JobApplication } from '../../../types/index.ts'
import { formatDateTime } from '../utils.ts'

const ActivityTimeline = ({ app }: { app: JobApplication }) => (
  <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-6">
    <div className="flex items-center gap-2 mb-5">
      <Clock size={16} className="text-gray-400" />
      <h2 className="text-white font-semibold text-sm">Activity</h2>
    </div>
    <div className="space-y-4">
      {app.applied_at && (
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-6 h-6 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          </div>
          <div>
            <p className="text-gray-300 text-sm">Applied</p>
            <p className="text-gray-500 text-xs mt-0.5">{formatDateTime(app.applied_at)}</p>
          </div>
        </div>
      )}
      {app.last_email_at && (
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-6 h-6 rounded-full bg-purple-600/20 border border-purple-600/30 flex items-center justify-center mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          </div>
          <div>
            <p className="text-gray-300 text-sm">Last email received</p>
            <p className="text-gray-500 text-xs mt-0.5">{formatDateTime(app.last_email_at)}</p>
          </div>
        </div>
      )}
      {app.source === 'Gmail' && (
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          </div>
          <div>
            <p className="text-gray-300 text-sm">Detected via Gmail scan</p>
            <p className="text-gray-500 text-xs mt-0.5">{formatDateTime(app.created_at)}</p>
          </div>
        </div>
      )}
    </div>
  </div>
)

export default ActivityTimeline
