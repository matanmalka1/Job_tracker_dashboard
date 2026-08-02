import { Mail, RefreshCw } from 'lucide-react'

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
  done: boolean
  scanError: string | null
  scanning: boolean
}

const ScannerCardHeader = ({
  activeStage,
  accent,
  autoScanEnabled,
  autoScanIntervalHours,
  done,
  scanError,
  scanning,
}: Props) => (
  <div
    className="px-6 py-4 flex items-center justify-between border-b transition-colors duration-700"
    style={{ borderColor: scanning ? `${accent}18` : 'var(--border)', background: 'var(--bg-raised)' }}
  >
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500"
        style={{ background: `${accent}15`, border: `1px solid ${accent}28` }}
      >
        <Mail size={15} style={{ color: accent }} />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-t1 text-sm font-semibold">Gmail Scanner</p>
          {autoScanEnabled && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-widest"
              style={{ background: '#a78bfa15', border: '1px solid #a78bfa30', color: '#a78bfa' }}
            >
              <RefreshCw size={8} />
              every {autoScanIntervalHours % 1 === 0 ? autoScanIntervalHours.toFixed(0) : autoScanIntervalHours}h
            </span>
          )}
        </div>
        <p className="text-t3 text-[11px] mt-px font-mono">
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
)

export default ScannerCardHeader
