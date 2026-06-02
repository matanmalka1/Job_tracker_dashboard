import { Pencil, Trash2 } from 'lucide-react'
import { Button, Card, SelectField } from '@/shared/components/ui'
import type { ApplicationStatus, JobApplication } from '../../../shared/types/job-tracker.ts'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '../../../shared/constants/applicationStatus.ts'

interface Props {
  app: JobApplication
  onEdit: () => void
  onDelete: () => void
  onChangeStatus: (status: ApplicationStatus) => void
}

const DetailHeader = ({ app, onEdit, onDelete, onChangeStatus }: Props) => (
  <Card className="p-6">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center">
          <span className="text-purple-400 font-bold text-lg">{app.company_name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h1 className="text-t1 text-xl font-bold">{app.company_name}</h1>
          <p className="text-t2 text-sm mt-0.5">{app.role_title ?? '—'}</p>
          <div className="flex items-center gap-3 mt-2">
            <SelectField
              value={app.status}
              onChange={(e) => onChangeStatus(e.target.value as ApplicationStatus)}
              className="bg-transparent px-2 py-1 text-xs font-medium"
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {APPLICATION_STATUS_LABELS[s]}
                </option>
              ))}
            </SelectField>
            {app.source && <span className="text-t2 text-xs">via {app.source}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          onClick={onEdit}
          variant="secondary"
          size="sm"
          icon={<Pencil size={13} />}
        >
          Edit
        </Button>
        <Button
          onClick={onDelete}
          variant="danger"
          size="sm"
          icon={<Trash2 size={13} />}
        >
          Delete
        </Button>
      </div>
    </div>
  </Card>
)

export default DetailHeader
