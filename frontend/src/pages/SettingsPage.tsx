import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail, RefreshCw, CheckCircle, XCircle, History } from 'lucide-react'
import { toast } from 'sonner'
import { fetchScanHistory } from '../api/client.ts'
import type { ScanRun } from '../types/index.ts'

interface ScanProgress {
  stage: string
  detail: string
}

interface ScanResult {
  inserted: number
  applications_created: number
}

const STAGE_LABELS: Record<string, string> = {
  fetching: 'Fetching emails',
  filtering: 'Filtering results',
  saving: 'Saving to database',
  matching: 'Matching to applications',
  creating: 'Creating applications',
  done: 'Complete',
}

const STAGE_ORDER = ['fetching', 'filtering', 'saving', 'matching', 'creating', 'done']

const formatRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const ScanHistoryRow = ({ run }: { run: ScanRun }) => {
  const isOk = run.status === 'completed'
  const isFail = run.status === 'failed'
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className={[
        'shrink-0 w-2 h-2 rounded-full',
        isOk ? 'bg-green-400' : isFail ? 'bg-red-400' : 'bg-blue-400 animate-pulse',
      ].join(' ')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-white text-xs font-medium capitalize">{run.status}</span>
          {isOk && (
            <span className="text-gray-400 text-xs">
              {run.emails_inserted ?? 0} emails · {run.apps_created ?? 0} apps created
            </span>
          )}
          {isFail && run.error && (
            <span className="text-red-400 text-xs truncate">{run.error}</span>
          )}
        </div>
      </div>
      <span className="text-gray-600 text-xs shrink-0">
        {run.completed_at ? formatRelative(run.completed_at) : formatRelative(run.started_at)}
      </span>
    </div>
  )
}

const SettingsPage = () => {
  const queryClient = useQueryClient()
  const [isScanning, setIsScanning] = useState(false)
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [completedStages, setCompletedStages] = useState<string[]>([])
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  const { data: scanHistory, refetch: refetchHistory } = useQuery({
    queryKey: ['scan-history'],
    queryFn: fetchScanHistory,
    staleTime: 30_000,
  })

  const runScan = () => {
    if (isScanning) return

    setIsScanning(true)
    setProgress(null)
    setCompletedStages([])
    setLastResult(null)
    setScanError(null)

    const es = new EventSource('/job-tracker/scan/progress')
    esRef.current = es

    es.onmessage = (e) => {
      if (!e.data || e.data === '{}') return
      const event = JSON.parse(e.data) as ScanProgress & Partial<ScanResult> & { stage: string }

      if (event.stage === 'result') {
        const result = { inserted: event.inserted ?? 0, applications_created: event.applications_created ?? 0 }
        setLastResult(result)
        setCompletedStages(STAGE_ORDER)
        setProgress({ stage: 'done', detail: `${result.inserted} emails · ${result.applications_created} applications` })
        setIsScanning(false)
        queryClient.invalidateQueries({ queryKey: ['applications'] })
        queryClient.invalidateQueries({ queryKey: ['emails'] })
        refetchHistory()
        const parts: string[] = []
        if (result.applications_created > 0) parts.push(`${result.applications_created} application${result.applications_created !== 1 ? 's' : ''} created`)
        if (result.inserted > 0) parts.push(`${result.inserted} email${result.inserted !== 1 ? 's' : ''} saved`)
        toast.success(parts.length ? parts.join(' · ') : 'Inbox is up to date')
        es.close()
      } else if (event.stage === 'error') {
        setScanError(event.detail)
        setIsScanning(false)
        refetchHistory()
        toast.error(`Scan failed: ${event.detail}`)
        es.close()
      } else {
        setProgress({ stage: event.stage, detail: event.detail })
        const idx = STAGE_ORDER.indexOf(event.stage)
        if (idx > 0) {
          setCompletedStages(STAGE_ORDER.slice(0, idx))
        }
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

      {/* Gmail Scan */}
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

        {/* Progress steps */}
        {isScanning && (
          <div className="border border-white/5 rounded-lg p-4 space-y-4 bg-gradient-to-br from-white/5 via-white/0 to-blue-500/5">
            {(() => {
              const totalStages = STAGE_ORDER.length - 1 // exclude done label
              const completed = completedStages.length
              const percent = Math.min(100, Math.round((completed / totalStages) * 100))

              return (
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Scan progress</span>
                    <span>{percent}%</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-300 shadow-[0_0_20px_-6px_rgba(59,130,246,0.8)] animate-shimmer"
                      style={{ width: `${Math.max(6, percent)}%` }}
                    />
                    <div className="absolute inset-0 ring-1 ring-white/10 rounded-full" />
                  </div>
                </div>
              )
            })()}

            <div className="space-y-3">
              {STAGE_ORDER.filter(s => s !== 'done').map((stage, idx) => {
                const done = completedStages.includes(stage)
                const active = progress?.stage === stage
                const nextDone = completedStages.includes(STAGE_ORDER[idx + 1])

                return (
                  <div key={stage} className="flex items-start gap-3">
                    <div className="shrink-0 flex flex-col items-center">
                      <div className={[
                        'w-4 h-4 rounded-full border flex items-center justify-center shadow-[0_0_0_6px_rgba(59,130,246,0.06)]',
                        done
                          ? 'bg-green-500/20 border-green-500/60'
                          : active
                            ? 'bg-blue-500/20 border-blue-500/60 animate-pulse'
                            : 'bg-white/5 border-white/15',
                      ].join(' ')}>
                        <div className={[
                          'w-1.5 h-1.5 rounded-full',
                          done ? 'bg-green-400' : active ? 'bg-blue-300' : 'bg-gray-500',
                        ].join(' ')} />
                      </div>
                      {idx < STAGE_ORDER.length - 2 && (
                        <div className={[
                          'flex-1 w-px mt-1',
                          nextDone ? 'bg-green-500/40' : active ? 'bg-blue-500/30' : 'bg-white/10',
                        ].join(' ')} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={[
                          'text-sm font-medium',
                          done ? 'text-green-300' : active ? 'text-white' : 'text-gray-600',
                        ].join(' ')}>
                          {STAGE_LABELS[stage]}
                        </p>
                        {active && (
                          <span className="text-[10px] uppercase tracking-[0.08em] text-blue-200 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Live</span>
                        )}
                      </div>
                      {active && progress?.detail && (
                        <p className="text-gray-300 text-xs mt-0.5 truncate">
                          {progress.detail}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Success result */}
        {!isScanning && lastResult && !scanError && (
          <div className="flex items-center gap-2 bg-green-600/10 border border-green-600/20 rounded-lg px-4 py-3">
            <CheckCircle size={15} className="text-green-400 shrink-0" />
            <p className="text-green-300 text-sm">
              {lastResult.applications_created > 0 || lastResult.inserted > 0
                ? [
                    lastResult.applications_created > 0 && `${lastResult.applications_created} new application${lastResult.applications_created !== 1 ? 's' : ''} detected`,
                    lastResult.inserted > 0 && `${lastResult.inserted} email${lastResult.inserted !== 1 ? 's' : ''} saved`,
                  ].filter(Boolean).join(' · ') + '.'
                : 'Scan complete — inbox is up to date.'}
            </p>
          </div>
        )}

        {/* Error */}
        {scanError && (
          <div className="flex items-center gap-2 bg-red-600/10 border border-red-600/20 rounded-lg px-4 py-3">
            <XCircle size={15} className="text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">{scanError}</p>
          </div>
        )}

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
            <p className="text-gray-500 text-xs">
              Last scanned: {formatRelative(lastCompleted.completed_at!)}
            </p>
          )}
        </div>
      </div>

      {/* Scan History */}
      {scanHistory && scanHistory.length > 0 && (
        <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <History size={15} className="text-gray-400" />
            <h2 className="text-white font-semibold text-sm">Scan History</h2>
          </div>
          <div>
            {scanHistory.map((run) => (
              <ScanHistoryRow key={run.id} run={run} />
            ))}
          </div>
        </div>
      )}

      {/* App info */}
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
