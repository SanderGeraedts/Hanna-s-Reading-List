import { useEffect, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { analyzeCover, automaticColour, sameColour } from '#/lib/cover'
import type { CoverAnalysis } from '#/lib/cover'
import { swatchNames } from '#/lib/colourName'
import { inkFor } from './textures'
import type { Face } from './BookPanel'

interface Props {
  book: Book
  onChange: (color: string) => void
  onFace: (face: Face) => void
}

/**
 * The Spine colour row (T-0019): swatches from the book's cover, the automatic
 * one first (★ Dominant), ✓ on the current colour, and Back to automatic.
 * Loading and failed covers show only the current colour.
 */
export function SpineColourField({ book, onChange, onFace }: Props) {
  // undefined: still analysing; null: the cover couldn't be read
  const [analysis, setAnalysis] = useState<CoverAnalysis | null | undefined>(undefined)
  const swatchesRef = useRef<HTMLDivElement>(null)
  const focusPressed = useRef(false)
  const coverUrl = book.coverUrl

  useEffect(() => {
    setAnalysis(undefined)
    if (!coverUrl) return
    let cancelled = false
    analyzeCover(coverUrl).then(
      (a) => !cancelled && setAnalysis(a),
      () => !cancelled && setAnalysis(null),
    )
    return () => {
      cancelled = true
    }
  }, [book.id, coverUrl])

  const palette = coverUrl && analysis ? analysis.palette : []
  const current = book.color
  const outside = !palette.some((c) => sameColour(c, current))
  const swatches = outside ? [...palette, current] : palette
  const names = swatchNames(swatches, palette.length > 0)
  const automatic = automaticColour(book, coverUrl ? analysis : null)
  const showBack = automatic !== null && !sameColour(automatic, current)

  useEffect(() => {
    if (!focusPressed.current) return
    focusPressed.current = false
    swatchesRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()
  }, [current])

  const pick = (color: string) => {
    if (sameColour(color, current)) return
    onFace('spine')
    onChange(color)
  }

  return (
    <div className="field spine-colour-field" role="group" aria-labelledby="spine-colour-label">
      <span id="spine-colour-label">Spine colour</span>
      <div className="spine-colour-swatches" ref={swatchesRef}>
        {swatches.map((hex, i) => {
          const pressed = sameColour(hex, current)
          const isOutside = outside && i === swatches.length - 1 && palette.length > 0
          return (
            <button
              key={`${i}-${hex}`}
              type="button"
              className={isOutside ? 'spine-swatch outside' : 'spine-swatch'}
              style={{ background: hex, color: inkFor(hex) }}
              aria-pressed={pressed}
              aria-label={names[i]}
              title={names[i]}
              onClick={() => pick(hex)}
            >
              {pressed && <span aria-hidden="true">✓</span>}
            </button>
          )
        })}
      </div>
      {palette.length > 0 && (
        <span className="spine-colour-dominant" aria-hidden="true">
          <span className="star">★</span> Dominant
        </span>
      )}
      {showBack && (
        <button
          type="button"
          className="btn small spine-colour-back"
          onClick={() => {
            focusPressed.current = true
            onFace('spine')
            onChange(automatic)
          }}
        >
          Back to automatic
        </button>
      )}
    </div>
  )
}
