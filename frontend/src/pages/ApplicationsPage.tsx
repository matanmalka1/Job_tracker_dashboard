import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Pencil, Trash2, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../api/client.ts'
import type { ApplicationStatus, ApplicationWritePayload, JobApplication } from '../types/index.ts'
import StatusBadge from '../components/ui/StatusBadge.tsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx'
import ApplicationModal from '../components/ui/ApplicationModal.tsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.tsx'

const ALL_STATUSES: ApplicationStatus[] = [
  'new', 'applied', 'interviewing', 'offer', 'rejected', 'hired',
]

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: 'New', applied: 'Applied', interviewing: 'Interviewing',
  offer: 'Offer', rejected: 'Rejected', hired: 'Hired',
}

const PAGE_SIZE = 25

const exportCsv = (apps: JobApplication[]) => {
  const headers = ['Company', 'Role', 'Status', 'Source', 'Applied Date', 'Confidence', 'Emails']
  const rows = apps.map((a) => [
    a.company_name, a.role_title ?? '', a.status, a.source ?? '',
    a.applied_at ? a.applied_at.slice(0, 10) : '',
    a.confidence_score != null ? `${Math.round(a.confidence_score * 100)}%` : '',
    a.email_count,
  ])
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
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
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [editApp, setEditApp] = useState<JobApplication | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  // Debounce search input
  const onSearchChange = (val: string) => {
    setSearch(val)
    setPage(0)
    clearTimeout((onSearchChange as unknown as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(onSearchChange as unknown as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(
      () => setDebouncedSearch(val), 300,
    )
  }

  const queryParams = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    sort: 'updated_at' as const,
  }

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['applications', 'list', queryParams],
    queryFn: () => fetchApplications(queryParams),
    placeholderData: (prev) => prev,
  })

  const { mutate: addApp, isPending: addPending } = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Application added')
      setAddOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { mutate: editMutate, isPending: editPending } = useMutation({
    mutationFn: (body: Partial<ApplicationWritePayload>) => {
      if (!editApp) return Promise.reject(new Error('No application selected'))
      return updateApplication(editApp.id, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Application updated')
      setEditApp(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { mutate: deleteMutate, isPending: deletePending } = useMutation({
    mutationFn: (id: number) => deleteApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Application deleted')
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { mutate: bulkDelete, isPending: bulkPending } = useMutation({
    mutationFn: async (ids: number[]) => {
      // Sequential deletes reusing existing endpoint
      await Promise.all(ids.map((id) => deleteApplication(id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success(`${selectedIds.size} applications deleted`)
      setSelectedIds(new Set())
      setBulkDeleteOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const applications = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const allOnPageSelected =
    applications.length > 0 && applications.every((a) => selectedIds.has(a.id))

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        applications.forEach((a) => next.delete(a.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        applications.forEach((a) => next.add(a.id))
        return next
      })
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  const changeFilter = (f: ApplicationStatus | 'all') => {
    setStatusFilter(f)
    setPage(0)
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold">Applications</h1>
          <p className="text-gray-400 text-sm mt-1">
            {data ? `${total} total application${total !== 1 ? 's' : ''}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-600/30 text-red-400 hover:bg-red-600/10 text-sm font-medium transition-colors"
            >
              <Trash2 size={15} />
              Delete {selectedIds.size}
            </button>
          )}
          <button
            onClick={() => exportCsv(applications)}
            disabled={applications.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-medium transition-colors disabled:opacity-40"
            title="Export current page to CSV"
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
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search company or role…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#1a1a24] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-[#1a1a24] p-1 rounded-lg border border-white/5 overflow-x-auto">
          <button
            onClick={() => changeFilter('all')}
            className={['px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors', statusFilter === 'all' ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:text-white'].join(' ')}
          >
            All
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => changeFilter(s)}
              className={['px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors', statusFilter === s ? 'bg-purple-600/20 text-purple-400' : 'text-gray-400 hover:text-white'].join(' ')}
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
        <div className={['bg-[#1a1a24] rounded-xl border border-white/5 overflow-x-auto transition-opacity', isFetching ? 'opacity-70' : ''].join(' ')}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="accent-purple-500 cursor-pointer"
                    aria-label="Select all on page"
                  />
                </th>
                {['Company', 'Role', 'Status', 'Source', 'Date', 'Emails', ''].map((col) => (
                  <th key={col} className="text-left text-gray-400 font-medium text-xs uppercase tracking-wider px-4 py-3">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {applications.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500 text-sm">
                    {debouncedSearch || statusFilter !== 'all'
                      ? 'No applications match your filter.'
                      : 'No applications yet. Add your first one!'}
                  </td>
                </tr>
              )}
              {applications.map((app) => (
                <tr
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  className={['border-b border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer', selectedIds.has(app.id) ? 'bg-purple-600/5' : ''].join(' ')}
                >
                  <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(app.id) }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(app.id)}
                      onChange={() => toggleSelect(app.id)}
                      className="accent-purple-500 cursor-pointer"
                      aria-label={`Select ${app.company_name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{app.company_name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-300">{app.role_title ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400 text-xs">{app.source ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-400 text-xs">{formatDate(app.applied_at ?? app.created_at)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-500 text-xs">{app.email_count > 0 ? `${app.email_count} email${app.email_count !== 1 ? 's' : ''}` : '—'}</span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setEditApp(app)} className="text-gray-500 hover:text-purple-400 transition-colors" title="Edit" aria-label={`Edit ${app.company_name}`}>
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeleteTarget(app)} className="text-gray-500 hover:text-red-400 transition-colors" title="Delete" aria-label={`Delete ${app.company_name}`}>
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

      {/* Pagination */}
      {!isLoading && !isError && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-500 text-xs">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-gray-400 text-xs px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <ApplicationModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={(data) => addApp(data)} loading={addPending} />

      {/* Edit Modal */}
      <ApplicationModal open={!!editApp} initial={editApp} onClose={() => setEditApp(null)} onSubmit={(data) => editMutate(data)} loading={editPending} />

      {/* Single Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Application"
        description={deleteTarget ? `Delete ${deleteTarget.company_name} — ${deleteTarget.role_title ?? 'Unknown Role'}? This cannot be undone.` : ''}
        onConfirm={() => deleteTarget && deleteMutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deletePending}
      />

      {/* Bulk Delete */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.size} Applications`}
        description={`This will permanently delete ${selectedIds.size} application${selectedIds.size !== 1 ? 's' : ''}. This cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size}`}
        onConfirm={() => bulkDelete(Array.from(selectedIds))}
        onCancel={() => setBulkDeleteOpen(false)}
        loading={bulkPending}
      />
    </div>
  )
}

export default ApplicationsPage