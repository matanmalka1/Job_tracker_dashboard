import { useQuery } from '@tanstack/react-query'
import { fetchScanHistory } from '../../../api/client.ts'
import AboutPanel from '../components/AboutPanel.tsx'
import HistoryRow, { HistoryHeader } from '../components/HistoryRow.tsx'
import ScannerCard from '../components/ScannerCard.tsx'
import { SCAN_STAGES } from '../../../shared/constants/scan.ts'
import { useScanRunner } from '../hooks/useScanRunner.ts'

const SettingsPage = () => {
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['scan-history'],
    queryFn: fetchScanHistory,
    staleTime: 30_000,
  })

  const scan = useScanRunner(refetchHistory)

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

        <AboutPanel />
      </div>
    </>
  )
}

export default SettingsPage
