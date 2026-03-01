import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { fetchScanHistory } from '../api/client.ts'
import RadarCanvas from './settings/components/RadarCanvas'
import StageNodes from './settings/components/StageNodes'
import Terminal from './settings/components/Terminal'
import HistoryRow, { HistoryHeader, HistoryPlaceholder } from './settings/components/HistoryRow'
import { STAGES } from './settings/constants'
import type { LogLine, Blip, ScanResultState } from './settings/types.ts'

// ─── Helpers ────────────────────────────────────────────────────────────────────

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

let _blipId = 0
const makeBlip = (angle?: number, radius?: number): Blip => ({
  id: _blipId++,
  angle: angle ?? Math.random() * Math.PI * 2,
  radius: radius ?? 28 + Math.random() * 102,
  alpha: angle != null ? 1 : 0,
  size: 1.2 + Math.random() * 2.2,
})

const seedBlips = (): Blip[] => Array.from({ length: 22 }, () => makeBlip())

// ─── Main page ────────────────────────────────────────────────────────────────────

const SettingsPage = () => {
  const queryClient = useQueryClient()

  const [scanning, setScanning] = useState(false)
  const [currentStage, setCurrentStage] = useState<string | null>(null)
  const [completedStages, setCompletedStages] = useState<string[]>([])
  const [logLines, setLogLines] = useState<LogLine[]>([])
  const [result, setResult] = useState<ScanResultState | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const blipsRef = useRef<Blip[]>(seedBlips())
  const sweepRef = useRef<number>(0)
  const esRef = useRef<EventSource | null>(null)
  const logIdRef = useRef(0)

  useEffect(() => () => esRef.current?.close(), [])

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['scan-history'],
    queryFn: fetchScanHistory,
    staleTime: 30_000,
  })

  const addLog = useCallback(
    (stage: string, detail: string, type: LogLine['type'] = 'info') => {
      setLogLines((p) => [...p, { id: logIdRef.current++, stage, detail, ts: Date.now(), type }])
    },
    [],
  )

  const spawnBlip = useCallback(() => {
    const angle = sweepRef.current + (Math.random() - 0.5) * 0.4
    blipsRef.current.push(makeBlip(angle, 24 + Math.random() * 108))
    if (blipsRef.current.length > 38) blipsRef.current.shift()
  }, [])

  const runScan = () => {
    if (scanning) return
    esRef.current?.close()

    setScanning(true)
    setCurrentStage(null)
    setCompletedStages([])
    setLogLines([])
    setResult(null)
    setScanError(null)
    setDone(false)
    blipsRef.current = seedBlips()
    sweepRef.current = 0

    addLog('sys', 'Initiating Gmail scan…', 'info')

    const es = new EventSource('/job-tracker/scan/progress')
    esRef.current = es

    es.onmessage = (e: MessageEvent<string>) => {
      if (!e.data?.trim() || e.data.trim() === '{}') return
      let ev: { stage: string; detail?: string; inserted?: number; applications_created?: number }
      try {
        ev = JSON.parse(e.data) as typeof ev
      } catch {
        return
      }

      const { stage, detail = '' } = ev

      if (stage === 'result') {
        const r: ScanResultState = {
          inserted: ev.inserted ?? 0,
          applications_created: ev.applications_created ?? 0,
        }
        setResult(r)
        setCompletedStages(STAGES.map((s) => s.key))
        setCurrentStage('done')
        setDone(true)
        setScanning(false)
        addLog('done', `${r.inserted} emails · ${r.applications_created} apps created`, 'success')
        queryClient.invalidateQueries({ queryKey: ['applications'] })
        queryClient.invalidateQueries({ queryKey: ['stats'] })
        void refetchHistory()
        toast.success(
          r.applications_created > 0 || r.inserted > 0
            ? `${r.applications_created} new app${r.applications_created !== 1 ? 's' : ''} · ${r.inserted} email${r.inserted !== 1 ? 's' : ''} saved`
            : 'Inbox is already up to date',
        )
        es.close()
      } else if (stage === 'error') {
        setScanError(detail)
        setCurrentStage('error')
        setScanning(false)
        addLog('error', detail, 'error')
        void refetchHistory()
        toast.error(detail)
        es.close()
      } else {
        setCurrentStage(stage)
        const idx = STAGES.findIndex((s) => s.key === stage)
        if (idx > 0) setCompletedStages(STAGES.slice(0, idx).map((s) => s.key))
        addLog(stage, detail)
        if (stage === 'fetching' || stage === 'filtering') {
          for (let i = 0; i < 2; i++) spawnBlip()
        }
      }
    }

    es.onerror = () => {
      es.close()
      setScanning((prev) => {
        if (prev) {
          const msg = 'Connection lost — please try again'
          setScanError(msg)
          setCurrentStage('error')
          addLog('error', msg, 'error')
          toast.error(msg)
        }
        return false
      })
    }
  }

  const activeStage = STAGES.find((s) => s.key === currentStage)
  const hasScanState = scanning || done || !!scanError
  const lastDone = history?.find((r) => r.status === 'completed')
  const accent = scanError ? '#f87171' : done ? '#34d399' : activeStage?.color ?? '#38bdf8'

  return (
    <>
      <style>{`
        @keyframes logIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes ringOut {
          0%   { transform: scale(1);   opacity: 0.4; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="space-y-5 max-w-4xl">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gmail scanner & configuration</p>
        </div>

        {/* Scan card */}
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
                        <span className="font-mono text-[9px] text-green-400 uppercase tracking-widest">
                          Done
                        </span>
                      </>
                    )}
                    {scanError && (
                      <>
                        <XCircle size={24} color="#f87171" />
                        <span className="font-mono text-[9px] text-red-400 uppercase tracking-widest">
                          Failed
                        </span>
                      </>
                    )}
                    {!done && !scanError && !scanning && (
                      <span className="font-mono text-[9px] text-gray-700 uppercase tracking-widest">
                        Standby
                      </span>
                    )}
                    {scanning && (
                      <>
                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: accent }} />
                        <span
                          className="font-mono text-[9px] uppercase tracking-widest"
                          style={{ color: accent }}
                        >
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
                        Scanning…
                      </>
                    ) : (
                      <>
                        <Mail size={14} />
                        {done || scanError ? 'Scan Again' : 'Run Scan'}
                      </>
                    )}
                  </span>
                </button>

                {lastDone && !scanning && (
                  <span className="font-mono text-[10px] text-gray-600 flex items-center gap-1.5">
                    <Clock size={9} />
                    last {relativeTime(lastDone.completed_at!)}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-4">
                <div
                  className="rounded-xl p-4"
                  style={{ background: '#0a0a16', border: '1px solid #ffffff07' }}
                >
                  <p className="font-mono text-[9px] text-gray-700 uppercase tracking-widest mb-4">Pipeline</p>
                  <StageNodes currentStage={currentStage} completedStages={completedStages} scanning={scanning} />
                </div>

                {hasScanState && <Terminal lines={logLines} scanning={scanning} />}

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

        {history && history.length > 0 && (
          <div className="rounded-2xl p-6" style={{ background: '#0e0e1a', border: '1px solid #ffffff08' }}>
            <HistoryHeader count={history.length} />
            {history.map((run) => (
              <HistoryRow key={run.id} run={run} />
            ))}
          </div>
        )}

        <div className="rounded-2xl p-6" style={{ background: '#0e0e1a', border: '1px solid #ffffff08' }}>
          <h2 className="text-white text-sm font-semibold mb-4">About</h2>
          <dl className="space-y-3">
            {[
              ['Version', 'v1.0.0'],
              ['Backend', window.location.origin],
              ['Stack', 'React 19 · FastAPI · SQLite'],
            ].map(([l, v]) => (
              <div key={l} className="flex items-center">
                <dt className="font-mono text-[11px] text-gray-600 w-24">{l}</dt>
                <dd className="font-mono text-[11px] text-gray-300">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </>
  )
}

export default SettingsPage
