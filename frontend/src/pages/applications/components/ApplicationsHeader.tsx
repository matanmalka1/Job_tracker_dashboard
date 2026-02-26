import { Plus, Trash2, Download } from 'lucide-react'

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
      <h1 className="text-white text-2xl font-bold">Applications</h1>
      <p className="text-gray-400 text-sm mt-1">
        {total != null ? `${total} total application${total !== 1 ? 's' : ''}` : 'Loading…'}
      </p>
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      {selectedCount > 0 && (
        <button
          onClick={onBulkDelete}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-600/30 text-red-400 hover:bg-red-600/10 text-sm font-medium transition-colors"
        >
          <Trash2 size={15} />
          Delete {selectedCount}
        </button>
      )}
      <button
        onClick={onExport}
        disabled={disableExport}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-sm font-medium transition-colors disabled:opacity-40"
        title="Export current page to CSV"
      >
        <Download size={15} />
        Export
      </button>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
      >
        <Plus size={16} />
        Add Application
      </button>
    </div>
  </div>
)

export default ApplicationsHeader
