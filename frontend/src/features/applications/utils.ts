import type { JobApplication } from '../../shared/types/job-tracker.ts'

// Neutralize CSV formula injection: company_name/role_title/source can come
// from parsed (untrusted) Gmail content, and a leading =/+/-/@ is interpreted
// as a formula by Excel/Sheets when the export is opened.
const FORMULA_TRIGGER_CHARS = new Set(['=', '+', '-', '@'])

const csvSafeCell = (value: string): string =>
  FORMULA_TRIGGER_CHARS.has(value[0]) ? `'${value}` : value

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
    .map((r) => r.map((v) => `"${csvSafeCell(String(v)).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
