import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { fetchScanHistory } from '../../../api/client.ts'
import AboutPanel from '../components/AboutPanel.tsx'
import HistoryRow, { HistoryHeader } from '../components/HistoryRow.tsx'
import ScannerCard from '../components/ScannerCard.tsx'
import LiveLoggerControls from '../components/LiveLoggerControls.tsx'
import LiveLoggerHeader from '../components/LiveLoggerHeader.tsx'
import { SCAN_STAGES } from '../../../shared/constants/scan.ts'
import { useScanRunner } from '../hooks/useScanRunner.ts'
import { useLiveLogger } from '../hooks/useLiveLogger.ts'
import EventTerminal from '../../../shared/components/feedback/EventTerminal.tsx'

const SettingsPage = () => {
  const [debugOpen, setDebugOpen] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['scan-history'],
    queryFn: fetchScanHistory,
    staleTime: 30_000,
  })

  const scan = useScanRunner(refetchHistory)
  const logger = useLiveLogger()

  const activeStage = SCAN_STAGES.find((s) => s.key === scan.currentStage)
  const hasScanState = scan.scanning || scan.done || !!scan.scanError
  const lastDone = history?.find((r) => r.status === 'completed')
  const accent = scan.scanError ? '#f87171' : scan.done ? '#34d399' : activeStage?.color ?? '#38bdf8'

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
          <h1 className="text-t1 text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-t2 text-sm mt-0.5">Gmail scanner & configuration</p>
        </div>

        <ScannerCard
          activeStage={activeStage}
          accent={accent}
          blipsRef={scan.blipsRef}
          completedStages={scan.completedStages}
          currentStage={scan.currentStage}
          done={scan.done}
          hasScanState={hasScanState}
          lastCompletedAt={lastDone?.completed_at}
          logLines={scan.logLines}
          result={scan.result}
          runScan={scan.runScan}
          scanError={scan.scanError}
          scanning={scan.scanning}
          sweepRef={scan.sweepRef}
        />

        {history && history.length > 0 && (
          <div className="panel rounded-2xl p-6">
            <HistoryHeader count={history.length} />
            {history.map((run) => (
              <HistoryRow key={run.id} run={run} />
            ))}
          </div>
        )}

        {/* Debug: SSE stream viewer */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <button
            onClick={() => setDebugOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center gap-2">
              {debugOpen ? <ChevronDown size={14} className="text-t3" /> : <ChevronRight size={14} className="text-t3" />}
              <span className="text-t2 text-sm font-medium">SSE Debug Logger</span>
            </div>
            <span className="text-t3 text-[11px] font-mono">Stream raw events</span>
          </button>

          {debugOpen && (
            <div style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
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
                    <label className="flex items-center gap-1.5 text-[11px] text-t2 font-mono cursor-pointer select-none">
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
                <div className="flex items-center gap-4 text-[11px] font-mono text-t3">
                  <span>{logger.logs.length} / {logger.maxLines} lines</span>
                  {logger.lastParsed && (
                    <span>
                      last stage: <span className="text-t2">{String(logger.lastParsed.stage ?? '-')}</span>
                    </span>
                  )}
                </div>
                {logger.lastParsed && (
                  <div className="rounded-xl p-4" style={{ background: 'var(--bg-raised)', border: '1px solid #ffffff07' }}>
                    <p className="font-mono text-[10px] text-t3 uppercase tracking-widest mb-2">Last event payload</p>
                    <pre className="text-[11px] text-t1 font-mono whitespace-pre-wrap break-all leading-5">
                      {JSON.stringify(logger.lastParsed, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <AboutPanel />
      </div>
    </>
  )
}

export default SettingsPage
