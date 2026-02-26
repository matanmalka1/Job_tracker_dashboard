import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, RefreshCw, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { triggerScan } from '../api/client.ts'

const SettingsPage = () => {
  const queryClient = useQueryClient()
  const [lastResult, setLastResult] = useState<{
    inserted: number
    applications_created: number
  } | null>(null)
  const [lastScannedAt, setLastScannedAt] = useState<Date | null>(null)

  const { mutate: runScan, isPending } = useMutation({
    mutationFn: triggerScan,
    onSuccess: (data) => {
      setLastResult(data)
      setLastScannedAt(new Date())
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      const parts: string[] = []
      if (data.applications_created > 0)
        parts.push(
          `${data.applications_created} application${data.applications_created !== 1 ? 's' : ''} created`,
        )
      if (data.inserted > 0)
        parts.push(`${data.inserted} new email${data.inserted !== 1 ? 's' : ''} saved`)
      toast.success(parts.length ? parts.join(' · ') : 'Inbox is up to date')
    },
    onError: (err: Error) => toast.error(`Scan failed: ${err.message}`),
  })

  const buildResultMessage = (r: { inserted: number; applications_created: number }) => {
    const parts: string[] = []
    if (r.applications_created > 0)
      parts.push(
        `${r.applications_created} new application${r.applications_created !== 1 ? 's' : ''} detected`,
      )
    if (r.inserted > 0)
      parts.push(`${r.inserted} email${r.inserted !== 1 ? 's' : ''} saved`)
    return parts.length ? parts.join(' · ') + '.' : 'Scan complete — inbox is up to date.'
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-white text-2xl font-bold">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Configure your job tracker</p>
      </div>

      {/* Gmail Scan */}
      <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-6 space-y-4">
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

        {lastResult && (
          <div className="flex items-center gap-2 bg-green-600/10 border border-green-600/20 rounded-lg px-4 py-3">
            <CheckCircle size={15} className="text-green-400 shrink-0" />
            <p className="text-green-300 text-sm">{buildResultMessage(lastResult)}</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={() => runScan()}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw size={15} className={isPending ? 'animate-spin' : ''} />
            {isPending ? 'Scanning…' : 'Run Gmail Scan'}
          </button>
          {lastScannedAt && (
            <p className="text-gray-500 text-xs">
              Last scanned:{' '}
              {lastScannedAt.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>

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
