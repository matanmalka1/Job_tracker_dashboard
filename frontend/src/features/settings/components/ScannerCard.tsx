import { CheckCircle2, Clock, Mail, XCircle } from 'lucide-react'
import EventTerminal from '../../../shared/components/feedback/EventTerminal.tsx'
import RadarCanvas from './RadarCanvas.tsx'
import StageNodes from './StageNodes.tsx'
import { HistoryPlaceholder } from './HistoryRow.tsx'
import type { Blip, LogLine, ScanResultState } from '../types.ts'
import { formatRelativeTime } from '../../../shared/utils/date.ts'

type Stage = {
  key: string
  label: string
  desc: string
  color: string
}

interface Props {
  activeStage?: Stage
  accent: string
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
      background: '#0e0e1a',
      border: `1px solid ${scanning ? accent + '28' : '#ffffff0a'}`,
      boxShadow: scanning ? `0 0 80px ${accent}0c` : 'none',
    }}
  >
    <div
      className="px-6 py-4 flex items-center justify-between border-b transition-colors duration-700"
      style={{ borderColor: scanning ? `${accent}18` : '#ffffff07', background: '#0b0b16' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500"
          style={{ background: `${accent}15`, border: `1px solid ${accent}28` }}
        >
          <Mail size={15} style={{ color: accent }} />
        </div>
        <div>
          <p className="text-white text-sm font-semibold">Gmail Scanner</p>
          <p className="text-gray-600 text-[11px] mt-px font-mono">
            {scanning && activeStage ? activeStage.desc : 'Scan inbox for job applications'}
          </p>
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[10px] uppercase tracking-widest"
        style={{
          background: `${accent}10`,
          border: `1px solid ${accent}22`,
          color: accent,
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: accent,
            animation: scanning ? 'pulse 1s ease-in-out infinite' : 'none',
            opacity: scanning ? 1 : 0.4,
          }}
        />
        {scanning ? 'scanning' : done ? 'complete' : scanError ? 'failed' : 'ready'}
      </div>
    </div>

    <div className="p-6">
      <div className="flex flex-col xl:flex-row gap-8">
        <div className="shrink-0 flex flex-col items-center gap-5">
          <div className="relative">
            {scanning && (
              <>
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ border: `1px solid ${accent}28`, animation: 'ringOut 2.4s ease-out infinite' }}
                />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ border: `1px solid ${accent}18`, animation: 'ringOut 2.4s ease-out 0.9s infinite' }}
                />
              </>
            )}

            <RadarCanvas
              scanning={scanning}
              stageKey={currentStage}
              done={done}
              failed={!!scanError}
              blipsRef={blipsRef}
              sweepRef={sweepRef}
            />

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none gap-1.5">
              {done && !scanError && (
                <>
                  <CheckCircle2 size={24} color="#34d399" />
                  <span className="font-mono text-[9px] text-green-400 uppercase tracking-widest">Done</span>
                </>
              )}
              {scanError && (
                <>
                  <XCircle size={24} color="#f87171" />
                  <span className="font-mono text-[9px] text-red-400 uppercase tracking-widest">Failed</span>
                </>
              )}
              {!done && !scanError && !scanning && (
                <span className="font-mono text-[9px] text-gray-700 uppercase tracking-widest">Standby</span>
              )}
              {scanning && (
                <>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }} />
                  <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: accent }}>
                    {activeStage?.label ?? 'Scan'}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={runScan}
            disabled={scanning}
            className="relative px-7 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-300 disabled:cursor-not-allowed overflow-hidden"
            style={{
              background: scanning ? '#141424' : `linear-gradient(135deg, ${accent}ee, ${accent}99)`,
              color: scanning ? `${accent}cc` : '#000',
              border: `1px solid ${accent}${scanning ? '25' : '00'}`,
              boxShadow: scanning ? 'none' : `0 6px 28px ${accent}45`,
            }}
          >
            {scanning && (
              <div
                className="absolute inset-0 translate-x-[-100%]"
                style={{
                  background: `linear-gradient(90deg,transparent,${accent}18,transparent)`,
                  animation: 'shimmer 1.8s linear infinite',
                }}
              />
            )}
            <span className="relative flex items-center gap-2.5">
              {scanning ? (
                <>
                  <div
                    className="w-3.5 h-3.5 rounded-full border-2 border-transparent border-t-current animate-spin"
                    style={{ borderTopColor: accent }}
                  />
                  Scanning...
                </>
              ) : (
                <>
                  <Mail size={14} />
                  {done || scanError ? 'Scan Again' : 'Run Scan'}
                </>
              )}
            </span>
          </button>

          {lastCompletedAt && !scanning && (
            <span className="font-mono text-[10px] text-gray-600 flex items-center gap-1.5">
              <Clock size={9} />
              last {formatRelativeTime(lastCompletedAt)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="rounded-xl p-4" style={{ background: '#0a0a16', border: '1px solid #ffffff07' }}>
            <p className="font-mono text-[9px] text-gray-700 uppercase tracking-widest mb-4">Pipeline</p>
            <StageNodes currentStage={currentStage} completedStages={completedStages} scanning={scanning} />
          </div>

          {hasScanState && <EventTerminal lines={logLines} live={scanning} />}

          {done && result && !scanError && (
            <div
              className="rounded-xl px-5 py-3.5 flex items-center gap-3"
              style={{ background: '#0b1e16', border: '1px solid #34d39928' }}
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
              style={{ background: '#1c0d0d', border: '1px solid #f8717128' }}
            >
              <XCircle size={15} color="#f87171" className="shrink-0" />
              <p className="text-red-300 text-sm">{scanError}</p>
            </div>
          )}

          {!hasScanState && <HistoryPlaceholder />}
        </div>
      </div>
    </div>
  </div>
)

export default ScannerCard
