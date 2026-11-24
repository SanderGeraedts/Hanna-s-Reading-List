import type { Plant, YearGarden } from '#/lib/garden/garden'
import { SPOTS_PER_BED } from '#/lib/garden/numbers'
import { plantLabel } from '#/lib/garden/words'
import { stepSpot } from '#/lib/garden/tend'
import type { Spot } from '#/lib/garden/spots'
import type { Newness } from '#/lib/garden/seen'

/**
 * The buttons over either drawing (T-0063 §1, D-0071): one per plant, at the
 * place the view's own projection puts it. Pressing a plant shows its cover
 * and the way into the book; the arrow keys step from plant to plant and
 * Escape closes the cover — the same in the flat view and in the 3D one, which
 * is why the drawings themselves are `aria-hidden`.
 *
 * Nothing here moves a plant: plants stand in the order she finished the books
 * (D-0071 §1), so an empty spot is nothing to press and stays out of the way of
 * the keyboard.
 */

export interface SpotLayerProps {
  year: YearGarden
  /** where a spot lands, as percentages of the stage */
  place: (bed: number, spot: number) => { left: number; top: number }
  /** the plant whose cover is showing */
  peeked: string | null
  onPeek: (plant: Plant) => void
  onClose: () => void
  /** the plants that are new or have grown since she last looked (T-0066) */
  news?: ReadonlyMap<string, Newness>
  /** the plant she has just found by searching */
  found?: string | null
}

export function SpotLayer({ year, place, peeked, onPeek, onClose, news, found }: SpotLayerProps) {
  const onKeyDown = (e: React.KeyboardEvent, at: Spot, plant: Plant) => {
    if (e.key === 'Escape' && peeked) {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key.startsWith('Arrow')) {
      // the next spot with a plant on it: an empty spot is not a stop on the way
      let next = stepSpot(year, at, e.key as 'ArrowLeft')
      let guard = 0
      while (!year.plants.some((p) => p.bed === next.bed && p.spot === next.spot) && guard++ < SPOTS_PER_BED * year.beds) {
        const after = stepSpot(year, next, e.key as 'ArrowLeft')
        if (after.bed === next.bed && after.spot === next.spot) return
        next = after
      }
      if (next.bed === at.bed && next.spot === at.spot) return
      e.preventDefault()
      document.querySelector<HTMLButtonElement>(`[data-spot="${next.bed}:${next.spot}"]`)?.focus()
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (peeked === plant.id) onClose()
      else onPeek(plant)
    }
  }

  return (
    <div className="garden-spots">
      {Array.from({ length: year.beds }, (_, bed) => (
        <div key={bed} className="garden-bed-group" role="group" aria-label={`Bed ${bed + 1} of ${year.beds}`}>
          {Array.from({ length: SPOTS_PER_BED }, (_, spot) => {
            const plant = year.plants.find((p) => p.bed === bed && p.spot === spot)
            if (!plant) return null
            const at: Spot = { bed, spot }
            const { left, top } = place(bed, spot)
            const fresh = news?.get(plant.id)
            // what a screen reader hears: the glow is a picture, these words are the same news
            const label = `${plantLabel(plant)}${fresh === 'new' ? ' · new' : fresh === 'grown' ? ' · grown since you last looked' : ''}`
            return (
              <button
                key={spot}
                type="button"
                data-spot={`${bed}:${spot}`}
                className={[
                  'garden-spot has-plant',
                  peeked === plant.id ? 'peeked' : '',
                  fresh ? `fresh-${fresh}` : '',
                  found === plant.id ? 'found' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: `${left}%`, top: `${top}%` }}
                aria-label={label}
                aria-expanded={peeked === plant.id}
                title={`${plant.kind.name} · ${plant.book.title}`}
                onKeyDown={(e) => onKeyDown(e, at, plant)}
                onClick={() => (peeked === plant.id ? onClose() : onPeek(plant))}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
