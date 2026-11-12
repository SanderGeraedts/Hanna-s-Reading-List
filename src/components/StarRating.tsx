import { useRef } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { MAX_STARS, cleanRating, ratingText, spiceText } from '#/lib/ratings'

interface Props {
  value: number | undefined
  /** leave out to only show the stars */
  onChange?: (rating: number | undefined) => void
  size?: 'small' | 'large'
  label?: string
  /** stars in halves (the rating), or whole chili peppers (the spice level) */
  kind?: 'stars' | 'spice'
}

/**
 * Five stars, in halves (#100), or five chili peppers for the spice level.
 * Tap or drag across them: the left half of a star gives half a star.
 * Tapping the rating it already has clears it. With the keyboard, ← → change it.
 */
export function StarRating({ value, onChange, size, label, kind = 'stars' }: Props) {
  const spice = kind === 'spice'
  const step = spice ? 1 : 0.5
  const glyph = spice ? '🌶️' : '★'
  const text = spice ? spiceText : ratingText
  label ??= spice ? 'Spice level' : 'Rating'
  const box = useRef<HTMLSpanElement>(null)
  const dragging = useRef(false)
  const startValue = useRef<number | undefined>(undefined)
  const downAt = useRef(0)
  const r = cleanRating(value, step) ?? 0

  const at = (e: PointerEvent) => {
    const rect = box.current!.getBoundingClientRect()
    const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width - 0.01)
    return Math.floor((x / rect.width) * (MAX_STARS / step) + 1) * step
  }
  const set = (n: number | undefined) => onChange?.(cleanRating(n, step))

  const stars = (
    <span className="stars-row" aria-hidden>
      {Array.from({ length: MAX_STARS }, (_, i) => {
        const fill = Math.min(Math.max(r - i, 0), 1)
        return (
          <span key={i} className="star">
            <span className="star-empty">{glyph}</span>
            <span className="star-full" style={{ width: `${fill * 100}%` }}>
              {glyph}
            </span>
          </span>
        )
      })}
    </span>
  )

  if (!onChange) {
    return (
      <span className={`stars${spice ? ' spice' : ''}${size ? ` ${size}` : ''}`} role="img" aria-label={text(value)} title={text(value)}>
        {stars}
      </span>
    )
  }

  return (
    <span
      ref={box}
      className={`stars editable${spice ? ' spice' : ''}${size ? ` ${size}` : ''}`}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={MAX_STARS}
      aria-valuenow={r}
      aria-valuetext={text(value)}
      onPointerDown={(e) => {
        dragging.current = true
        startValue.current = cleanRating(value, step)
        downAt.current = at(e)
        e.currentTarget.setPointerCapture(e.pointerId)
        set(downAt.current)
      }}
      onPointerMove={(e) => dragging.current && set(at(e))}
      onPointerUp={(e) => {
        if (!dragging.current) return
        dragging.current = false
        // a tap on the rating it already had clears it
        if (at(e) === downAt.current && downAt.current === startValue.current) set(undefined)
      }}
      onPointerCancel={() => (dragging.current = false)}
      onKeyDown={(e: KeyboardEvent) => {
        const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]
        if (by) set(r + by * step)
        else if (e.key === 'Home' || e.key === 'Delete' || e.key === 'Backspace') set(undefined)
        else if (e.key === 'End') set(MAX_STARS)
        else return
        e.preventDefault()
      }}
    >
      {stars}
    </span>
  )
}
