import { Clock, Inbox } from 'lucide-react'
import type { ScanRun } from '../../../types'
import { relativeTime } from '../formatRelative'

const HistoryRow = ({ run }: { run: ScanRun }) => {
  const ok = run.status === 'completed'
  const fail = run.status === 'failed'
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0">
      <div
        className={[
          'w-1.5 h-1.5 rounded-full shrink-0',
          ok ? 'bg-green-400' : fail ? 'bg-red-400' : 'bg-blue-400 animate-pulse',
        ].join(' ')}
      />
      <span className="font-mono text-xs text-gray-400 capitalize">{run.status}</span>
      {ok && (
        <span className="font-mono text-xs text-gray-600">
          {run.emails_inserted ?? 0} emails · {run.apps_created ?? 0} apps
        </span>
      )}
      {fail && run.error && (
        <span className="font-mono text-xs text-red-400 truncate max-w-[260px]">{run.error}</span>
      )}
      <span className="ml-auto font-mono text-xs text-gray-600 shrink-0">
        {relativeTime(run.completed_at ?? run.started_at)}
      </span>
    </div>
  )
}

export const HistoryPlaceholder = () => (
  <div
    className="rounded-xl px-5 py-4 flex items-center gap-3"
    style={{ background: '#0a0a16', border: '1px solid #ffffff06' }}
  >
    <Inbox size={14} className="text-gray-700 shrink-0" />
    <p className="font-mono text-[11px] text-gray-600">
      Scan your Gmail inbox to automatically discover job emails and create application records.
    </p>
  </div>
)

export const HistoryHeader = ({ count }: { count: number }) => (
  <div className="flex items-center gap-2 mb-4">
    <Clock size={13} className="text-gray-600" />
    <h2 className="text-white text-sm font-semibold">Scan History</h2>
    <span className="ml-auto font-mono text-[10px] text-gray-600">last {count} runs</span>
  </div>
)

export default HistoryRow
