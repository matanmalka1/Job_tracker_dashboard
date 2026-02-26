import { CheckCircle } from 'lucide-react'
import type { ScanResultState } from '../types.ts'

const formatResultText = (result: ScanResultState) => {
  if (result.applications_created > 0 || result.inserted > 0) {
    return [
      result.applications_created > 0 &&
        `${result.applications_created} new application${result.applications_created !== 1 ? 's' : ''} detected`,
      result.inserted > 0 && `${result.inserted} email${result.inserted !== 1 ? 's' : ''} saved`,
    ]
      .filter(Boolean)
      .join(' · ') + '.'
  }
  return 'Scan complete — inbox is up to date.'
}

const ScanResultAlert = ({ result }: { result: ScanResultState }) => (
  <div className="flex items-center gap-2 bg-green-600/10 border border-green-600/20 rounded-lg px-4 py-3">
    <CheckCircle size={15} className="text-green-400 shrink-0" />
    <p className="text-green-300 text-sm">{formatResultText(result)}</p>
  </div>
)

export default ScanResultAlert
