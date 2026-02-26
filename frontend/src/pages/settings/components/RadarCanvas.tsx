import { useEffect, useRef } from 'react'
import { STAGE_COLOR } from '../constants'
import type { Blip } from '../types'

interface Props {
  scanning: boolean
  stageKey: string | null
  done: boolean
  failed: boolean
  blipsRef: React.MutableRefObject<Blip[]>
  sweepRef: React.MutableRefObject<number>
}

const RadarCanvas = ({ scanning, stageKey, done, failed, blipsRef, sweepRef }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    const SIZE = 280
    canvas.width = SIZE * DPR
    canvas.height = SIZE * DPR
    canvas.style.width = `${SIZE}px`
    canvas.style.height = `${SIZE}px`
    ctx.scale(DPR, DPR)

    const cx = SIZE / 2
    const cy = SIZE / 2
    const R = SIZE / 2 - 14

    const accent = failed
      ? '#f87171'
      : done
        ? '#34d399'
        : stageKey
          ? STAGE_COLOR[stageKey] ?? '#38bdf8'
          : '#38bdf8'

    const hexRgb = (h: string) =>
      `${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(
        h.slice(5, 7),
        16,
      )}`
    const rgb = hexRgb(accent)
    const SPEED = 0.026

    const frame = () => {
      ctx.clearRect(0, 0, SIZE, SIZE)

      // Background fill
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R)
      bg.addColorStop(0, `rgba(${rgb},0.07)`)
      bg.addColorStop(0.6, `rgba(${rgb},0.02)`)
      bg.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fillStyle = bg
      ctx.fill()

      // Concentric rings
      ;[0.25, 0.5, 0.75, 1].forEach((f, i) => {
        ctx.beginPath()
        ctx.arc(cx, cy, R * f, 0, Math.PI * 2)
        ctx.strokeStyle = accent + (i === 3 ? '2a' : '14')
        ctx.lineWidth = i === 3 ? 1.2 : 0.6
        ctx.stroke()
      })

      // Radial lines
      ctx.save()
      ctx.setLineDash([3, 7])
      ctx.strokeStyle = accent + '15'
      ctx.lineWidth = 0.5
      for (let a = 0; a < 8; a++) {
        const rad = (a * Math.PI) / 4
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(rad) * R, cy + Math.sin(rad) * R)
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.restore()

      // Tick marks
      for (let deg = 0; deg < 360; deg += 10) {
        const rad = (deg * Math.PI) / 180
        const major = deg % 30 === 0
        const len = major ? 6 : 3
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(rad) * R, cy + Math.sin(rad) * R)
        ctx.lineTo(cx + Math.cos(rad) * (R - len), cy + Math.sin(rad) * (R - len))
        ctx.strokeStyle = accent + (major ? '38' : '18')
        ctx.lineWidth = 0.7
        ctx.stroke()
      }

      if (scanning && !done && !failed) {
        sweepRef.current += SPEED
        const sw = sweepRef.current

        // Sweep fan
        const SLICES = 90
        for (let i = 0; i < SLICES; i++) {
          const t = i / SLICES
          const a = sw - t * (Math.PI * 0.88)
          const alpha = (1 - t) * 0.55
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.arc(cx, cy, R - 1, a - 0.045, a + 0.045)
          ctx.closePath()
          ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(4)})`
          ctx.fill()
        }

        // Sweep edge
        const eLx = cx + Math.cos(sw) * R
        const eLy = cy + Math.sin(sw) * R
        const edgeGrd = ctx.createLinearGradient(cx, cy, eLx, eLy)
        edgeGrd.addColorStop(0, `rgba(${rgb},0)`)
        edgeGrd.addColorStop(0.4, `rgba(${rgb},0.5)`)
        edgeGrd.addColorStop(1, accent + 'ff')
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(eLx, eLy)
        ctx.strokeStyle = edgeGrd
        ctx.lineWidth = 2
        ctx.stroke()

        // Activate / decay blips
        blipsRef.current.forEach((blip) => {
          const diff = ((sw - blip.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
          if (diff < 0.07) blip.alpha = 1
          else blip.alpha = Math.max(0, blip.alpha - 0.005)
        })
      } else {
        // Idle breathing
        const p = done || failed ? 0.85 : 0.25 + 0.2 * Math.sin(Date.now() / 900)
        blipsRef.current.forEach((b) => {
          b.alpha = p
        })
      }

      // Draw blips
      blipsRef.current.forEach((blip) => {
        if (blip.alpha < 0.015) return
        const bx = cx + Math.cos(blip.angle) * blip.radius
        const by = cy + Math.sin(blip.angle) * blip.radius

        const glow = ctx.createRadialGradient(bx, by, 0, bx, by, blip.size * 5)
        glow.addColorStop(0, `rgba(${rgb},${(blip.alpha * 0.55).toFixed(3)})`)
        glow.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(bx, by, blip.size * 5, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        ctx.beginPath()
        ctx.arc(bx, by, blip.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${blip.alpha.toFixed(3)})`
        ctx.fill()
      })

      // Center hub
      const hub = ctx.createRadialGradient(cx, cy, 0, cx, cy, 16)
      hub.addColorStop(0, accent + 'ff')
      hub.addColorStop(0.5, accent + '70')
      hub.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(cx, cy, 16, 0, Math.PI * 2)
      ctx.fillStyle = hub
      ctx.fill()
      ctx.beginPath()
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'
      ctx.fill()

      // Outer rim
      ctx.shadowColor = accent
      ctx.shadowBlur = scanning ? 14 : 0
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.strokeStyle = accent + (scanning ? '55' : '22')
      ctx.lineWidth = scanning ? 1.5 : 1
      ctx.stroke()
      ctx.shadowBlur = 0

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning, stageKey, done, failed])

  return <canvas ref={canvasRef} style={{ display: 'block' }} />
}

export default RadarCanvas
