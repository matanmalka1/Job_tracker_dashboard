const DATE_FORMATS = {
  short: { month: 'short', day: 'numeric', year: 'numeric' },
  long: { month: 'long', day: 'numeric', year: 'numeric' },
  dateTime: {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>

export const formatShortDate = (iso?: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-US', DATE_FORMATS.short) : '—'

export const formatLongDate = (iso?: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-US', DATE_FORMATS.long) : '—'

export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', DATE_FORMATS.dateTime)

export const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export const toDateInputValue = (iso?: string | null): string => (iso ? iso.slice(0, 10) : '')

export const dateInputToApiDate = (date: string): string | undefined =>
  date ? `${date}T00:00:00Z` : undefined
