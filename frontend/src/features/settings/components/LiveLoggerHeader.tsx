import { Play, Radio, StopCircle, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components/ui'
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

        <Button
          onClick={isOpen ? onClose : onConnect}
          disabled={status === 'connecting'}
          size="sm"
          icon={isOpen ? <StopCircle size={13} /> : <Play size={13} />}
          className="h-auto py-1.5 text-xs font-semibold"
          style={{
            background: isOpen ? '#1f2937' : '#4f46e5',
            color: '#fff',
            border: '1px solid #ffffff14',
          }}
        >
          {isOpen ? 'Stop' : 'Start'}
        </Button>

        <Button
          onClick={onClear}
          variant="secondary"
          size="sm"
          icon={<Trash2 size={13} />}
          className="h-auto py-1.5 text-xs font-semibold"
        >
          Clear
        </Button>
      </div>
    </div>
  )
}

export default LiveLoggerHeader
