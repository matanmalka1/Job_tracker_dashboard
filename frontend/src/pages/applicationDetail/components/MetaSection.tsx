import type { JobApplication } from '../../../types/index.ts'

const MetaSection = ({ app }: { app: JobApplication }) => {
  if (!app.job_url && !app.notes) return null

  return (
    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
      {app.job_url && (
        <div className="flex items-center gap-2">
          <p className="text-gray-500 text-xs w-20 shrink-0">Job URL</p>
          <a
            href={app.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 text-xs hover:text-purple-300 truncate transition-colors"
          >
            {app.job_url}
          </a>
        </div>
      )}
      {app.notes && (
        <div>
          <p className="text-gray-500 text-xs mb-1">Notes</p>
          <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{app.notes}</p>
        </div>
      )}
    </div>
  )
}

export default MetaSection
