import type { ReactNode } from 'react'

interface SectionLabelProps {
  children: ReactNode
  className?: string
}

const SectionLabel = ({ children, className = '' }: SectionLabelProps) => (
  <span className={['section-label', className].join(' ')}>{children}</span>
)

export default SectionLabel
