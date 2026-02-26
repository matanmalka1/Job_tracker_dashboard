import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import SlideOver from '../components/ui/SlideOver.tsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.tsx'
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx'
import type { ApplicationStatus, ApplicationWritePayload, JobApplication } from '../types/index.ts'
import { fetchApplications, createApplication, updateApplication, deleteApplication } from '../api/client.ts'
import PageHeader from './manageDataUi/components/PageHeader.tsx'
import FiltersBar from './manageDataUi/components/FiltersBar.tsx'
import ApplicationsTable from './manageDataUi/components/ApplicationsTable.tsx'
import ApplicationForm from './manageDataUi/components/ApplicationForm.tsx'
import { EMPTY_FORM } from './manageDataUi/types.ts'

const ManageDataUiPage = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<JobApplication | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
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
        (app.role_title?.toLowerCase().includes(q) ?? false) ||
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
      role_title: app.role_title ?? '',
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
      confidence_score: form.confidence_score.trim() === '' ? undefined : Number(form.confidence_score) / 100,
    }
    if (editing) updateMutate(payload)
    else createMutate(payload)
  }

  return (
    <div className="space-y-6">
      <PageHeader onRefresh={() => void refetch()} onCreate={openCreate} isFetching={isFetching} />

      <FiltersBar
        search={search}
        statusFilter={statusFilter}
        onSearch={setSearch}
        onStatusChange={setStatusFilter}
        count={filtered.length}
      />

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
          <ApplicationsTable applications={filtered} onEdit={openEdit} onDelete={setDeleteTarget} />
        )}
      </div>

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

export default ManageDataUiPage
