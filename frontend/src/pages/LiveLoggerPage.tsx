import { useEffect, useRef, useState } from 'react'
import { Radio, Play, StopCircle, Trash2 } from 'lucide-react'

// Same color maps as the Settings Terminal for consistency
const STAGE_COLOR: Record<string, string> = {
  fetching:  '#38bdf8',
  filtering: '#818cf8',
  saving:    '#34d399',
  matching:  '#fb923c',
  creating:  '#f472b6',
  done:      '#34d399',
  error:     '#f87171',
  sys:       '#64748b',
  system:    '#64748b',
  result:    '#34d399',
  event:     '#94a3b8',
}

const LEVEL_COLOR: Record<string, string> = {
  info:    '#94a3b8',
  success: '#34d399',
  error:   '#f87171',
  warn:    '#fb923c',
}

const PRESETS = [
  { label: 'Scan progress', url: '/job-tracker/scan/progress' },
]

type Status = 'idle' | 'connecting' | 'open' | 'error'

interface LogEntry {
  id: number
  ts: number
  stage: string
  text: string
  level: string
}

const STATUS_DOT: Record<Status, string> = {
  idle:       '#475569',
  connecting: '#38bdf8',
  open:       '#34d399',
  error:      '#f87171',
}
const STATUS_LABEL: Record<Status, string> = {
  idle:       'Idle',
  connecting: 'Connecting…',
  open:       'Live',
  error:      'Error',
}

const MAX_LINES = 400

let _id = 0

const LiveLoggerPage = () => {
  const [url, setUrl] = useState('/job-tracker/scan/progress')
  const [status, setStatus] = useState<Status>('idle')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [lastParsed, setLastParsed] = useState<Record<string, unknown> | null>(null)

  const esRef = useRef<EventSource | null>(null)
  const intentionalCloseRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => esRef.current?.close(), [])

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, autoScroll])

  const push = (entry: Omit<LogEntry, 'id' | 'ts'>) =>
    setLogs((prev) => [
      ...prev.slice(-(MAX_LINES - 1)),
      { ...entry, id: _id++, ts: Date.now() },
    ])

  const close = () => {
    intentionalCloseRef.current = true
    esRef.current?.close()
    esRef.current = null
    setStatus('idle')
  }

  const connect = () => {
    if (status === 'connecting' || status === 'open') return
    if (!url.trim()) return
    close()
    intentionalCloseRef.current = false
    setStatus('connecting')

    const es = new EventSource(url.trim())
    esRef.current = es

    es.onopen = () => {
      setStatus('open')
      push({ stage: 'system', text: `Connected — ${url.trim()}`, level: 'success' })
    }

    es.onmessage = (ev: MessageEvent<string>) => {
      if (!ev.data?.trim()) return

      let stage = 'event'
      let text = ev.data
      let level = 'info'

      try {
        const parsed = JSON.parse(ev.data) as Record<string, unknown>
        stage = String(parsed.stage ?? 'event')
        text = String(parsed.detail ?? parsed.message ?? ev.data)
        if (typeof parsed.level === 'string') level = parsed.level
        else if (stage === 'error') level = 'error'
        else if (stage === 'result' || stage === 'done') level = 'success'
        setLastParsed(parsed)

        // Server signals end of stream — close cleanly to suppress spurious onerror
        if (stage === 'result' || stage === 'error') {
          intentionalCloseRef.current = true
          es.close()
          esRef.current = null
          setStatus('idle')
        }
      } catch {
        // plain-text payload — keep defaults
      }

      push({ stage, text, level })
    }

    es.onerror = () => {
      if (intentionalCloseRef.current) return
      push({ stage: 'error', text: 'Stream closed or unavailable', level: 'error' })
      setStatus('error')
      es.close()
      esRef.current = null
    }
  }

  const dotColor = STATUS_DOT[status]

  return (
    <>
      <style>{`
        @keyframes logIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="space-y-5 max-w-4xl">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Live Logger</h1>
          <p className="text-gray-500 text-sm mt-0.5">Stream SSE events in real time</p>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: '#0e0e1a', border: '1px solid #ffffff0a' }}>
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ background: '#0b0b16', borderColor: '#ffffff07' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#1b1b2a' }}>
                <Radio size={15} className="text-purple-300" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">SSE Stream</p>
                <p className="text-gray-600 text-[11px] font-mono mt-px truncate max-w-[260px]">{url}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status pill */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-widest"
                style={{ background: `${dotColor}12`, border: `1px solid ${dotColor}28`, color: dotColor }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: dotColor, animation: status === 'open' ? 'pulse 1s ease-in-out infinite' : 'none' }}
                />
                {STATUS_LABEL[status]}
              </div>

              <button
                onClick={status === 'open' ? close : connect}
                disabled={status === 'connecting'}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: status === 'open' ? '#1f2937' : '#4f46e5',
                  color: '#fff',
                  border: '1px solid #ffffff14',
                }}
              >
                {status === 'open' ? <StopCircle size={13} /> : <Play size={13} />}
                {status === 'open' ? 'Stop' : 'Start'}
              </button>

              <button
                onClick={() => setLogs([])}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                style={{ background: '#1b1b2a', border: '1px solid #ffffff10' }}
              >
                <Trash2 size={13} />
                Clear
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* URL input + presets */}
            <div className="flex items-center gap-2">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={status === 'open' || status === 'connecting'}
                spellCheck={false}
                placeholder="/job-tracker/scan/progress"
                className="flex-1 rounded-lg bg-[#0a0a16] border border-white/10 text-sm text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50 font-mono"
              />
              {PRESETS.map((p) => (
                <button
                  key={p.url}
                  onClick={() => setUrl(p.url)}
                  disabled={status === 'open' || status === 'connecting'}
                  className="px-2.5 py-2 rounded-lg text-[11px] font-mono text-gray-400 hover:text-white transition-colors disabled:opacity-40 whitespace-nowrap"
                  style={{ background: '#1b1b2a', border: '1px solid #ffffff0a' }}
                  title={p.url}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Terminal */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#07070f', border: '1px solid #ffffff08' }}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ background: '#0c0c18', borderColor: '#ffffff07' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 font-mono text-[10px] text-gray-600">live.log</span>
                  {status === 'open' && (
                    <div className="ml-3 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="font-mono text-[10px] text-green-500 tracking-widest">LIVE</span>
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono cursor-pointer select-none">
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
                style={{ minHeight: 200, maxHeight: 420, fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
              >
                {logs.length === 0 ? (
                  <div className="text-[11px] text-gray-700">
                    {'> '}<span className="animate-pulse">waiting for stream…</span>
                  </div>
                ) : (
                  logs.map((line) => (
                    <div
                      key={line.id}
                      className="flex gap-3 text-[11px] leading-5"
                      style={{ animation: 'logIn 0.12s ease-out both' }}
                    >
                      <span className="text-gray-700 shrink-0 tabular-nums select-none">
                        {new Date(line.ts).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                      <span
                        className="shrink-0 w-[5.5ch] text-right font-bold uppercase tracking-wider select-none"
                        style={{ color: STAGE_COLOR[line.stage] ?? '#475569' }}
                      >
                        {line.stage.slice(0, 5)}
                      </span>
                      <span style={{ color: LEVEL_COLOR[line.level] ?? '#94a3b8' }}>
                        {line.text}
                      </span>
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

            {/* Footer stats + last event inspector */}
            <div className="flex items-center gap-4 text-[11px] font-mono text-gray-600">
              <span>{logs.length} / {MAX_LINES} lines</span>
              {lastParsed && (
                <span>
                  last stage: <span className="text-gray-400">{String(lastParsed.stage ?? '—')}</span>
                </span>
              )}
            </div>

            {lastParsed && (
              <div className="rounded-xl p-4" style={{ background: '#0a0a16', border: '1px solid #ffffff07' }}>
                <p className="font-mono text-[10px] text-gray-700 uppercase tracking-widest mb-2">Last event payload</p>
                <pre className="text-[11px] text-gray-300 font-mono whitespace-pre-wrap break-all leading-5">
                  {JSON.stringify(lastParsed, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default LiveLoggerPage
