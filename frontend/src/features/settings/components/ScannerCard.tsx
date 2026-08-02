import ScannerCardHeader from './ScannerCardHeader.tsx'
import ScannerRadarPanel from './ScannerRadarPanel.tsx'
import ScannerResultPanel from './ScannerResultPanel.tsx'
import type { Blip, LogLine, ScanResultState } from '../types.ts'

type Stage = {
  key: string
  label: string
  desc: string
  color: string
}

interface Props {
  activeStage?: Stage
  accent: string
  autoScanEnabled: boolean
  autoScanIntervalHours: number
  blipsRef: React.MutableRefObject<Blip[]>
  completedStages: string[]
  currentStage: string | null
  done: boolean
  hasScanState: boolean
  lastCompletedAt?: string | null
  logLines: LogLine[]
  result: ScanResultState | null
  runScan: () => void
  scanError: string | null
  scanning: boolean
  sweepRef: React.MutableRefObject<number>
}

const ScannerCard = ({
  activeStage,
  accent,
  autoScanEnabled,
  autoScanIntervalHours,
  blipsRef,
  completedStages,
  currentStage,
  done,
  hasScanState,
  lastCompletedAt,
  logLines,
  result,
  runScan,
  scanError,
  scanning,
  sweepRef,
}: Props) => (
  <div
    className="rounded-2xl overflow-hidden transition-all duration-700"
    style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${scanning ? accent + '28' : 'var(--border)'}`,
      boxShadow: scanning ? `0 0 80px ${accent}0c` : 'none',
    }}
  >
    <ScannerCardHeader
      activeStage={activeStage}
      accent={accent}
      autoScanEnabled={autoScanEnabled}
      autoScanIntervalHours={autoScanIntervalHours}
      done={done}
      scanError={scanError}
      scanning={scanning}
    />

    <div className="p-6">
      <div className="flex flex-col xl:flex-row gap-8">
        <ScannerRadarPanel
          activeStage={activeStage}
          accent={accent}
          blipsRef={blipsRef}
          currentStage={currentStage}
          done={done}
          lastCompletedAt={lastCompletedAt}
          runScan={runScan}
          scanError={scanError}
          scanning={scanning}
          sweepRef={sweepRef}
        />

        <ScannerResultPanel
          completedStages={completedStages}
          currentStage={currentStage}
          done={done}
          hasScanState={hasScanState}
          logLines={logLines}
          result={result}
          scanError={scanError}
          scanning={scanning}
        />
      </div>
    </div>
  </div>
)

export default ScannerCard
