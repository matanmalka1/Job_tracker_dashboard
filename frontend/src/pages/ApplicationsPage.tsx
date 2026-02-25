import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../api/client.ts'
import type { ApplicationStatus, JobApplication } from '../types/index.ts'
import StatusBadge from '../components/ui/StatusBadge.tsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx'
import ApplicationModal from '../components/ui/ApplicationModal.tsx'
import SlideOver from '../components/ui/SlideOver.tsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.tsx'

const ALL_STATUSES: ApplicationStatus[] = [
  'new',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'hired',
]

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  hired: 'Hired',
}

interface EditFormState {
  company_name: string
  role_title: string
  status: ApplicationStatus
  source: string
  applied_at: string
}

const exportCsv = (apps: JobApplication[]) => {
  const headers = ['Company', 'Role', 'Status', 'Source', 'Applied Date', 'Confidence', 'Emails']
  const rows = apps.map((a) => [
    a.company_name,
    a.role_title,
    a.status,
    a.source ?? '',
    a.applied_at ? a.applied_at.slice(0, 10) : '',
    a.confidence_score != null ? `${Math.round(a.confidence_score * 100)}%` : '',
    a.emails.length,
  ])
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const ApplicationsPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editApp, setEditApp] = useState<JobApplication | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', 'list'],
    queryFn: () => fetchApplications({ limit: 500, offset: 0 }),
  })

  const { mutate: addApp, isPending: addPending } = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Application added')
      setAddOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { mutate: editMutate, isPending: editPending } = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<JobApplication> }) =>
      updateApplication(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Application updated')
      setEditApp(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { mutate: deleteMutate, isPending: deletePending } = useMutation({
    mutationFn: (id: number) => deleteApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Application deleted')
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const applications = data?.items ?? []

  const filtered = applications.filter((app) => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      app.company_name.toLowerCase().includes(q) ||
      app.role_title.toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const formatDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '—'

  const openEdit = (app: JobApplication) => {
    setEditApp(app)
    setEditForm({
      company_name: app.company_name,
      role_title: app.role_title,
      status: app.status,
      source: app.source ?? '',
      applied_at: app.applied_at ? app.applied_at.slice(0, 10) : '',
    })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editApp || !editForm) return
    editMutate({
      id: editApp.id,
      body: {
        company_name: editForm.company_name,
        role_title: editForm.role_title,
        status: editForm.status,
        source: editForm.source || undefined,
        applied_at: editForm.applied_at ? `${editForm.applied_at}T00:00:00Z` : undefined,
      },
    })
  }

  const setEditField =
    (key: keyof EditFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setEditForm((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Applications</h1>
          <p className="text-gray-400 text-sm mt-1">
            {data ? `${data.total} total application${data.total !== 1 ? 's' : ''}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCsv(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-medium transition-colors disabled:opacity-40"
            title="Export to CSV"
          >
            <Download size={15} />
            Export
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Application
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search company or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1a1a24] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
          />
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-[#1a1a24] p-1 rounded-lg border border-white/5 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={[
              'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
              statusFilter === 'all'
                ? 'bg-purple-600/20 text-purple-400'
                : 'text-gray-400 hover:text-white',
            ].join(' ')}
          >
            All
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={[
                'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                statusFilter === s
                  ? 'bg-purple-600/20 text-purple-400'
                  : 'text-gray-400 hover:text-white',
              ].join(' ')}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading && <LoadingSpinner size="lg" message="Loading applications…" />}

      {isError && (
        <div className="bg-[#1a1a24] rounded-xl p-8 border border-white/5 text-center">
          <p className="text-red-400 text-sm">Failed to load applications.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="bg-[#1a1a24] rounded-xl border border-white/5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Company', 'Role', 'Status', 'Source', 'Date', ''].map((col) => (
                  <th
                    key={col}
                    className="text-left text-gray-400 font-medium text-xs uppercase tracking-wider px-4 py-3"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500 text-sm">
                    {search || statusFilter !== 'all'
                      ? 'No applications match your filter.'
                      : 'No applications yet. Add your first one!'}
                  </td>
                </tr>
              )}
              {filtered.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  className="border-b border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{app.company_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300">{app.role_title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400 text-xs">{app.source ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400 text-xs">
                      {formatDate(app.applied_at ?? app.created_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openEdit(app)}
                        className="text-gray-500 hover:text-purple-400 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(app)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <ApplicationModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={addApp}
        loading={addPending}
      />

      {/* Edit SlideOver */}
      <SlideOver
        open={!!editApp}
        title="Edit Application"
        onClose={() => setEditApp(null)}
      >
        {editForm && (
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Company *</label>
              <input
                type="text"
                required
                value={editForm.company_name}
                onChange={setEditField('company_name')}
                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Role *</label>
              <input
                type="text"
                required
                value={editForm.role_title}
                onChange={setEditField('role_title')}
                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Status</label>
              <select
                value={editForm.status}
                onChange={setEditField('status')}
                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Source</label>
              <input
                type="text"
                value={editForm.source}
                onChange={setEditField('source')}
                placeholder="e.g. LinkedIn, Referral"
                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-medium mb-1.5">Applied Date</label>
              <input
                type="date"
                value={editForm.applied_at}
                onChange={setEditField('applied_at')}
                className="w-full bg-[#0f0f13] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors [color-scheme:dark]"
              />
            </div>

            {editApp && (
              <div className="pt-2 border-t border-white/5">
                <p className="text-gray-600 text-xs mb-1">Emails linked: {editApp.emails.length}</p>
                <p className="text-gray-600 text-xs">
                  Created: {formatDate(editApp.created_at)}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditApp(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 text-sm font-medium hover:text-white hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {editPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </SlideOver>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Application"
        description={
          deleteTarget
            ? `Are you sure you want to delete ${deleteTarget.company_name} — ${deleteTarget.role_title}? This cannot be undone.`
            : ''
        }
        onConfirm={() => deleteTarget && deleteMutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deletePending}
      />
    </div>
  )
}

export default ApplicationsPage
