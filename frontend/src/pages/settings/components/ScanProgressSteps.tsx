import { STAGE_LABELS, STAGE_ORDER } from '../constants'
import type { ScanProgressState } from '../types.ts'

interface Props {
  progress: ScanProgressState | null
  completedStages: string[]
}

const ScanProgressSteps = ({ progress, completedStages }: Props) => (
  <div className="border border-white/5 rounded-lg p-4 space-y-3">
    {STAGE_ORDER.filter((s) => s !== 'done').map((stage) => {
      const done = completedStages.includes(stage)
      const active = progress?.stage === stage

      return (
        <div key={stage} className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {done ? (
              <div className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
            ) : active ? (
              <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              </div>
            ) : (
              <div className="w-4 h-4 rounded-full bg-white/5 border border-white/10" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={[
                'text-sm font-medium',
                done ? 'text-green-400' : active ? 'text-white' : 'text-gray-600',
              ].join(' ')}
            >
              {STAGE_LABELS[stage]}
            </p>
            {active && progress?.detail && (
              <p className="text-gray-400 text-xs mt-0.5 truncate">{progress.detail}</p>
            )}
          </div>
        </div>
      )
    })}
  </div>
)

export default ScanProgressSteps
