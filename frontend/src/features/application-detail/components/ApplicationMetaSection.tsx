import type { JobApplication } from '../../../shared/types/job-tracker.ts'
import { isSafeHttpUrl } from '../../../shared/utils/url.ts'

const ApplicationMetaSection = ({ app }: { app: JobApplication }) => {
  if (!app.job_url && !app.notes) return null

  return (
    <div className="mt-4 pt-4 border-t border-DEFAULT space-y-3">
      {app.job_url && (
        <div className="flex items-center gap-2">
          <p className="text-t2 text-xs w-20 shrink-0">Job URL</p>
          {isSafeHttpUrl(app.job_url) ? (
            <a
              href={app.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 text-xs hover:text-purple-300 truncate transition-colors"
            >
              {app.job_url}
            </a>
          ) : (
            <span className="text-t2 text-xs truncate">{app.job_url}</span>
          )}
        </div>
      )}
      {app.notes && (
        <div>
          <p className="text-t2 text-xs mb-1">Notes</p>
          <p className="text-t1 text-sm whitespace-pre-wrap leading-relaxed">{app.notes}</p>
        </div>
      )}
    </div>
  )
}

export default ApplicationMetaSection
