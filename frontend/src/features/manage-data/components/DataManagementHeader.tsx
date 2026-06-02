import { Database, Plus, RefreshCw } from 'lucide-react'
import { Button, IconButton } from '@/shared/components/ui'

interface Props {
  onRefresh: () => void
  onCreate: () => void
  isFetching: boolean
}

const DataManagementHeader = ({ onRefresh, onCreate, isFetching }: Props) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-500/15 border border-indigo-500/25">
          <Database size={14} className="text-indigo-400" />
        </div>
        <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-t3">
          sys.manage_data
        </span>
      </div>
      <h1 className="text-xl font-semibold tracking-tight text-t1">Data Manager</h1>
      <p className="text-[13px] text-t2">Direct read/write access to all job application records.</p>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      <IconButton
        onClick={onRefresh}
        title="Refresh"
        label="Refresh"
        variant="secondary"
      >
        <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
      </IconButton>

      <Button
        onClick={onCreate}
        icon={<Plus size={14} />}
      >
        New record
      </Button>
    </div>
  </div>
)

export default DataManagementHeader
