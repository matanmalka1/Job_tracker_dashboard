import type { ReactNode } from 'react'
import { useScanRunner } from './hooks/useScanRunner.ts'
import { ScanContext } from './scan-context.ts'

type ScanProviderProps = {
  children: ReactNode
}

const ScanProvider = ({ children }: ScanProviderProps) => {
  const scan = useScanRunner()

  return <ScanContext.Provider value={scan}>{children}</ScanContext.Provider>
}

export default ScanProvider
