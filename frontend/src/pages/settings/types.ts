export interface ScanProgressState {
  stage: string
  detail: string
}

export interface ScanResultState {
  inserted: number
  applications_created: number
}

export interface LogLine {
  id: number
  stage: string
  detail: string
  ts: number
  type: 'info' | 'success' | 'error' | 'warn'
}

export interface Blip {
  id: number
  angle: number
  radius: number
  alpha: number
  size: number
}
