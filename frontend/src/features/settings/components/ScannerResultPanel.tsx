import { CheckCircle2, XCircle } from 'lucide-react'
import EventTerminal from '../../../shared/components/feedback/EventTerminal.tsx'
import StageNodes from './StageNodes.tsx'
import { HistoryPlaceholder } from './HistoryRow.tsx'
import type { LogLine, ScanResultState } from '../types.ts'

interface Props {
  completedStages: string[]
  currentStage: string | null
  done: boolean
  hasScanState: boolean
  logLines: LogLine[]
  result: ScanResultState | null
  scanError: string | null
  scanning: boolean
}

const ScannerResultPanel = ({
  completedStages,
  currentStage,
  done,
  hasScanState,
  logLines,
  result,
  scanError,
  scanning,
}: Props) => (
  <div className="flex-1 min-w-0 flex flex-col gap-4">
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
      <p className="font-mono text-[9px] text-t3 uppercase tracking-widest mb-4">Pipeline</p>
      <StageNodes currentStage={currentStage} completedStages={completedStages} scanning={scanning} />
    </div>

    {hasScanState && <EventTerminal lines={logLines} live={scanning} />}

    {done && result && !scanError && (
      <div
        className="rounded-xl px-5 py-3.5 flex items-center gap-3"
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(52,211,153,0.20)' }}
      >
        <CheckCircle2 size={15} color="#34d399" className="shrink-0" />
        <div>
          <p className="text-green-300 text-sm font-semibold">
            {result.applications_created > 0 || result.inserted > 0
              ? `${result.applications_created} new app${result.applications_created !== 1 ? 's' : ''} · ${result.inserted} email${result.inserted !== 1 ? 's' : ''} saved`
              : 'Inbox is already up to date'}
          </p>
          <p className="text-green-700 text-xs mt-px font-mono">Scan completed successfully</p>
        </div>
      </div>
    )}

    {scanError && (
      <div
        className="rounded-xl px-5 py-3.5 flex items-center gap-3"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(248,113,113,0.20)' }}
      >
        <XCircle size={15} color="#f87171" className="shrink-0" />
        <p className="text-red-300 text-sm">{scanError}</p>
      </div>
    )}

    {!hasScanState && <HistoryPlaceholder />}
  </div>
)

export default ScannerResultPanel
