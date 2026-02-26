import type { JobApplication } from '../../../types/index.ts'
import { formatDate, relativeTime } from '../utils.ts'

const StatsGrid = ({ app }: { app: JobApplication }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
    <div>
      <p className="text-gray-500 text-xs mb-1">Applied</p>
      <p className="text-white text-sm">{formatDate(app.applied_at)}</p>
    </div>
    <div>
      <p className="text-gray-500 text-xs mb-1">Created</p>
      <p className="text-white text-sm">{formatDate(app.created_at)}</p>
    </div>
    <div>
      <p className="text-gray-500 text-xs mb-1">Last Updated</p>
      <p className="text-white text-sm">{relativeTime(app.updated_at)}</p>
    </div>
    {app.confidence_score != null && (
      <div>
        <p className="text-gray-500 text-xs mb-1">Confidence</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${Math.round(app.confidence_score * 100)}%` }}
            />
          </div>
          <span className="text-white text-sm shrink-0">{Math.round(app.confidence_score * 100)}%</span>
        </div>
      </div>
    )}
    {app.next_action_at && (
      <div>
        <p className="text-gray-500 text-xs mb-1">Follow-up</p>
        <p className="text-yellow-400 text-sm">{formatDate(app.next_action_at)}</p>
      </div>
    )}
  </div>
)

export default StatsGrid
