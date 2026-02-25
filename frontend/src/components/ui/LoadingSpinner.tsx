interface Props {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

const SIZE_CLASSES = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-2',
}

const LoadingSpinner = ({ size = 'md', message }: Props) => (
  <div className="flex flex-col items-center justify-center gap-3 py-8">
    <div
      className={[
        SIZE_CLASSES[size],
        'rounded-full border-white/10 border-t-purple-500 animate-spin',
      ].join(' ')}
    />
    {message && <p className="text-gray-400 text-sm">{message}</p>}
  </div>
)

export default LoadingSpinner
