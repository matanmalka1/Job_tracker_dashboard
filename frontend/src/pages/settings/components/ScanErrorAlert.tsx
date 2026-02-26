import { XCircle } from 'lucide-react'

const ScanErrorAlert = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2 bg-red-600/10 border border-red-600/20 rounded-lg px-4 py-3">
    <XCircle size={15} className="text-red-400 shrink-0" />
    <p className="text-red-300 text-sm">{message}</p>
  </div>
)

export default ScanErrorAlert
