interface DividerProps {
  className?: string
  vertical?: boolean
}

const Divider = ({ className = '', vertical }: DividerProps) =>
  vertical ? (
    <div
      className={['w-px self-stretch', className].join(' ')}
      style={{ background: 'var(--border)' }}
    />
  ) : (
    <div className={['divider', className].join(' ')} />
  )

export default Divider
