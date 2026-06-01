import type { EventLogLine } from '../../shared/types/job-tracker.ts'

export interface ScanResultState {
  inserted: number
  applications_created: number
}

export type LogLine = EventLogLine

export interface Blip {
  id: number
  angle: number
  radius: number
  alpha: number
  size: number
}
