import type { ScanRun } from '../../../types/index.ts'
import formatRelative from '../formatRelative'

const ScanHistoryRow = ({ run }: { run: ScanRun }) => {
  const isOk = run.status === 'completed'
  const isFail = run.status === 'failed'

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div
        className={[
          'shrink-0 w-2 h-2 rounded-full',
          isOk ? 'bg-green-400' : isFail ? 'bg-red-400' : 'bg-blue-400 animate-pulse',
        ].join(' ')}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-white text-xs font-medium capitalize">{run.status}</span>
          {isOk && (
            <span className="text-gray-400 text-xs">
              {run.emails_inserted ?? 0} emails · {run.apps_created ?? 0} apps created
            </span>
          )}
          {isFail && run.error && (
            <span className="text-red-400 text-xs truncate">{run.error}</span>
          )}
        </div>
      </div>
      <span className="text-gray-600 text-xs shrink-0">
        {run.completed_at ? formatRelative(run.completed_at) : formatRelative(run.started_at)}
      </span>
    </div>
  )
}

export default ScanHistoryRow
