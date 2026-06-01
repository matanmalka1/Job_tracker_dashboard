import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { LOG_TYPE_COLOR, SCAN_STAGE_COLOR } from '../../constants/scan.ts'
import type { EventLogLine } from '../../types/job-tracker.ts'

interface EventTerminalProps {
  lines: EventLogLine[]
  live: boolean
  autoScroll?: boolean
  title?: string
  emptyText?: string
  maxHeight?: number
  minHeight?: number
  headerRight?: ReactNode
}

const EventTerminal = ({
  lines,
  live,
  autoScroll = true,
  title = 'scan_output',
  emptyText = '_',
  maxHeight = 220,
  minHeight = 140,
  headerRight,
}: EventTerminalProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [autoScroll, lines])

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#07070f', border: '1px solid #ffffff08' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ background: '#0c0c18', borderColor: '#ffffff07' }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="ml-2 font-mono text-[10px] text-gray-700 tracking-wider">{title}</span>
        {live && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-[10px] text-green-500 tracking-widest">LIVE</span>
          </div>
        )}
        {headerRight && <div className={live ? 'ml-2' : 'ml-auto'}>{headerRight}</div>}
      </div>

      <div
        className="p-4 overflow-y-auto space-y-1.5"
        style={{
          minHeight,
          maxHeight,
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        }}
      >
        {lines.length === 0 ? (
          <div className="text-[11px] text-gray-700">
            {'> '}<span className="animate-pulse">{emptyText}</span>
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={line.id}
              className="flex gap-3 text-[11px] leading-5"
              style={{ animation: 'logIn 0.12s ease-out both' }}
            >
              <span className="text-gray-700 shrink-0 tabular-nums select-none">
                {new Date(line.ts).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span
                className="shrink-0 w-[5.5ch] text-right font-bold uppercase tracking-wider select-none"
                style={{ color: SCAN_STAGE_COLOR[line.stage] ?? '#475569' }}
              >
                {line.stage.slice(0, 5)}
              </span>
              <span style={{ color: LOG_TYPE_COLOR[line.type] ?? '#94a3b8' }}>
                {line.detail}
              </span>
            </div>
          ))
        )}
        {live && (
          <div className="text-[11px] text-gray-700 font-mono">
            {'> '}<span className="animate-pulse">▋</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

export default EventTerminal
