import { Play, Radio, StopCircle, Trash2 } from 'lucide-react'
import type { LiveLoggerStatus } from '../hooks/useLiveLogger.ts'

const STATUS_DOT: Record<LiveLoggerStatus, string> = {
  idle: '#475569',
  connecting: '#38bdf8',
  open: '#34d399',
  error: '#f87171',
}

const STATUS_LABEL: Record<LiveLoggerStatus, string> = {
  idle: 'Idle',
  connecting: 'Connecting...',
  open: 'Live',
  error: 'Error',
}

interface LiveLoggerHeaderProps {
  url: string
  status: LiveLoggerStatus
  onConnect: () => void
  onClose: () => void
  onClear: () => void
}

const LiveLoggerHeader = ({ url, status, onConnect, onClose, onClear }: LiveLoggerHeaderProps) => {
  const dotColor = STATUS_DOT[status]
  const isOpen = status === 'open'

  return (
    <div
      className="px-5 py-4 flex items-center justify-between border-b gap-4"
      style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-hover)' }}>
          <Radio size={15} className="text-purple-300" />
        </div>
        <div className="min-w-0">
          <p className="text-t1 text-sm font-semibold">SSE Stream</p>
          <p className="text-t3 text-[11px] font-mono mt-px truncate max-w-[260px]">{url}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-widest"
          style={{ background: `${dotColor}12`, border: `1px solid ${dotColor}28`, color: dotColor }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: dotColor, animation: isOpen ? 'pulse 1s ease-in-out infinite' : 'none' }}
          />
          {STATUS_LABEL[status]}
        </div>

        <button
          onClick={isOpen ? onClose : onConnect}
          disabled={status === 'connecting'}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: isOpen ? '#1f2937' : '#4f46e5',
            color: '#fff',
            border: '1px solid #ffffff14',
          }}
        >
          {isOpen ? <StopCircle size={13} /> : <Play size={13} />}
          {isOpen ? 'Stop' : 'Start'}
        </button>

        <button
          onClick={onClear}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-t2 hover:text-t1 transition-colors"
          style={{ background: 'var(--bg-hover)', border: '1px solid #ffffff10' }}
        >
          <Trash2 size={13} />
          Clear
        </button>
      </div>
    </div>
  )
}

export default LiveLoggerHeader
