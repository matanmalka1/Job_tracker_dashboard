import { AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/components/ui'

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
      <div className="relative bg-surface border border-DEFAULT rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-t1 font-semibold text-sm">{title}</h3>
            <p className="text-t2 text-sm mt-1">{description}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            disabled={loading}
            variant="secondary"
            className="flex-1 h-auto py-2.5"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            loading={loading}
            variant="danger"
            className="flex-1 h-auto py-2.5"
          >
            {loading ? 'Deleting…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
