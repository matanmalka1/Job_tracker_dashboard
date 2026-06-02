import type { LabelHTMLAttributes, ReactNode } from 'react'

// ─── Label ────────────────────────────────────────────────────────────────────

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export const Label = ({ required, children, className = '', ...rest }: LabelProps) => (
  <label
    className={['block text-xs text-t2 font-medium mb-1.5', className].join(' ')}
    {...rest}
  >
    {children}
    {required && <span className="ml-0.5 text-red-400">*</span>}
  </label>
)

// ─── FormField ────────────────────────────────────────────────────────────────

interface FormFieldProps {
  label?: string
  htmlFor?: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

const FormField = ({ label, htmlFor, required, hint, error, children, className = '' }: FormFieldProps) => (
  <div className={['space-y-1', className].join(' ')}>
    {label && (
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
    )}
    {children}
    {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    {!error && hint && <p className="text-[11px] text-t3 mt-1">{hint}</p>}
  </div>
)

export default FormField
