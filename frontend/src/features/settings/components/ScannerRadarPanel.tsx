import { CheckCircle2, Clock, Mail, XCircle } from 'lucide-react'
import RadarCanvas from './RadarCanvas.tsx'
import type { Blip } from '../types.ts'
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
  currentStage: string | null
  done: boolean
  lastCompletedAt?: string | null
  runScan: () => void
  scanError: string | null
  scanning: boolean
  sweepRef: React.MutableRefObject<number>
}

const ScannerRadarPanel = ({
  activeStage,
  accent,
  blipsRef,
  currentStage,
  done,
  lastCompletedAt,
  runScan,
  scanError,
  scanning,
  sweepRef,
}: Props) => (
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
          <span className="font-mono text-[9px] text-t3 uppercase tracking-widest">Standby</span>
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
        background: scanning ? 'var(--bg-raised)' : `linear-gradient(135deg, ${accent}ee, ${accent}99)`,
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
      <span className="font-mono text-[10px] text-t3 flex items-center gap-1.5">
        <Clock size={9} />
        last {formatRelativeTime(lastCompletedAt)}
      </span>
    )}
  </div>
)

export default ScannerRadarPanel
