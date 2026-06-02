import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { ApplicationWritePayload, JobApplication } from '../../../shared/types/job-tracker.ts'
import { APPLICATION_STATUS_OPTIONS } from '../../../shared/constants/applicationStatus.ts'
import {
  EMPTY_APPLICATION_FORM,
  applicationToFormState,
  formStateToApplicationPayload,
  type ApplicationFormState,
} from '../../../shared/utils/jobApplicationForm.ts'

interface Props {
  open: boolean
  initial?: JobApplication | null
  onClose: () => void
  onSubmit: (data: ApplicationWritePayload) => void
  loading?: boolean
}

const ApplicationModal = ({ open, initial, onClose, onSubmit, loading }: Props) => {
  const [form, setForm] = useState<ApplicationFormState>(EMPTY_APPLICATION_FORM)

  useEffect(() => {
    if (open) {
      // Reset the draft each time the modal opens; safe to ignore lint rule here because we want a fresh form per open.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(
        initial
          ? applicationToFormState(initial)
          : EMPTY_APPLICATION_FORM,
      )
    }
  }, [open, initial])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formStateToApplicationPayload(form))
  }

  const set =
    (key: keyof ApplicationFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const inputCls =
    'w-full bg-raised border border-DEFAULT rounded-lg px-3 py-2.5 text-t1 text-sm placeholder-t3 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors'

  const isEdit = !!initial

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit Application' : 'Add Application'}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-DEFAULT rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-t1 font-semibold text-lg">
            {isEdit ? 'Edit Application' : 'Add Application'}
          </h2>
          <button type="button" onClick={onClose} className="text-t2 hover:text-t1 transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-t2 font-medium mb-1.5">Company *</label>
            <input type="text" required value={form.company_name} onChange={set('company_name')} placeholder="e.g. Acme Corp" className={inputCls} autoFocus />
          </div>

          <div>
            <label className="block text-xs text-t2 font-medium mb-1.5">Role</label>
            <input type="text" value={form.role_title} onChange={set('role_title')} placeholder="e.g. Senior Engineer" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs text-t2 font-medium mb-1.5">Status</label>
            <select value={form.status} onChange={set('status')} className={inputCls}>
              {APPLICATION_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-t2 font-medium mb-1.5">Source</label>
            <input type="text" value={form.source} onChange={set('source')} placeholder="e.g. LinkedIn, Referral" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs text-t2 font-medium mb-1.5">Applied Date</label>
            <input type="date" value={form.applied_at} onChange={set('applied_at')} className={`${inputCls}`} />
          </div>

          <div>
            <label className="block text-xs text-t2 font-medium mb-1.5">Job URL</label>
            <input type="url" value={form.job_url} onChange={set('job_url')} placeholder="https://…" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs text-t2 font-medium mb-1.5">Follow-up Date</label>
            <input type="date" value={form.next_action_at} onChange={set('next_action_at')} className={`${inputCls}`} />
          </div>

          <div>
            <label className="block text-xs text-t2 font-medium mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} placeholder="Interview prep, impressions, contacts…" rows={3} className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg border border-DEFAULT text-t2 text-sm font-medium hover:text-t1 hover:border-hi transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-t1 text-sm font-medium transition-colors">
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApplicationModal
