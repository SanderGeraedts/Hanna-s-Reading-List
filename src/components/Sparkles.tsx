import { useEffect, useState } from 'react'

/**
 * Little magic moments: a burst of golden sparkles when Hanna finishes a book
 * or makes a wish. `sparkle()` can be called from anywhere; the one
 * `<SparkleLayer />` on the page draws the burst. Our own design, no
 * characters or logos.
 */

const EVENT = 'hannas-reading-list:sparkle'

/** A burst of sparkles, by default in the middle of the screen (where a taken-out book shows). */
export function sparkle(at?: { x: number; y: number }) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENT, { detail: at ?? null }))
}

interface Burst {
  id: number
  x: number
  y: number
  bits: Array<{ dx: number; dy: number; size: number; delay: number; star: boolean }>
}

const BITS = 26
const LIFE_MS = 1400

function makeBurst(id: number, x: number, y: number): Burst {
  const bits = Array.from({ length: BITS }, (_, i) => {
    const angle = (i / BITS) * Math.PI * 2 + Math.random() * 0.4
    const dist = 60 + Math.random() * 90
    return {
      dx: Math.cos(angle) * dist,
      // a little upward drift, like fairy dust
      dy: Math.sin(angle) * dist - 30,
      size: 6 + Math.random() * 10,
      delay: Math.random() * 180,
      star: i % 3 === 0,
    }
  })
  return { id, x, y, bits }
}

export function SparkleLayer() {
  const [bursts, setBursts] = useState<Burst[]>([])
  useEffect(() => {
    let next = 0
    const on = (e: Event) => {
      const at = (e as CustomEvent<{ x: number; y: number } | null>).detail
      const id = next++
      const b = makeBurst(id, at?.x ?? window.innerWidth / 2, at?.y ?? window.innerHeight * 0.45)
      setBursts((list) => [...list, b])
      window.setTimeout(() => setBursts((list) => list.filter((x) => x.id !== id)), LIFE_MS + 300)
    }
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  if (!bursts.length) return null
  return (
    <div className="sparkle-layer" aria-hidden>
      {bursts.map((b) => (
        <div key={b.id} className="sparkle-burst" style={{ left: b.x, top: b.y }}>
          <span className="sparkle-glow" />
          {b.bits.map((s, i) => (
            <span
              key={i}
              className={s.star ? 'sparkle-bit star' : 'sparkle-bit'}
              style={
                {
                  '--dx': `${s.dx}px`,
                  '--dy': `${s.dy}px`,
                  '--size': `${s.size}px`,
                  animationDelay: `${s.delay}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  )
}
