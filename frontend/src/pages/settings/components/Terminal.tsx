import { useEffect, useRef } from 'react'
import { LOG_TYPE_COLOR, STAGE_COLOR } from '../constants'
import type { LogLine } from '../types'

const Terminal = ({ lines, scanning }: { lines: LogLine[]; scanning: boolean }) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

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
        <span className="ml-2 font-mono text-[10px] text-gray-700 tracking-wider">scan_output</span>
        {scanning && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="font-mono text-[10px] text-green-500 tracking-widest">LIVE</span>
          </div>
        )}
      </div>

      <div
        className="p-4 overflow-y-auto space-y-1.5"
        style={{
          minHeight: 140,
          maxHeight: 220,
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        }}
      >
        {lines.length === 0 ? (
          <div className="text-[11px] text-gray-700">
            {'> '}<span className="animate-pulse">_</span>
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
                style={{ color: STAGE_COLOR[line.stage] ?? '#475569' }}
              >
                {line.stage.slice(0, 5)}
              </span>
              <span style={{ color: LOG_TYPE_COLOR[line.type] ?? '#94a3b8' }}>
                {line.detail}
              </span>
            </div>
          ))
        )}
        {scanning && (
          <div className="text-[11px] text-gray-700 font-mono">
            {'> '}<span className="animate-pulse">▋</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

export default Terminal
