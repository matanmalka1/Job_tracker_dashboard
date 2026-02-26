import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, PlugZap, Play, StopCircle, Trash2 } from 'lucide-react'

type LogLevel = 'info' | 'success' | 'warn' | 'error'

interface LogEntry {
  id: number
  ts: number
  stage: string
  text: string
  level: LogLevel
}

const STATUS_META: Record<ConnectionStatus, { label: string; color: string; bg: string }> = {
  idle: { label: 'Idle', color: '#94a3b8', bg: '#0f172a' },
  connecting: { label: 'Connecting', color: '#38bdf8', bg: '#0b1530' },
  open: { label: 'Live', color: '#34d399', bg: '#0b1e16' },
  error: { label: 'Error', color: '#f87171', bg: '#1f0e0e' },
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: '#94a3b8',
  success: '#34d399',
  warn: '#facc15',
  error: '#f87171',
}

type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'error'

const MAX_LINES = 400

const LiveLoggerPage = () => {
  const [streamUrl, setStreamUrl] = useState('/job-tracker/scan/progress')
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [lastEvent, setLastEvent] = useState<string>('—')

  const esRef = useRef<EventSource | null>(null)
  const logIdRef = useRef(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => esRef.current?.close(), [])

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, autoScroll])

  const parsedHost = useMemo(() => {
    try {
      const u = new URL(streamUrl, window.location.href)
      return u.host
    } catch {
      return 'Invalid URL'
    }
  }, [streamUrl])

  const pushLog = (entry: Omit<LogEntry, 'id' | 'ts'>) => {
    setLogs((prev) => {
      const next: LogEntry[] = [...prev.slice(-(MAX_LINES - 1)), { ...entry, id: logIdRef.current++, ts: Date.now() }]
      return next
    })
  }

  const disconnect = () => {
    esRef.current?.close()
    esRef.current = null
    setStatus('idle')
  }

  const connect = () => {
    if (!streamUrl.trim()) return
    disconnect()
    setStatus('connecting')

    try {
      const es = new EventSource(streamUrl.trim())
      esRef.current = es

      es.onopen = () => {
        setStatus('open')
        pushLog({ stage: 'system', text: 'Connected to stream', level: 'success' })
      }

      es.onmessage = (ev: MessageEvent<string>) => {
        if (!ev.data) return
        let stage = 'event'
        let text = ev.data
        let level: LogLevel = 'info'

        try {
          const parsed = JSON.parse(ev.data) as { stage?: string; detail?: string; message?: string; level?: LogLevel }
          stage = parsed.stage ?? stage
          text = parsed.detail ?? parsed.message ?? ev.data
          if (parsed.level) level = parsed.level
          else if (stage === 'error') level = 'error'
          else if (stage === 'result') level = 'success'
        } catch {
          // plain text payload
        }

        setLastEvent(stage)
        pushLog({ stage, text, level })
      }

      es.onerror = () => {
        pushLog({ stage: 'error', text: 'Stream disconnected or unavailable', level: 'error' })
        setStatus('error')
        es.close()
        esRef.current = null
      }
    } catch (err) {
      pushLog({ stage: 'error', text: (err as Error).message, level: 'error' })
      setStatus('error')
    }
  }

  const clearLogs = () => setLogs([])

  const statusMeta = STATUS_META[status]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold">Live Logger</h1>
          <p className="text-gray-500 text-sm mt-1">
            Stream server events in real time. Defaults to the Gmail scan progress feed.
          </p>
        </div>

        <div
          className="px-3 py-2 rounded-xl text-xs font-mono uppercase tracking-widest flex items-center gap-2"
          style={{ background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.color}30` }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: statusMeta.color, boxShadow: status === 'open' ? `0 0 0 6px ${statusMeta.color}1f` : 'none' }}
          />
          {statusMeta.label}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-5">
        <div className="rounded-2xl border border-white/5" style={{ background: '#0e0e1a' }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1b1b2a' }}>
              <Activity size={18} className="text-purple-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">Log Stream</p>
              <p className="text-gray-600 text-xs truncate">{streamUrl}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={status === 'open' ? disconnect : connect}
                className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
                style={{
                  background: status === 'open' ? '#1f2937' : '#4f46e5',
                  color: status === 'open' ? '#e2e8f0' : '#fff',
                  border: '1px solid #ffffff14',
                }}
              >
                {status === 'open' ? <StopCircle size={14} /> : <Play size={14} />}
                {status === 'open' ? 'Stop' : status === 'connecting' ? 'Connecting…' : 'Start'}
              </button>
              <button
                onClick={clearLogs}
                className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 text-gray-300"
                style={{ background: '#1b1b2a', border: '1px solid #ffffff10' }}
              >
                <Trash2 size={14} />
                Clear
              </button>
            </div>
          </div>

          <div className="p-5 space-y-3">
            <label className="block text-xs text-gray-500 font-medium">Stream URL</label>
            <input
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              spellCheck={false}
              className="w-full rounded-lg bg-[#0a0a16] border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />

            <div className="text-[11px] text-gray-600 font-mono flex items-center gap-2">
              <PlugZap size={12} />
              Target host: {parsedHost}
            </div>

            <div
              className="rounded-xl border border-white/5 overflow-hidden"
              style={{ background: '#07070f', minHeight: 280, maxHeight: 420 }}
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#0c0c18]">
                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 text-gray-600">live.log</span>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                  <input
                    type="checkbox"
                    className="accent-purple-500"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  auto-scroll
                </label>
              </div>

              <div
                className="p-4 space-y-1.5 overflow-y-auto"
                style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace', maxHeight: 360 }}
              >
                {logs.length === 0 ? (
                  <div className="text-[11px] text-gray-700">{'> '}
                    <span className="animate-pulse">waiting…</span>
                  </div>
                ) : (
                  logs.map((line) => (
                    <div key={line.id} className="flex gap-3 text-[11px] leading-5" style={{ animation: 'logIn 0.12s ease-out both' }}>
                      <span className="text-gray-700 shrink-0 tabular-nums select-none">
                        {new Date(line.ts).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                      <span
                        className="shrink-0 w-[6ch] text-right font-bold uppercase tracking-wider select-none"
                        style={{ color: LEVEL_COLOR[line.level] }}
                      >
                        {line.stage.slice(0, 6)}
                      </span>
                      <span style={{ color: LEVEL_COLOR[line.level] }}>{line.text}</span>
                    </div>
                  ))
                )}
                {status === 'open' && (
                  <div className="text-[11px] text-gray-700 font-mono">
                    {'> '}<span className="animate-pulse">▋</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl p-5 border border-white/5" style={{ background: '#0e0e1a' }}>
            <div className="flex items-center gap-2 text-gray-300">
              <AlertTriangle size={16} className="text-amber-400" />
              <p className="text-sm font-semibold">How it works</p>
            </div>
            <ol className="mt-3 space-y-2 text-sm text-gray-500 list-decimal list-inside">
              <li>Enter any Server-Sent Events (SSE) endpoint. The default triggers Gmail scan progress.</li>
              <li>Click Start to open the stream. New events appear in the console below.</li>
              <li>Use Stop to close the connection or Clear to reset the buffer (keeps the URL).</li>
            </ol>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-500 font-mono">
              <div className="rounded-xl border border-white/5 p-3" style={{ background: '#0a0a16' }}>
                <p className="text-gray-600">Last event</p>
                <p className="text-white text-sm mt-1">{lastEvent}</p>
              </div>
              <div className="rounded-xl border border-white/5 p-3" style={{ background: '#0a0a16' }}>
                <p className="text-gray-600">Lines buffered</p>
                <p className="text-white text-sm mt-1">{logs.length} / {MAX_LINES}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5 border border-white/5" style={{ background: '#0e0e1a' }}>
            <p className="text-sm text-gray-300 font-semibold mb-2">Tips</p>
            <ul className="space-y-1.5 text-sm text-gray-500">
              <li>Streams send text lines or JSON. JSON fields <code className="text-gray-300">stage</code> and <code className="text-gray-300">detail/message</code> are highlighted.</li>
              <li>We keep the newest {MAX_LINES} events to avoid runaway buffers.</li>
              <li>Close the tab or hit Stop to release server connections.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveLoggerPage
