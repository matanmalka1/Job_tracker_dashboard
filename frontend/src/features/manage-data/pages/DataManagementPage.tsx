import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { SlideOver } from '@/shared/components/ui'
import ConfirmDialog from '../../../shared/components/feedback/ConfirmDialog.tsx'
import LoadingSpinner from '../../../shared/components/feedback/LoadingSpinner.tsx'
import type { ApplicationStatus, ApplicationWritePayload, JobApplication } from '../../../shared/types/job-tracker.ts'
import { fetchApplications, createApplication, updateApplication, deleteApplication } from '../../../api/client.ts'
import DataManagementHeader from '../components/DataManagementHeader.tsx'
import FiltersBar from '../components/FiltersBar.tsx'
import DataManagementTable from '../components/DataManagementTable.tsx'
import ApplicationForm from '../components/ApplicationForm.tsx'
import PaginationBar from '../../applications/components/PaginationBar.tsx'
import { EMPTY_FORM } from '../types.ts'
import { applicationToFormState, formStateToPayload } from '../utils.ts'

const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300

const DataManagementPage = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')
  const [page, setPage] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<JobApplication | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<JobApplication | null>(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [search])

  const queryParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: debouncedSearch.trim() || undefined,
    }),
    [debouncedSearch, page, statusFilter],
  )

  const { data, isLoading, isError, refetch: reloadApplications, isFetching } = useQuery({
    queryKey: ['applications', 'manage-data', queryParams],
    queryFn: () => fetchApplications(queryParams),
    placeholderData: (prev) => prev,
  })

  const applications = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const setSearchAndReset = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  const setStatusAndReset = (value: ApplicationStatus | 'all') => {
    setStatusFilter(value)
    setPage(0)
  }

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['applications'] })
    queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    queryClient.invalidateQueries({ queryKey: ['companies'] })
    queryClient.invalidateQueries({ queryKey: ['stats'] })
  }

  const handlePageAfterDelete = (deletedCount = 1) => {
    if (page > 0 && applications.length - deletedCount <= 0) {
      setPage((p) => p - 1)
    }
  }

  const { mutate: createMutate, isPending: createLoading } = useMutation({
    mutationFn: createApplication,
    onSuccess: () => {
      toast.success('Record created')
      invalidateAll()
      closeDrawer()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { mutate: updateMutate, isPending: updateLoading } = useMutation({
    mutationFn: (body: Partial<ApplicationWritePayload>) => {
      if (!editing) return Promise.reject(new Error('No record selected'))
      return updateApplication(editing.id, body)
    },
    onSuccess: () => {
      toast.success('Record updated')
      invalidateAll()
      closeDrawer()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { mutate: deleteMutate, isPending: deleteLoading } = useMutation({
    mutationFn: (id: number) => deleteApplication(id),
    onSuccess: () => {
      toast.success('Record deleted')
      handlePageAfterDelete(1)
      invalidateAll()
      setDeleteTarget(null)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDrawerOpen(true)
  }

  const openEdit = (app: JobApplication) => {
    setEditing(app)
    setForm(applicationToFormState(app))
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const onSubmit = () => {
    if (!form.company_name.trim()) return
    const payload = formStateToPayload(form)
    if (editing) updateMutate(payload)
    else createMutate(payload)
  }

  return (
    <div className="space-y-6">
      <DataManagementHeader onRefresh={() => void reloadApplications()} onCreate={openCreate} isFetching={isFetching} />

      <FiltersBar
        search={search}
        statusFilter={statusFilter}
        onSearch={setSearchAndReset}
        onStatusChange={setStatusAndReset}
        count={total}
      />

      <div className="bg-surface border border-DEFAULT rounded-xl overflow-hidden">
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
          <DataManagementTable applications={applications} onEdit={openEdit} onDelete={setDeleteTarget} />
        )}
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <SlideOver open={drawerOpen} title={editing ? 'Edit record' : 'Create record'} onClose={closeDrawer}>
        <ApplicationForm
          form={form}
          setForm={setForm}
          onSubmit={onSubmit}
          onCancel={closeDrawer}
          loading={createLoading || updateLoading}
          editing={Boolean(editing)}
        />
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

export default DataManagementPage
