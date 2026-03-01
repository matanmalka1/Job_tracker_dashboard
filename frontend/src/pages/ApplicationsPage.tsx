import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from '../api/client.ts'
import type { ApplicationStatus, ApplicationWritePayload, JobApplication } from '../types/index.ts'
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx'
import ApplicationModal from '../components/ui/ApplicationModal.tsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.tsx'
import ApplicationsHeader from './applications/components/ApplicationsHeader.tsx'
import SearchAndFilters from './applications/components/SearchAndFilters.tsx'
import ApplicationsTable from './applications/components/ApplicationsTable.tsx'
import PaginationBar from './applications/components/PaginationBar.tsx'
import { PAGE_SIZE } from './applications/constants.ts'
import { exportCsv } from './applications/utils.ts'

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

  const onSearchChange = (val: string) => {
    setSearch(val)
    setPage(0)
    clearTimeout((onSearchChange as unknown as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(onSearchChange as unknown as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(
      () => setDebouncedSearch(val),
      300,
    )
  }

  const queryParams = {
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: debouncedSearch || undefined,
    sort: 'last_email_at' as const,
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
    mutationFn: async (ids: number[]) => Promise.all(ids.map((id) => deleteApplication(id))),
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

  const allOnPageSelected = applications.length > 0 && applications.every((a) => selectedIds.has(a.id))

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

  const changeFilter = (f: ApplicationStatus | 'all') => {
    setStatusFilter(f)
    setPage(0)
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-6">
      <ApplicationsHeader
        total={total}
        selectedCount={selectedIds.size}
        onBulkDelete={() => setBulkDeleteOpen(true)}
        onExport={() => exportCsv(applications)}
        onAdd={() => setAddOpen(true)}
        disableExport={applications.length === 0}
      />

      <SearchAndFilters
        search={search}
        onSearchChange={onSearchChange}
        statusFilter={statusFilter}
        onStatusChange={changeFilter}
      />

      {isLoading && <LoadingSpinner size="lg" message="Loading applications…" />}

      {isError && (
        <div className="bg-[#1a1a24] rounded-xl p-8 border border-white/5 text-center">
          <p className="text-red-400 text-sm">Failed to load applications.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <ApplicationsTable
          applications={applications}
          selectedIds={selectedIds}
          allOnPageSelected={allOnPageSelected}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelect={toggleSelect}
          onEdit={setEditApp}
          onDelete={setDeleteTarget}
          onRowClick={(id) => navigate(`/applications/${id}`)}
          dimmed={isFetching}
        />
      )}

      {!isLoading && !isError && (
        <PaginationBar page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}

      <ApplicationModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={(data) => addApp(data)} loading={addPending} />

      <ApplicationModal open={!!editApp} initial={editApp} onClose={() => setEditApp(null)} onSubmit={(data) => editMutate(data)} loading={editPending} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Application"
        description={
          deleteTarget ? `Delete ${deleteTarget.company_name} — ${deleteTarget.role_title ?? 'Unknown Role'}? This cannot be undone.` : ''
        }
        onConfirm={() => deleteTarget && deleteMutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        loading={deletePending}
      />

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
