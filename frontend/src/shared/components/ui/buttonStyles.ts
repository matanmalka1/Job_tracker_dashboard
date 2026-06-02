export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent hover:bg-accent-dim text-white border border-accent/80',
  secondary: 'bg-transparent hover:bg-hover text-t1 border border-DEFAULT hover:border-mid',
  ghost: 'bg-transparent hover:bg-hover text-t2 hover:text-t1 border border-transparent',
  danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-600',
}

export const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-7 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-8 px-3.5 text-[13px] gap-2 rounded-lg',
  lg: 'h-9 px-4 text-sm gap-2 rounded-xl',
}
