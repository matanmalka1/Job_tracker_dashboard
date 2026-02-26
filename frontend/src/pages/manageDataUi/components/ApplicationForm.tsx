import type { Dispatch, SetStateAction } from 'react'
import type { ApplicationStatus } from '../../../types/index.ts'
import type { FormState } from '../types.ts'
import { STATUS_OPTIONS } from '../constants'

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
        <label className="text-xs text-gray-500">Company *</label>
        <input
          value={form.company_name}
          onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
          className="mt-1 w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
          autoFocus
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">Role *</label>
        <input
          value={form.role_title}
          onChange={(e) => setForm((f) => ({ ...f, role_title: e.target.value }))}
          className="mt-1 w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-gray-500">Status</label>
        <select
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ApplicationStatus }))}
          className="mt-1 w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Source</label>
        <input
          value={form.source}
          onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
          className="mt-1 w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
          placeholder="LinkedIn, referral, etc"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="text-xs text-gray-500">Applied date</label>
        <input
          type="date"
          value={form.applied_at}
          onChange={(e) => setForm((f) => ({ ...f, applied_at: e.target.value }))}
          className="mt-1 w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50 [color-scheme:dark]"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500">Confidence (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={form.confidence_score}
          onChange={(e) => setForm((f) => ({ ...f, confidence_score: e.target.value }))}
          className="mt-1 w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50"
          placeholder="0 - 100"
        />
      </div>
    </div>

    <div className="flex items-center justify-end gap-3 pt-2">
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20"
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={!form.company_name.trim() || !form.role_title.trim() || loading}
        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm text-white font-medium"
      >
        {loading ? 'Saving…' : editing ? 'Save changes' : 'Create record'}
      </button>
    </div>
  </div>
)

export default ApplicationForm
