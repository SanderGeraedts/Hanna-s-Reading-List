import type { Sign } from '#/lib/garden/signs'

/**
 * The little signs with a book's cover (T-0066, from Hanna): one beside each
 * plant she finished in the last month, laid over the garden with the view's
 * own projection — so the flat garden and the 3D one get exactly the same
 * signs, in the same places, without either drawing having to know about them.
 *
 * The spot buttons underneath already say what every plant is, so the signs are
 * `aria-hidden`: a screen reader hears the plant, not the picture twice.
 */

export interface CoverSignsProps {
  signs: Sign[]
  /** where a spot lands, as percentages of the stage */
  place: (bed: number, spot: number) => { left: number; top: number }
}

export function CoverSigns({ signs, place }: CoverSignsProps) {
  if (!signs.length) return null
  return (
    <div className="garden-signs" aria-hidden="true">
      {signs.map((sign) => {
        const { left, top } = place(sign.bed, sign.spot)
        return (
          <div
            key={sign.id}
            className={sign.reading ? 'garden-sign reading' : 'garden-sign'}
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <div className="garden-sign-board">
              {sign.cover ? <img src={sign.cover} alt="" loading="lazy" decoding="async" /> : <span className="garden-sign-blank" />}
            </div>
            <span className="garden-sign-post" />
          </div>
        )
      })}
    </div>
  )
}
