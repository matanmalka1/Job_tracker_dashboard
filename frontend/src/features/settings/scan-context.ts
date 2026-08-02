import { createContext, useContext } from 'react'
import type { useScanRunner } from './hooks/useScanRunner.ts'

export type ScanContextValue = ReturnType<typeof useScanRunner>

export const ScanContext = createContext<ScanContextValue | null>(null)

export const useScan = (): ScanContextValue => {
  const scan = useContext(ScanContext)
  if (!scan) throw new Error('useScan must be used within ScanProvider')
  return scan
}
