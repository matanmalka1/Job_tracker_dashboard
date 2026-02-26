import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { fetchApplication, updateApplication, deleteApplication } from '../api/client.ts'
import type { ApplicationStatus } from '../types/index.ts'
import LoadingSpinner from '../components/ui/LoadingSpinner.tsx'
import SlideOver from '../components/ui/SlideOver.tsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.tsx'
import DetailHeader from './applicationDetail/components/DetailHeader.tsx'
import StatsGrid from './applicationDetail/components/StatsGrid.tsx'
import MetaSection from './applicationDetail/components/MetaSection.tsx'
import EmailThread from './applicationDetail/components/EmailThread.tsx'
import ActivityTimeline from './applicationDetail/components/ActivityTimeline.tsx'
import EditApplicationForm from './applicationDetail/components/EditApplicationForm.tsx'
import type { EditFormState } from './applicationDetail/types.ts'

const ApplicationDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)

  const appId = Number(id)

  const { data: app, isLoading, isError } = useQuery({
    queryKey: ['applications', appId],
    queryFn: () => fetchApplication(appId),
    enabled: !isNaN(appId) && appId > 0,
  })

  const { mutate: editMutate, isPending: editPending } = useMutation({
    mutationFn: (body: Partial<EditFormState>) => updateApplication(appId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Application updated')
      setEditOpen(false)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { mutate: deleteMutate, isPending: deletePending } = useMutation({
    mutationFn: () => deleteApplication(appId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Application deleted')
      navigate('/applications')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const { mutate: changeStatus } = useMutation({
    mutationFn: (status: ApplicationStatus) => updateApplication(appId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const openEdit = () => {
    if (!app) return
    setEditForm({
      company_name: app.company_name,
      role_title: app.role_title ?? '',
      status: app.status,
      source: app.source ?? '',
      applied_at: app.applied_at ? app.applied_at.slice(0, 10) : '',
      notes: app.notes ?? '',
      job_url: app.job_url ?? '',
      next_action_at: app.next_action_at ? app.next_action_at.slice(0, 10) : '',
    })
    setEditOpen(true)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm) return
    editMutate({
      company_name: editForm.company_name,
      role_title: editForm.role_title,
      status: editForm.status,
      source: editForm.source || undefined,
      applied_at: editForm.applied_at ? `${editForm.applied_at}T00:00:00Z` : undefined,
      notes: editForm.notes || undefined,
      job_url: editForm.job_url || undefined,
      next_action_at: editForm.next_action_at ? `${editForm.next_action_at}T00:00:00Z` : undefined,
    })
  }

  const setEditField =
    (key: keyof EditFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEditForm((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" message="Loading application…" />
      </div>
    )
  }

  if (isError || !app) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/applications')}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Applications
        </button>
        <div className="bg-[#1a1a24] rounded-xl p-12 border border-white/5 text-center">
          <p className="text-red-400 text-sm">Application not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <button
        onClick={() => navigate('/applications')}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Applications
      </button>

      <DetailHeader app={app} onEdit={openEdit} onDelete={() => setDeleteOpen(true)} onChangeStatus={changeStatus} />
      <StatsGrid app={app} />
      <MetaSection app={app} />

      <div className="bg-[#1a1a24] border border-white/5 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Mail size={16} className="text-gray-400" />
          <h2 className="text-white font-semibold text-sm">
            Email Thread
            {app.emails.length > 0 && <span className="ml-2 text-gray-500 font-normal">({app.emails.length})</span>}
          </h2>
        </div>
        <EmailThread emails={app.emails} />
      </div>

      <ActivityTimeline app={app} />

      <SlideOver open={editOpen} title="Edit Application" onClose={() => setEditOpen(false)}>
        {editForm && (
          <EditApplicationForm
            form={editForm}
            onChange={setEditField}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditOpen(false)}
            loading={editPending}
          />
        )}
      </SlideOver>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Application"
        description={`Are you sure you want to delete ${app.company_name} — ${app.role_title ?? 'this application'}? This cannot be undone.`}
        onConfirm={() => deleteMutate()}
        onCancel={() => setDeleteOpen(false)}
        loading={deletePending}
      />
    </div>
  )
}

export default ApplicationDetailPage
