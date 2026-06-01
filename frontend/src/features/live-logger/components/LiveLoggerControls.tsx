import type { LiveLoggerStatus } from '../hooks/useLiveLogger.ts'

const PRESETS = [
  { label: 'Scan progress', url: '/job-tracker/scan/progress' },
]

interface LiveLoggerControlsProps {
  url: string
  status: LiveLoggerStatus
  onUrlChange: (url: string) => void
}

const LiveLoggerControls = ({ url, status, onUrlChange }: LiveLoggerControlsProps) => {
  const locked = status === 'open' || status === 'connecting'

  return (
    <div className="flex items-center gap-2">
      <input
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        disabled={locked}
        spellCheck={false}
        placeholder="/job-tracker/scan/progress"
        className="flex-1 rounded-lg bg-[#0a0a16] border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50 font-mono"
      />
      {PRESETS.map((preset) => (
        <button
          key={preset.url}
          onClick={() => onUrlChange(preset.url)}
          disabled={locked}
          className="px-2.5 py-2 rounded-lg text-[11px] font-mono text-gray-400 hover:text-white transition-colors disabled:opacity-40 whitespace-nowrap"
          style={{ background: '#1b1b2a', border: '1px solid #ffffff0a' }}
          title={preset.url}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}

export default LiveLoggerControls
