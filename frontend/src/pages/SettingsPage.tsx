import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, RefreshCw, History } from 'lucide-react'
import { toast } from 'sonner'
import { fetchScanHistory } from '../api/client.ts'
import type { ScanRun } from '../types/index.ts'
import ScanHistoryRow from './settings/components/ScanHistoryRow'
import ScanProgressSteps from './settings/components/ScanProgressSteps'
import ScanResultAlert from './settings/components/ScanResultAlert'
import ScanErrorAlert from './settings/components/ScanErrorAlert'
import formatRelative from './settings/formatRelative'
import { STAGE_ORDER } from './settings/constants'
import type { ScanProgressState, ScanResultState } from './settings/types.ts'

const SettingsPage = () => {
  const queryClient = useQueryClient()
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState<ScanProgressState | null>(null)
  const [completedStages, setCompletedStages] = useState<string[]>([])
  const [lastResult, setLastResult] = useState<ScanResultState | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => () => esRef.current?.close(), [])

  const { data: scanHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['scan-history'],
    queryFn: fetchScanHistory,
    staleTime: 30_000,
  })

  const handleResult = (event: Partial<ScanResultState>) => {
    const result: ScanResultState = {
      inserted: event.inserted ?? 0,
      applications_created: event.applications_created ?? 0,
    }
    setLastResult(result)
    setCompletedStages(STAGE_ORDER)
    setProgress({ stage: 'done', detail: `${result.inserted} emails · ${result.applications_created} applications` })
    setIsScanning(false)
    queryClient.invalidateQueries({ queryKey: ['applications'] })
    queryClient.invalidateQueries({ queryKey: ['emails'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
    void refetchHistory()

    const parts: string[] = []
    if (result.applications_created > 0)
      parts.push(`${result.applications_created} application${result.applications_created !== 1 ? 's' : ''} created`)
    if (result.inserted > 0)
      parts.push(`${result.inserted} email${result.inserted !== 1 ? 's' : ''} saved`)
    toast.success(parts.length ? parts.join(' · ') : 'Inbox is up to date')
    esRef.current?.close()
  }

  const handleError = (detail = 'Unknown error') => {
    setScanError(detail)
    setIsScanning(false)
    void refetchHistory()
    toast.error(`Scan failed: ${detail}`)
    esRef.current?.close()
  }

  const runScan = () => {
    if (isScanning) return

    esRef.current?.close()
    setIsScanning(true)
    setProgress(null)
    setCompletedStages([])
    setLastResult(null)
    setScanError(null)

    const es = new EventSource('/job-tracker/scan/progress')
    esRef.current = es

    es.onmessage = (e: MessageEvent<string>) => {
      if (!e.data || e.data.trim() === '' || e.data.trim() === '{}') return
      let event: ScanProgressState & Partial<ScanResultState> & { stage: string }
      try {
        event = JSON.parse(e.data) as typeof event
      } catch {
        return
      }

      if (event.stage === 'result') {
        handleResult(event)
      } else if (event.stage === 'error') {
        handleError(event.detail)
      } else {
        setProgress({ stage: event.stage, detail: event.detail ?? '' })
        const idx = STAGE_ORDER.indexOf(event.stage)
        if (idx > 0) setCompletedStages(STAGE_ORDER.slice(0, idx))
      }
    }

    es.onerror = () => {
      es.close()
      setIsScanning((prev) => {
        if (prev) {
          setScanError('Connection lost. Please try again.')
          toast.error('Scan connection lost. Please try again.')
        }
        return false
      })
    }
  }

  const lastCompleted = scanHistory?.find((r) => r.status === 'completed')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-white text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Configure your job tracker</p>
      </div>

      <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-600/20 flex items-center justify-center">
            <Mail size={18} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-sm">Gmail Scan</h2>
            <p className="text-gray-400 text-xs mt-1">
              Scan your Gmail inbox for job application emails. Applications are automatically
              detected from subjects and linked to email threads.
            </p>
          </div>
        </div>

        {isScanning && <ScanProgressSteps progress={progress} completedStages={completedStages} />}

        {!isScanning && lastResult && !scanError && <ScanResultAlert result={lastResult} />}

        {scanError && <ScanErrorAlert message={scanError} />}

        <div className="flex items-center gap-4">
          <button
            onClick={runScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw size={15} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'Scanning…' : 'Run Gmail Scan'}
          </button>
          {lastCompleted && !isScanning && (
            <p className="text-gray-500 text-xs">Last scanned: {formatRelative(lastCompleted.completed_at!)}</p>
          )}
        </div>
      </div>

      {scanHistory && scanHistory.length > 0 && (
        <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <History size={15} className="text-gray-400" />
            <h2 className="text-white font-semibold text-sm">Scan History</h2>
          </div>
          <div>{scanHistory.map((run: ScanRun) => <ScanHistoryRow key={run.id} run={run} />)}</div>
        </div>
      )}

      <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-6">
        <h2 className="text-white font-semibold text-sm mb-3">About</h2>
        <dl className="space-y-2">
          <div className="flex items-center gap-8">
            <dt className="text-gray-500 text-xs w-24">Version</dt>
            <dd className="text-gray-300 text-xs">v1.0.0</dd>
          </div>
          <div className="flex items-center gap-8">
            <dt className="text-gray-500 text-xs w-24">Backend</dt>
            <dd className="text-gray-300 text-xs font-mono">http://localhost:8000</dd>
          </div>
          <div className="flex items-center gap-8">
            <dt className="text-gray-500 text-xs w-24">Stack</dt>
            <dd className="text-gray-300 text-xs">React 19 · FastAPI · SQLite</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default SettingsPage
