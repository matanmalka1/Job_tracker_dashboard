import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Database,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import SlideOver from '../../components/ui/SlideOver.tsx'
import ConfirmDialog from '../../components/ui/ConfirmDialog.tsx'
import LoadingSpinner from '../../components/ui/LoadingSpinner.tsx'
import type { ApplicationStatus, ApplicationWritePayload, JobApplication } from '../../types/index.ts'
import {
  fetchApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../../api/client.ts'

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hired', label: 'Hired' },
]

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: 'bg-blue-500/10 text-blue-200 border-blue-500/30',
  applied: 'bg-purple-500/10 text-purple-200 border-purple-500/30',
  interviewing: 'bg-amber-500/10 text-amber-200 border-amber-500/30',
  offer: 'bg-green-500/10 text-green-200 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-200 border-red-500/30',
  hired: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30',
}

interface FormState {
  company_name: string
  role_title: string
  status: ApplicationStatus
  source: string
  applied_at: string
  confidence_score: string
}

const EMPTY_FORM: FormState = {
  company_name: '',
  role_title: '',
  status: 'applied',
  source: '',
  applied_at: '',
  confidence_score: '',
}

const formatDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—'

const ManageDataUiPage = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<JobApplication | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['applications', 'manage-data'],
    queryFn: () => fetchApplications({ limit: 500, offset: 0 }),
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['applications'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }

  const { mutate: createMutate, isPending: createLoading } = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      toast.success('Record created')
      invalidateAll()
      setDrawerOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // BUG FIX: updateMutate's mutationFn argument type was
  // `Parameters<typeof createApplication>[0]` (required fields) instead of
  // `Partial<ApplicationWritePayload>` (all optional for PATCH).
  const { mutate: updateMutate, isPending: updateLoading } = useMutation({
    mutationFn: (body: Partial<ApplicationWritePayload>) => {
      if (!editing) return Promise.reject(new Error('No record selected'))
      return updateApplication(editing.id, body)
    },
    onSuccess: () => {
      toast.success('Record updated')
      invalidateAll()
      setDrawerOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { mutate: deleteMutate, isPending: deleteLoading } = useMutation({
    mutationFn: (id: number) => deleteApplication(id),
    onSuccess: () => {
      toast.success('Record deleted')
      invalidateAll()
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const applications = useMemo(() => data?.items ?? [], [data])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return applications.filter((app) => {
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter
      const matchesSearch =
        !q ||
        app.company_name.toLowerCase().includes(q) ||
        app.role_title.toLowerCase().includes(q) ||
        (app.source ?? '').toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [applications, search, statusFilter])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDrawerOpen(true)
  }

  const openEdit = (app: JobApplication) => {
    setEditing(app)
    setForm({
      company_name: app.company_name,
      role_title: app.role_title,
      status: app.status,
      source: app.source ?? '',
      applied_at: app.applied_at ? app.applied_at.slice(0, 10) : '',
      confidence_score:
        app.confidence_score != null && !Number.isNaN(app.confidence_score)
          ? String(Math.round(app.confidence_score * 100))
          : '',
    })
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const onSubmit = () => {
    if (!form.company_name.trim() || !form.role_title.trim()) return

    const payload: ApplicationWritePayload = {
      company_name: form.company_name.trim(),
      role_title: form.role_title.trim(),
      status: form.status,
      source: form.source.trim() || undefined,
      applied_at: form.applied_at ? `${form.applied_at}T00:00:00Z` : undefined,
      confidence_score:
        form.confidence_score.trim() === ''
          ? undefined
          : Number(form.confidence_score) / 100,
    }

    if (editing) {
      updateMutate(payload)
    } else {
      createMutate(payload)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-[0.08em]">
          <Database size={16} className="text-purple-400" />
          Manage Data
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-white text-2xl font-bold">Data Manager</h1>
            <p className="text-gray-400 text-sm">
              Live data from the database — create, edit, or delete job application rows directly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void refetch()}
              className="p-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              New record
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#1a1a24] border border-white/5 rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, role, or source"
              className="w-full bg-[#0f0f13] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="all">Any status</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {filtered.length} record{filtered.length === 1 ? '' : 's'} shown
        </div>
      </div>

      <div className="bg-[#1a1a24] border border-white/5 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : isError ? (
          <div className="py-16 flex flex-col items-center gap-2 text-red-200">
            <AlertCircle size={18} />
            <p className="text-sm">Could not load records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-gray-400 uppercase text-[11px] tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Company</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Source</th>
                  <th className="text-left px-4 py-3">Applied</th>
                  <th className="text-left px-4 py-3">Confidence</th>
                  <th className="text-left px-4 py-3">Emails</th>
                  <th className="text-left px-4 py-3">Updated</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((app) => (
                  <tr key={app.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{app.company_name}</td>
                    <td className="px-4 py-3 text-gray-200">{app.role_title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${STATUS_COLORS[app.status]}`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current" />
                        {STATUS_OPTIONS.find((o) => o.value === app.status)?.label ?? app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{app.source ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{formatDate(app.applied_at)}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {app.confidence_score != null
                        ? `${Math.round(app.confidence_score * 100)}%`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{app.emails.length}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(app.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(app)}
                          className="p-2 rounded-md bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
                          title="Edit"
                          aria-label={`Edit ${app.company_name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(app)}
                          className="p-2 rounded-md bg-red-500/10 border border-red-500/30 text-red-200 hover:text-white hover:border-red-400/60 transition-colors"
                          title="Delete"
                          aria-label={`Delete ${app.company_name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle size={20} className="text-gray-600" />
                        <p className="text-sm">No records match the current filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SlideOver
        open={drawerOpen}
        title={editing ? 'Edit record' : 'Create record'}
        onClose={closeDrawer}
      >
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
              onClick={closeDrawer}
              className="px-4 py-2 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={!form.company_name.trim() || !form.role_title.trim() || createLoading || updateLoading}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-sm text-white font-medium"
            >
              {createLoading || updateLoading ? 'Saving…' : editing ? 'Save changes' : 'Create record'}
            </button>
          </div>
        </div>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete record"
        description={`Remove ${deleteTarget?.company_name ?? 'this application'}?`}
        onConfirm={() => deleteTarget && deleteMutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  )
}

export default ManageDataUiPage