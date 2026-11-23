import { useEffect, useState } from 'react'

/**
 * A short confetti burst when Hanna finishes a challenge (D-0060 §4, §5):
 * little paper rectangles in the medal colours falling from the top of the
 * page, once, then gone. `confetti()` can be called from anywhere; the one
 * `<ConfettiLayer />` on the page draws it.
 *
 * It asks nothing, takes no focus and closes itself, so it is not a pop-up
 * (D-0013). With `prefers-reduced-motion: reduce` it draws nothing at all:
 * the ring is already gold with a check, which is the state; the burst is only
 * the party. Our own design, no library, no sound.
 */

const EVENT = 'hannas-reading-list:confetti'

/** One burst of confetti. */
export function confetti() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT))
}

interface Bit {
  /** where it starts, as a percentage of the width */
  left: number
  /** how far it falls, as a percentage of the height */
  fall: number
  drift: number
  width: number
  height: number
  spin: number
  delay: number
  colour: string
}

interface Burst {
  id: number
  bits: Bit[]
}

const BITS = 34
export const CONFETTI_MS = 1600
const COLOURS = ['var(--accent)', 'var(--text)', 'var(--medal-bronze)', 'var(--medal-silver)']

function makeBurst(id: number): Burst {
  const bits = Array.from({ length: BITS }, (_, i) => ({
    left: Math.round(((i + 0.5) / BITS) * 100 + (Math.random() * 6 - 3)),
    fall: 60 + Math.random() * 15,
    drift: Math.random() * 60 - 30,
    width: 4 + Math.random() * 5,
    height: 7 + Math.random() * 5,
    spin: Math.round(Math.random() * 720 - 360),
    delay: Math.round(Math.random() * 260),
    colour: COLOURS[i % COLOURS.length],
  }))
  return { id, bits }
}

export function ConfettiLayer() {
  const [bursts, setBursts] = useState<Burst[]>([])
  useEffect(() => {
    let next = 0
    const on = () => {
      // no party for anyone who asked for less movement (D-0060 §4)
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
      const id = next++
      setBursts((list) => [...list, makeBurst(id)])
      window.setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), CONFETTI_MS + 400)
    }
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  if (!bursts.length) return null
  return (
    <div className="confetti-layer" aria-hidden>
      {bursts.map((b) => (
        <div key={b.id} className="confetti-burst">
          {b.bits.map((bit, i) => (
            <span
              key={i}
              className="confetti-bit"
              style={
                {
                  left: `${bit.left}%`,
                  background: bit.colour,
                  '--fall': `${bit.fall}vh`,
                  '--drift': `${bit.drift}px`,
                  '--spin': `${bit.spin}deg`,
                  '--w': `${bit.width}px`,
                  '--h': `${bit.height}px`,
                  animationDelay: `${bit.delay}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  )
}
