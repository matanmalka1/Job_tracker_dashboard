import { useEffect, useRef, useState } from 'react'
import type { EventLogLine } from '../../../shared/types/job-tracker.ts'

export type LiveLoggerStatus = 'idle' | 'connecting' | 'open' | 'error'

const MAX_LINES = 400

let logId = 0

const parseLogEvent = (data: string) => {
  let stage = 'event'
  let detail = data
  let type: EventLogLine['type'] = 'info'
  let parsed: Record<string, unknown> | null = null

  try {
    parsed = JSON.parse(data) as Record<string, unknown>
    stage = String(parsed.stage ?? 'event')
    detail = String(parsed.detail ?? parsed.message ?? data)
    if (typeof parsed.level === 'string') type = parsed.level as EventLogLine['type']
    else if (stage === 'error') type = 'error'
    else if (stage === 'result' || stage === 'done') type = 'success'
  } catch {
    parsed = null
  }

  return { stage, detail, type, parsed }
}

export const useLiveLogger = (initialUrl = '/job-tracker/scan/progress') => {
  const [url, setUrl] = useState(initialUrl)
  const [status, setStatus] = useState<LiveLoggerStatus>('idle')
  const [logs, setLogs] = useState<EventLogLine[]>([])
  const [lastParsed, setLastParsed] = useState<Record<string, unknown> | null>(null)

  const esRef = useRef<EventSource | null>(null)
  const intentionalCloseRef = useRef(false)

  useEffect(() => () => esRef.current?.close(), [])

  const push = (entry: Omit<EventLogLine, 'id' | 'ts'>) =>
    setLogs((prev) => [
      ...prev.slice(-(MAX_LINES - 1)),
      { ...entry, id: logId++, ts: Date.now() },
    ])

  const close = () => {
    intentionalCloseRef.current = true
    esRef.current?.close()
    esRef.current = null
    setStatus('idle')
  }

  const connect = () => {
    if (status === 'connecting' || status === 'open') return
    const nextUrl = url.trim()
    if (!nextUrl) return

    close()
    intentionalCloseRef.current = false
    setStatus('connecting')

    const es = new EventSource(nextUrl)
    esRef.current = es

    es.onopen = () => {
      setStatus('open')
      push({ stage: 'system', detail: `Connected - ${nextUrl}`, type: 'success' })
    }

    es.onmessage = (event: MessageEvent<string>) => {
      if (!event.data?.trim()) return
      const parsedEvent = parseLogEvent(event.data)

      if (parsedEvent.parsed) setLastParsed(parsedEvent.parsed)
      push({
        stage: parsedEvent.stage,
        detail: parsedEvent.detail,
        type: parsedEvent.type,
      })

      if (parsedEvent.stage === 'result' || parsedEvent.stage === 'error') {
        intentionalCloseRef.current = true
        es.close()
        esRef.current = null
        setStatus('idle')
      }
    }

    es.onerror = () => {
      if (intentionalCloseRef.current) return
      push({ stage: 'error', detail: 'Stream closed or unavailable', type: 'error' })
      setStatus('error')
      es.close()
      esRef.current = null
    }
  }

  return {
    clearLogs: () => setLogs([]),
    close,
    connect,
    lastParsed,
    logs,
    maxLines: MAX_LINES,
    setUrl,
    status,
    url,
  }
}
