import type { ReactNode } from 'react'
import { BUTTON_VARIANT } from './Button.tsx'
import type { ButtonVariant, ButtonSize } from './Button.tsx'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  label: string
  children?: ReactNode
}

const ICON_SIZE: Record<ButtonSize, string> = {
  sm: 'w-6 h-6 rounded-md',
  md: 'w-8 h-8 rounded-lg',
  lg: 'w-9 h-9 rounded-xl',
}

const IconButton = ({
  variant = 'ghost',
  size = 'md',
  label,
  children,
  className = '',
  ...rest
}: IconButtonProps) => (
  <button
    aria-label={label}
    className={[
      'inline-flex items-center justify-center flex-shrink-0 transition-colors',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      BUTTON_VARIANT[variant],
      ICON_SIZE[size],
      className,
    ].join(' ')}
    {...rest}
  >
    {children}
  </button>
)

export default IconButton
