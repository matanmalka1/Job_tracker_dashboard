export const SCAN_STAGES = [
  { key: 'fetching', label: 'Fetch', desc: 'Connecting to Gmail API', color: '#38bdf8' },
  { key: 'filtering', label: 'Filter', desc: 'Finding job-related emails', color: '#818cf8' },
  { key: 'saving', label: 'Save', desc: 'Writing emails to database', color: '#34d399' },
  { key: 'matching', label: 'Match', desc: 'Linking emails to apps', color: '#fb923c' },
  { key: 'creating', label: 'Create', desc: 'Spawning new applications', color: '#f472b6' },
]

export const SCAN_STAGE_COLOR: Record<string, string> = {
  ...Object.fromEntries(SCAN_STAGES.map((stage) => [stage.key, stage.color])),
  done: '#34d399',
  error: '#f87171',
  sys: '#64748b',
  system: '#64748b',
  result: '#34d399',
  event: '#94a3b8',
}

export const LOG_TYPE_COLOR: Record<string, string> = {
  info: '#94a3b8',
  success: '#34d399',
  error: '#f87171',
  warn: '#fb923c',
}
