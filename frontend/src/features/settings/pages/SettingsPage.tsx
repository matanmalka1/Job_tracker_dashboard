import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchScanHistory } from '../../../api/client.ts'
import AboutPanel from '../components/AboutPanel.tsx'
import HistoryRow, { HistoryHeader } from '../components/HistoryRow.tsx'
import ScannerCard from '../components/ScannerCard.tsx'
import { STAGES } from '../constants.ts'
import type { LogLine, Blip, ScanResultState } from '../types.ts'

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

        <ScannerCard
          activeStage={activeStage}
          accent={accent}
          blipsRef={blipsRef}
          completedStages={completedStages}
          currentStage={currentStage}
          done={done}
          hasScanState={hasScanState}
          lastCompletedAt={lastDone?.completed_at}
          logLines={logLines}
          result={result}
          runScan={runScan}
          scanError={scanError}
          scanning={scanning}
          sweepRef={sweepRef}
        />

        {history && history.length > 0 && (
          <div className="rounded-2xl p-6" style={{ background: '#0e0e1a', border: '1px solid #ffffff08' }}>
            <HistoryHeader count={history.length} />
            {history.map((run) => (
              <HistoryRow key={run.id} run={run} />
            ))}
          </div>
        )}

        <AboutPanel />
      </div>
    </>
  )
}

export default SettingsPage
