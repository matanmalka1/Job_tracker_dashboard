import { STAGES } from '../constants'

interface Props {
  currentStage: string | null
  completedStages: string[]
  scanning: boolean
}

const StageNodes = ({ currentStage, completedStages, scanning }: Props) => (
  <div className="flex items-start gap-0 w-full">
    {STAGES.map((stage, i) => {
      const isDone = completedStages.includes(stage.key)
      const isActive = currentStage === stage.key
      return (
        <div key={stage.key} className="flex-1 flex flex-col items-center gap-2 relative">
          {i < STAGES.length - 1 && (
            <div className="absolute top-[13px] left-1/2 w-full h-px" style={{ zIndex: 0 }}>
              <div
                className="h-full transition-all duration-700"
                style={{
                  background: isDone
                    ? `linear-gradient(90deg, ${stage.color}, ${STAGES[i + 1].color})`
                    : '#1e2433',
                }}
              />
            </div>
          )}

          <div
            className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500"
            style={{
              background: isDone ? stage.color : isActive ? `${stage.color}18` : '#0f1118',
              border: `1.5px solid ${isDone || isActive ? stage.color : '#1e2433'}`,
              boxShadow: isActive ? `0 0 16px ${stage.color}70, 0 0 32px ${stage.color}25` : 'none',
            }}
          >
            {isDone ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6l3 3 5-5"
                  stroke="#000"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : isActive && scanning ? (
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: stage.color }} />
            ) : (
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isDone || isActive ? stage.color : '#1e2433' }}
              />
            )}
            {isActive && scanning && (
              <div
                className="absolute inset-0 rounded-full animate-ping opacity-30"
                style={{ border: `1px solid ${stage.color}` }}
              />
            )}
          </div>

          <div className="flex flex-col items-center gap-0.5">
            <span
              className="text-[9px] font-mono uppercase tracking-wider transition-colors duration-300"
              style={{ color: isDone || isActive ? stage.color : '#2d3748' }}
            >
              {stage.label}
            </span>
          </div>
        </div>
      )
    })}
  </div>
)

export default StageNodes
