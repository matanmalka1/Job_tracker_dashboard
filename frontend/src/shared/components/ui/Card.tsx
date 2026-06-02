import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
  onClick?: () => void
  hoverable?: boolean
}

const Card = ({ children, className = '', padding = true, onClick, hoverable }: CardProps) => (
  <div
    onClick={onClick}
    className={[
      'panel',
      padding ? 'p-4' : '',
      hoverable ? 'cursor-pointer hover:border-mid transition-colors' : '',
      onClick && !hoverable ? 'cursor-pointer' : '',
      className,
    ].join(' ')}
  >
    {children}
  </div>
)

export default Card
