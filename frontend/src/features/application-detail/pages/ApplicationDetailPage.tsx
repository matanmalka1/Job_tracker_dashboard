import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail } from 'lucide-react'
import { fetchApplication } from '../../../api/client.ts'
import LoadingSpinner from '../../../shared/components/feedback/LoadingSpinner.tsx'
import { Button, Card, SlideOver } from '@/shared/components/ui'
import ConfirmDialog from '../../../shared/components/feedback/ConfirmDialog.tsx'
import DetailHeader from '../components/DetailHeader.tsx'
import ApplicationStatsGrid from '../components/ApplicationStatsGrid.tsx'
import ApplicationMetaSection from '../components/ApplicationMetaSection.tsx'
import EmailThread from '../components/EmailThread.tsx'
import ActivityTimeline from '../components/ActivityTimeline.tsx'
import EditApplicationForm from '../components/EditApplicationForm.tsx'
import { useApplicationDetailActions } from '../hooks/useApplicationDetailActions.ts'

const ApplicationDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const appId = Number(id)

  const { data: app, isLoading, isError } = useQuery({
    queryKey: ['applications', appId],
    queryFn: () => fetchApplication(appId),
    enabled: !isNaN(appId) && appId > 0,
  })

  const actions = useApplicationDetailActions(appId, app)

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
        <Button
          onClick={() => navigate('/applications')}
          variant="ghost"
          icon={<ArrowLeft size={16} />}
        >
          Back to Applications
        </Button>
        <Card className="p-12 text-center">
          <p className="text-red-400 text-sm">Application not found.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Button
        onClick={() => navigate('/applications')}
        variant="ghost"
        icon={<ArrowLeft size={16} />}
      >
        Back to Applications
      </Button>

      <DetailHeader
        app={app}
        onEdit={actions.openEdit}
        onDelete={() => actions.setDeleteOpen(true)}
        onChangeStatus={actions.changeStatus}
      />
      <ApplicationStatsGrid app={app} />
      <ApplicationMetaSection app={app} />

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Mail size={16} className="text-t2" />
          <h2 className="text-t1 font-semibold text-sm">
            Email Thread
            {app.emails.length > 0 && <span className="ml-2 text-t2 font-normal">({app.emails.length})</span>}
          </h2>
        </div>
        <EmailThread emails={app.emails} />
      </Card>

      <ActivityTimeline app={app} />

      <SlideOver open={actions.editOpen} title="Edit Application" onClose={() => actions.setEditOpen(false)}>
        {actions.editForm && (
          <EditApplicationForm
            form={actions.editForm}
            onChange={actions.setEditField}
            onSubmit={actions.submitEdit}
            onCancel={() => actions.setEditOpen(false)}
            loading={actions.editPending}
          />
        )}
      </SlideOver>

      <ConfirmDialog
        open={actions.deleteOpen}
        title="Delete Application"
        description={`Are you sure you want to delete ${app.company_name} — ${app.role_title ?? 'this application'}? This cannot be undone.`}
        onConfirm={() => actions.submitDelete()}
        onCancel={() => actions.setDeleteOpen(false)}
        loading={actions.deletePending}
      />
    </div>
  )
}

export default ApplicationDetailPage
