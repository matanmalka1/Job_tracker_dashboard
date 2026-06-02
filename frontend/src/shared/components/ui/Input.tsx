import { Search } from 'lucide-react'
import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  error?: boolean
}

export const INPUT_BASE =
  'w-full bg-raised border text-t1 text-[13px] rounded-lg px-3 py-2 placeholder-t3 ' +
  'focus:outline-none transition-all ' +
  'disabled:opacity-40 disabled:cursor-not-allowed'

export const INPUT_NORMAL = 'border-DEFAULT focus:border-accent/60 focus:ring-1 focus:ring-accent/25'
export const INPUT_ERROR  = 'border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/25'

const Input = forwardRef<HTMLInputElement, InputProps>(({ leadingIcon, trailingIcon, error, className = '', ...rest }, ref) => {
  if (!leadingIcon && !trailingIcon) {
    return (
      <input
        ref={ref}
        className={[INPUT_BASE, error ? INPUT_ERROR : INPUT_NORMAL, className].join(' ')}
        {...rest}
      />
    )
  }

  return (
    <div className="relative flex items-center">
      {leadingIcon && (
        <span className="pointer-events-none absolute left-3 text-t3">
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        className={[
          INPUT_BASE,
          error ? INPUT_ERROR : INPUT_NORMAL,
          leadingIcon  ? 'pl-8' : '',
          trailingIcon ? 'pr-8' : '',
          className,
        ].join(' ')}
        {...rest}
      />
      {trailingIcon && (
        <span className="pointer-events-none absolute right-3 text-t3">
          {trailingIcon}
        </span>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export const SearchInput = (props: Omit<InputProps, 'leadingIcon' | 'type'>) => (
  <Input type="search" leadingIcon={<Search size={13} />} {...props} />
)

export default Input
