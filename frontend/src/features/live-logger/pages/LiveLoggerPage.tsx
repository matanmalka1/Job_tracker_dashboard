import { useState } from 'react'
import EventTerminal from '../../../shared/components/feedback/EventTerminal.tsx'
import LiveLoggerControls from '../components/LiveLoggerControls.tsx'
import LiveLoggerHeader from '../components/LiveLoggerHeader.tsx'
import { useLiveLogger } from '../hooks/useLiveLogger.ts'

const LiveLoggerPage = () => {
  const [autoScroll, setAutoScroll] = useState(true)
  const logger = useLiveLogger()

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
          <LiveLoggerHeader
            url={logger.url}
            status={logger.status}
            onConnect={logger.connect}
            onClose={logger.close}
            onClear={logger.clearLogs}
          />

          <div className="p-5 space-y-4">
            <LiveLoggerControls url={logger.url} status={logger.status} onUrlChange={logger.setUrl} />

            <EventTerminal
              lines={logger.logs}
              live={logger.status === 'open'}
              autoScroll={autoScroll}
              title="live.log"
              emptyText="waiting for stream..."
              minHeight={200}
              maxHeight={420}
              headerRight={
                <label className="flex items-center gap-1.5 text-[11px] text-gray-500 font-mono cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-purple-500"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                  />
                  auto-scroll
                </label>
              }
            />

            <div className="flex items-center gap-4 text-[11px] font-mono text-gray-600">
              <span>{logger.logs.length} / {logger.maxLines} lines</span>
              {logger.lastParsed && (
                <span>
                  last stage: <span className="text-gray-400">{String(logger.lastParsed.stage ?? '-')}</span>
                </span>
              )}
            </div>

            {logger.lastParsed && (
              <div className="rounded-xl p-4" style={{ background: '#0a0a16', border: '1px solid #ffffff07' }}>
                <p className="font-mono text-[10px] text-gray-700 uppercase tracking-widest mb-2">Last event payload</p>
                <pre className="text-[11px] text-gray-300 font-mono whitespace-pre-wrap break-all leading-5">
                  {JSON.stringify(logger.lastParsed, null, 2)}
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
