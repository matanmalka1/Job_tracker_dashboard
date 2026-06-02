import { Button, Input } from '@/shared/components/ui'
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
      <Input
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        disabled={locked}
        spellCheck={false}
        placeholder="/job-tracker/scan/progress"
        className="flex-1 font-mono"
      />
      {PRESETS.map((preset) => (
        <Button
          key={preset.url}
          onClick={() => onUrlChange(preset.url)}
          disabled={locked}
          variant="secondary"
          size="sm"
          className="h-auto py-2 text-[11px] font-mono whitespace-nowrap"
          title={preset.url}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}

export default LiveLoggerControls
