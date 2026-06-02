import type { Dispatch, SetStateAction } from 'react'
import type { ApplicationStatus } from '../../../shared/types/job-tracker.ts'
import type { FormState } from '../types.ts'
import { APPLICATION_STATUS_OPTIONS } from '../../../shared/constants/applicationStatus.ts'

interface Props {
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  onSubmit: () => void
  onCancel: () => void
  loading: boolean
  editing: boolean
}

const ApplicationForm = ({ form, setForm, onSubmit, onCancel, loading, editing }: Props) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-t2">Company *</label>
        <input
          value={form.company_name}
          onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
          className="mt-1 w-full bg-raised border border-DEFAULT rounded-lg px-3 py-2 text-t1 text-sm focus:outline-none focus:border-accent/50"
          autoFocus
        />
      </div>
      <div>
        <label className="text-xs text-t2">Role</label>
        <input
          value={form.role_title}
          onChange={(e) => setForm((f) => ({ ...f, role_title: e.target.value }))}
          className="mt-1 w-full bg-raised border border-DEFAULT rounded-lg px-3 py-2 text-t1 text-sm focus:outline-none focus:border-accent/50"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-t2">Status</label>
        <select
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ApplicationStatus }))}
          className="mt-1 w-full bg-raised border border-DEFAULT rounded-lg px-3 py-2 text-t1 text-sm focus:outline-none focus:border-accent/50"
        >
          {APPLICATION_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-t2">Source</label>
        <input
          value={form.source}
          onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
          className="mt-1 w-full bg-raised border border-DEFAULT rounded-lg px-3 py-2 text-t1 text-sm focus:outline-none focus:border-accent/50"
          placeholder="LinkedIn, referral, etc"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-t2">Applied date</label>
        <input
          type="date"
          value={form.applied_at}
          onChange={(e) => setForm((f) => ({ ...f, applied_at: e.target.value }))}
          className="mt-1 w-full bg-raised border border-DEFAULT rounded-lg px-3 py-2 text-t1 text-sm focus:outline-none focus:border-accent/50"
        />
      </div>
      <div>
        <label className="text-xs text-t2">Confidence (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={form.confidence_score}
          onChange={(e) => setForm((f) => ({ ...f, confidence_score: e.target.value }))}
          className="mt-1 w-full bg-raised border border-DEFAULT rounded-lg px-3 py-2 text-t1 text-sm focus:outline-none focus:border-accent/50"
          placeholder="0 - 100"
        />
      </div>
    </div>

    <div className="flex items-center justify-end gap-3 pt-2">
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-lg border border-DEFAULT text-sm text-t2 hover:text-t1 hover:border-hi"
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={!form.company_name.trim() || loading}
        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm text-t1 font-medium"
      >
        {loading ? 'Saving…' : editing ? 'Save changes' : 'Create record'}
      </button>
    </div>
  </div>
)

export default ApplicationForm
