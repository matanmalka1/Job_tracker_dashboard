import type { ChangeEvent, FormEvent } from 'react'
import type { ApplicationFormState } from '../../../shared/utils/jobApplicationForm.ts'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '../../../shared/constants/applicationStatus.ts'

interface Props {
  form: ApplicationFormState
  onChange: (key: keyof ApplicationFormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  onSubmit: (e: FormEvent) => void
  onCancel: () => void
  loading: boolean
}

const inputCls =
  'w-full bg-raised border border-DEFAULT rounded-lg px-3 py-2.5 text-t1 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-colors'

const EditApplicationForm = ({ form, onChange, onSubmit, onCancel, loading }: Props) => (
  <form onSubmit={onSubmit} className="space-y-5">
    <div>
      <label className="block text-xs text-t2 font-medium mb-1.5">Company *</label>
      <input type="text" required value={form.company_name} onChange={onChange('company_name')} className={inputCls} />
    </div>
    <div>
      <label className="block text-xs text-t2 font-medium mb-1.5">Role</label>
      <input type="text" value={form.role_title} onChange={onChange('role_title')} placeholder="e.g. Software Engineer" className={inputCls} />
    </div>
    <div>
      <label className="block text-xs text-t2 font-medium mb-1.5">Status</label>
      <select value={form.status} onChange={onChange('status')} className={inputCls}>
        {APPLICATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {APPLICATION_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-xs text-t2 font-medium mb-1.5">Source</label>
      <input
        type="text"
        value={form.source}
        onChange={onChange('source')}
        placeholder="e.g. LinkedIn, Referral"
        className={inputCls}
      />
    </div>
    <div>
      <label className="block text-xs text-t2 font-medium mb-1.5">Applied Date</label>
      <input type="date" value={form.applied_at} onChange={onChange('applied_at')} className={`${inputCls}`} />
    </div>
    <div>
      <label className="block text-xs text-t2 font-medium mb-1.5">Job URL</label>
      <input type="url" value={form.job_url} onChange={onChange('job_url')} placeholder="https://…" className={inputCls} />
    </div>
    <div>
      <label className="block text-xs text-t2 font-medium mb-1.5">Follow-up Date</label>
      <input
        type="date"
        value={form.next_action_at}
        onChange={onChange('next_action_at')}
        className={`${inputCls}`}
      />
    </div>
    <div>
      <label className="block text-xs text-t2 font-medium mb-1.5">Notes</label>
      <textarea
        value={form.notes}
        onChange={onChange('notes')}
        placeholder="Interview prep, impressions, contacts…"
        rows={4}
        className={`${inputCls} resize-none`}
      />
    </div>
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 px-4 py-2.5 rounded-lg border border-DEFAULT text-t2 text-sm font-medium hover:text-t1 hover:border-hi transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-t1 text-sm font-medium transition-colors"
      >
        {loading ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  </form>
)

export default EditApplicationForm
