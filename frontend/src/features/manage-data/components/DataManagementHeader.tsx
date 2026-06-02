import { Database, Plus, RefreshCw } from 'lucide-react'

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
      <button
        onClick={onRefresh}
        title="Refresh"
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-mid bg-raised text-t2 hover:border-hi hover:text-t1 transition-colors"
      >
        <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
      </button>

      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium bg-indigo-500/[0.18] border border-indigo-500/35 text-indigo-300 hover:bg-indigo-500/25 hover:border-indigo-500/55 hover:text-indigo-200 transition-colors"
      >
        <Plus size={14} />
        New record
      </button>
    </div>
  </div>
)

export default DataManagementHeader
