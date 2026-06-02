import type { ReactNode, SelectHTMLAttributes } from 'react'
import { INPUT_BASE, INPUT_NORMAL, INPUT_ERROR } from './Input.tsx'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  leadingIcon?: ReactNode
  error?: boolean
}

const SelectField = ({ leadingIcon, error, className = '', children, ...rest }: SelectFieldProps) => (
  <div className="relative flex items-center">
    {leadingIcon && (
      <span className="pointer-events-none absolute left-3 text-t3 z-10">
        {leadingIcon}
      </span>
    )}
    <select
      className={[
        INPUT_BASE,
        'appearance-none cursor-pointer',
        error ? INPUT_ERROR : INPUT_NORMAL,
        leadingIcon ? 'pl-8' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </select>
  </div>
)

export default SelectField
