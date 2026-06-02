import type { TextareaHTMLAttributes } from 'react'
import { INPUT_BASE, INPUT_NORMAL, INPUT_ERROR } from './Input.tsx'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

const Textarea = ({ error, className = '', ...rest }: TextareaProps) => (
  <textarea
    className={[
      INPUT_BASE,
      error ? INPUT_ERROR : INPUT_NORMAL,
      'resize-none',
      className,
    ].join(' ')}
    {...rest}
  />
)

export default Textarea
