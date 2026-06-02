import { Plus, Trash2, Download } from 'lucide-react'
import { Button } from '@/shared/components/ui'

interface Props {
  total?: number
  selectedCount: number
  onBulkDelete: () => void
  onExport: () => void
  onAdd: () => void
  disableExport: boolean
}

const ApplicationsHeader = ({ total, selectedCount, onBulkDelete, onExport, onAdd, disableExport }: Props) => (
  <div className="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 className="text-t1 text-2xl font-bold">Applications</h1>
      <p className="text-t2 text-sm mt-1">
        {total != null ? `${total} total application${total !== 1 ? 's' : ''}` : 'Loading…'}
      </p>
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      {selectedCount > 0 && (
        <Button
          onClick={onBulkDelete}
          variant="danger"
          icon={<Trash2 size={15} />}
        >
          Delete {selectedCount}
        </Button>
      )}
      <Button
        onClick={onExport}
        disabled={disableExport}
        variant="secondary"
        icon={<Download size={15} />}
        title="Export current page to CSV"
      >
        Export
      </Button>
      <Button
        onClick={onAdd}
        icon={<Plus size={16} />}
      >
        Add Application
      </Button>
    </div>
  </div>
)

export default ApplicationsHeader
