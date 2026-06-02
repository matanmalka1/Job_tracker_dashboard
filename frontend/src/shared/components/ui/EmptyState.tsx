import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

const EmptyState = ({ icon, title, description, action, className = '' }: EmptyStateProps) => (
  <div className={['flex flex-col items-center justify-center py-14 px-6 text-center', className].join(' ')}>
    {icon && (
      <div className="mb-4 w-12 h-12 rounded-2xl bg-raised flex items-center justify-center text-t3 border border-DEFAULT">
        {icon}
      </div>
    )}
    <p className="text-t1 font-medium text-sm mb-1">{title}</p>
    {description && <p className="text-t2 text-xs max-w-[280px]">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)

export default EmptyState
