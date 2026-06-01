import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  loading,
}: Props) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{title}</h3>
            <p className="text-gray-400 text-sm mt-1">{description}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-gray-400 text-sm font-medium hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
