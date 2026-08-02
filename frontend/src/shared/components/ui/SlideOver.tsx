import { X } from 'lucide-react'
import { useDialogA11y } from '../../hooks/useDialogA11y.ts'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

const SlideOver = ({ open, title, onClose, children }: Props) => {
  const panelRef = useDialogA11y<HTMLDivElement>(open, onClose)

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface border-l border-DEFAULT shadow-2xl flex flex-col transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-DEFAULT">
          <h2 className="text-t1 font-semibold text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-t2 hover:text-t1 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </>
  )
}

export default SlideOver
