import type { ReactNode } from 'react'

interface KbdProps {
  children: ReactNode
  className?: string
}

const Kbd = ({ children, className = '' }: KbdProps) => (
  <kbd
    className={[
      'inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono',
      'bg-raised border border-DEFAULT text-t3 leading-none select-none',
      className,
    ].join(' ')}
  >
    {children}
  </kbd>
)

export default Kbd
