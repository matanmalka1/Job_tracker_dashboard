import type { JobApplication } from '../../types/index.ts'

export const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export const exportCsv = (apps: JobApplication[]) => {
  const headers = ['Company', 'Role', 'Status', 'Source', 'Applied Date', 'Confidence', 'Emails']
  const rows = apps.map((a) => [
    a.company_name,
    a.role_title ?? '',
    a.status,
    a.source ?? '',
    a.applied_at ? a.applied_at.slice(0, 10) : '',
    a.confidence_score != null ? `${Math.round(a.confidence_score * 100)}%` : '',
    a.email_count,
  ])
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
