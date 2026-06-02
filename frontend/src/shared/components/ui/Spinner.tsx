type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: SpinnerSize
  className?: string
}

const SIZE: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-9 h-9 border-2',
}

const Spinner = ({ size = 'md', className = '' }: SpinnerProps) => (
  <div
    className={[
      'rounded-full animate-spin shrink-0',
      SIZE[size],
      className,
    ].join(' ')}
    style={{ borderColor: 'transparent', borderTopColor: 'var(--accent)' }}
    role="status"
    aria-label="Loading"
  />
)

export default Spinner
