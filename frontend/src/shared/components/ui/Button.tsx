import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { BUTTON_SIZE, BUTTON_VARIANT } from './buttonStyles.ts'
import type { ButtonSize, ButtonVariant } from './buttonStyles.ts'

export type { ButtonSize, ButtonVariant } from './buttonStyles.ts'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

const Button = ({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  iconPosition = 'left',
  children,
  disabled,
  className = '',
  ...rest
}: ButtonProps) => {
  const isDisabled = disabled || loading

  return (
    <button
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium transition-colors select-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {loading
        ? <Loader2 size={13} className="animate-spin shrink-0" />
        : (icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>)
      }
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  )
}

export default Button
