import { Database, Plus, RefreshCw } from 'lucide-react'

interface Props {
  onRefresh: () => void
  onCreate: () => void
  isFetching: boolean
}

const PageHeader = ({ onRefresh, onCreate, isFetching }: Props) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-[0.08em]">
      <Database size={16} className="text-purple-400" />
      Manage Data
    </div>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-white text-2xl font-bold">Data Manager</h1>
        <p className="text-gray-400 text-sm">
          Live data from the database — create, edit, or delete job application rows directly.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New record
        </button>
      </div>
    </div>
  </div>
)

export default PageHeader
