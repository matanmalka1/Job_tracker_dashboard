/**
 * True only for absolute http(s) URLs. job_url can originate from parsed
 * (untrusted) Gmail content, not just the manual-entry form, so a
 * javascript:/data: URI must never be rendered as a clickable href.
 */
export const isSafeHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
