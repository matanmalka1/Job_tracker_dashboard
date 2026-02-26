import { useState } from 'react'
import { X } from 'lucide-react'
import type { ApplicationStatus, JobApplication } from '../../types/index.ts'

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hired', label: 'Hired' },
]

interface FormState {
  company_name: string
  role_title: string
  status: ApplicationStatus
  source: string
  applied_at: string
}

const EMPTY: FormState = {
  company_name: '',
  role_title: '',
  status: 'applied',
  source: '',
  applied_at: '',
}

interface Props {
  open: boolean
  initial?: JobApplication | null
  onClose: () => void
  onSubmit: (data: Omit<FormState, 'applied_at' | 'source'> & { source?: string; applied_at?: string }) => void
  loading?: boolean
}

const ApplicationModal = ({ open, initial, onClose, onSubmit, loading }: Props) => {
  const initialForm: FormState = initial
    ? {
        company_name: initial.company_name,
        role_title: initial.role_title,
        status: initial.status,
        source: initial.source ?? '',
        applied_at: initial.applied_at ? initial.applied_at.slice(0, 10) : '',
      }
    : EMPTY

  const [form, setForm] = useState<FormState>(initialForm)

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      company_name: form.company_name,
      role_title: form.role_title,
      status: form.status,
      source: form.source || undefined,
      applied_at: form.applied_at ? `${form.applied_at}T00:00:00Z` : undefined,
    })
  }

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const isEdit = !!initial

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">
            {isEdit ? 'Edit Application' : 'Add Application'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Company *</label>
            <input
              type="text"
              required
              value={form.company_name}
              onChange={set('company_name')}
              placeholder="e.g. Acme Corp"
              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Role *</label>
            <input
              type="text"
              required
              value={form.role_title}
              onChange={set('role_title')}
              placeholder="e.g. Senior Engineer"
              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={set('status')}
              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Source</label>
            <input
              type="text"
              value={form.source}
              onChange={set('source')}
              placeholder="e.g. LinkedIn, Referral"
              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 font-medium mb-1.5">Applied Date</label>
            <input
              type="date"
              value={form.applied_at}
              onChange={set('applied_at')}
              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors [color-scheme:dark]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 text-sm font-medium hover:text-white hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApplicationModal
