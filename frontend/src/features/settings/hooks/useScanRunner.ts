import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryObserverResult } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchScanStreamUrl } from '../../../api/client.ts'
import { SCAN_STAGES } from '../../../shared/constants/scan.ts'
import type { Blip, LogLine, ScanResultState } from '../types.ts'
import type { ScanRun } from '../../../shared/types/job-tracker.ts'

let blipId = 0

const makeBlip = (angle?: number, radius?: number): Blip => ({
  id: blipId++,
  angle: angle ?? Math.random() * Math.PI * 2,
  radius: radius ?? 28 + Math.random() * 102,
  alpha: angle != null ? 1 : 0,
  size: 1.2 + Math.random() * 2.2,
})

const seedBlips = (): Blip[] => Array.from({ length: 22 }, () => makeBlip())

type ScanEvent = {
  stage: string
  detail?: string
  inserted?: number
  applications_created?: number
}

export const useScanRunner = (
  refetchHistory: () => Promise<QueryObserverResult<ScanRun[], Error>>,
) => {
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

  const addLog = useCallback((stage: string, detail: string, type: LogLine['type'] = 'info') => {
    setLogLines((p) => [...p, { id: logIdRef.current++, stage, detail, ts: Date.now(), type }])
  }, [])

  const spawnBlip = useCallback(() => {
    const angle = sweepRef.current + (Math.random() - 0.5) * 0.4
    blipsRef.current.push(makeBlip(angle, 24 + Math.random() * 108))
    if (blipsRef.current.length > 38) blipsRef.current.shift()
  }, [])

  const resetScanState = () => {
    setCurrentStage(null)
    setCompletedStages([])
    setLogLines([])
    setResult(null)
    setScanError(null)
    setDone(false)
    blipsRef.current = seedBlips()
    sweepRef.current = 0
  }

  const finishSuccessfully = (event: ScanEvent, es: EventSource) => {
    const nextResult: ScanResultState = {
      inserted: event.inserted ?? 0,
      applications_created: event.applications_created ?? 0,
    }
    setResult(nextResult)
    setCompletedStages(SCAN_STAGES.map((s) => s.key))
    setCurrentStage('done')
    setDone(true)
    setScanning(false)
    addLog('done', `${nextResult.inserted} emails · ${nextResult.applications_created} apps created`, 'success')
    queryClient.invalidateQueries({ queryKey: ['applications'] })
    queryClient.invalidateQueries({ queryKey: ['pipeline-column'] })
    queryClient.invalidateQueries({ queryKey: ['companies'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
    void refetchHistory()
    toast.success(
      nextResult.applications_created > 0 || nextResult.inserted > 0
        ? `${nextResult.applications_created} new app${nextResult.applications_created !== 1 ? 's' : ''} · ${nextResult.inserted} email${nextResult.inserted !== 1 ? 's' : ''} saved`
        : 'Inbox is already up to date',
    )
    es.close()
  }

  const failScan = (message: string, es?: EventSource) => {
    es?.close()
    setScanError(message)
    setCurrentStage('error')
    setScanning(false)
    addLog('error', message, 'error')
    void refetchHistory()
    toast.error(message)
  }

  const runScan = async () => {
    if (scanning) return
    esRef.current?.close()

    setScanning(true)
    resetScanState()
    addLog('sys', 'Initiating Gmail scan...', 'info')

    let scanStreamUrl: string
    try {
      scanStreamUrl = await fetchScanStreamUrl()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start scan stream'
      failScan(message)
      return
    }

    const es = new EventSource(scanStreamUrl)
    esRef.current = es

    es.onmessage = (e: MessageEvent<string>) => {
      if (!e.data?.trim() || e.data.trim() === '{}') return

      let event: ScanEvent
      try {
        event = JSON.parse(e.data) as ScanEvent
      } catch {
        return
      }

      const { stage, detail = '' } = event

      if (stage === 'result') {
        finishSuccessfully(event, es)
        return
      }

      if (stage === 'error') {
        failScan(detail, es)
        return
      }

      setCurrentStage(stage)
      const stageIndex = SCAN_STAGES.findIndex((s) => s.key === stage)
      if (stageIndex > 0) setCompletedStages(SCAN_STAGES.slice(0, stageIndex).map((s) => s.key))
      addLog(stage, detail)
      if (stage === 'fetching' || stage === 'filtering') {
        for (let i = 0; i < 2; i++) spawnBlip()
      }
    }

    es.onerror = () => {
      setScanning((wasScanning) => {
        if (wasScanning) failScan('Connection lost - please try again', es)
        return false
      })
    }
  }

  return {
    blipsRef,
    completedStages,
    currentStage,
    done,
    logLines,
    result,
    runScan,
    scanError,
    scanning,
    sweepRef,
  }
}
