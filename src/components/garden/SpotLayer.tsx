import { useRef } from 'react'
import type { Plant, YearGarden } from '#/lib/garden/garden'
import { HOLD_MS, SPOTS_PER_BED } from '#/lib/garden/numbers'
import { plantLabel, putHereLabel, spotLabel } from '#/lib/garden/words'
import { stepSpot } from '#/lib/garden/tend'
import type { Spot } from '#/lib/garden/spots'

/**
 * The buttons she tends with (T-0063 §1), over either drawing: one per spot, at
 * the place the view's own projection puts it. A spot with a plant in it is
 * that plant's button; an empty one is an empty spot. Pressing a plant picks it
 * up, pressing a spot puts it down, the arrow keys step through the spots and
 * Escape puts it back — the same in the flat view and in the 3D one, which is
 * why the drawings themselves are `aria-hidden`.
 *
 * A finger or a mouse may also simply drag a plant: on a touch screen after a
 * short press, so the garden can still be scrolled.
 */

export interface SpotLayerProps {
  year: YearGarden
  /** where a spot lands, as percentages of the stage */
  place: (bed: number, spot: number) => { left: number; top: number }
  picked: Plant | null
  onPick: (plant: Plant) => void
  onDrop: (at: Spot) => void
  onCancel: () => void
  /** a touch screen: a plant lifts after a short press instead of at once */
  coarse?: boolean
}

export function SpotLayer({ year, place, picked, onPick, onDrop, onCancel, coarse }: SpotLayerProps) {
  const layer = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; timer: ReturnType<typeof setTimeout> | null; lifted: boolean; from: { x: number; y: number } } | null>(null)

  const focusSpot = (at: Spot) => {
    layer.current?.querySelector<HTMLButtonElement>(`[data-spot="${at.bed}:${at.spot}"]`)?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent, at: Spot, plant: Plant | null) => {
    if (e.key === 'Escape' && picked) {
      e.preventDefault()
      onCancel()
      return
    }
    if (e.key.startsWith('Arrow')) {
      const next = stepSpot(year, at, e.key as 'ArrowLeft')
      if (next.bed !== at.bed || next.spot !== at.spot) {
        e.preventDefault()
        focusSpot(next)
      }
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (picked) onDrop(at)
      else if (plant) onPick(plant)
    }
  }

  /** dragging: the plant lifts (at once with a mouse, after a short press with a finger) and drops on the spot under the pointer */
  const onPointerDown = (e: React.PointerEvent, plant: Plant) => {
    if (e.button !== undefined && e.button !== 0) return
    const start = { x: e.clientX, y: e.clientY }
    const lift = () => {
      if (!drag.current) return
      drag.current.lifted = true
      onPick(plant)
    }
    // the pointer stays with this button, so letting go anywhere still reaches `endDrag`
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* a browser (or a test) without pointer capture: the click path still works */
    }
    drag.current = { id: plant.id, timer: coarse ? setTimeout(lift, HOLD_MS) : null, lifted: false, from: start }
    if (!coarse) lift()
  }

  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (d.timer) clearTimeout(d.timer)
    if (!d.lifted) return
    const moved = Math.abs(e.clientX - d.from.x) + Math.abs(e.clientY - d.from.y)
    // a press that never moved is a tap: the plant stays picked up, so she can choose a spot
    if (moved < 8) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const spot = el?.closest<HTMLElement>('[data-spot]')?.dataset.spot
    if (!spot) return onCancel()
    const [bed, at] = spot.split(':').map(Number)
    onDrop({ bed, spot: at })
  }

  return (
    <div className="garden-spots" ref={layer}>
      {Array.from({ length: year.beds }, (_, bed) => (
        <div key={bed} className="garden-bed-group" role="group" aria-label={`Bed ${bed + 1} of ${year.beds}`}>
          {Array.from({ length: SPOTS_PER_BED }, (_, spot) => {
            const at: Spot = { bed, spot }
            const plant = year.plants.find((p) => p.bed === bed && p.spot === spot) ?? null
            const { left, top } = place(bed, spot)
            const label = picked ? putHereLabel(picked, bed, spot) : plant ? plantLabel(plant) : spotLabel(bed, spot)
            return (
              <button
                key={spot}
                type="button"
                data-spot={`${bed}:${spot}`}
                className={`garden-spot${plant ? ' has-plant' : ''}${picked?.id === plant?.id && plant ? ' picked' : ''}${picked ? ' choosing' : ''}`}
                style={{ left: `${left}%`, top: `${top}%` }}
                aria-label={label}
                aria-pressed={plant && picked?.id === plant.id ? true : undefined}
                title={plant ? `${plant.kind.name} · ${plant.book.title}` : undefined}
                onKeyDown={(e) => onKeyDown(e, at, plant)}
                onClick={() => {
                  if (picked) onDrop(at)
                  else if (plant) onPick(plant)
                }}
                onPointerDown={plant && !picked ? (e) => onPointerDown(e, plant) : undefined}
                onPointerUp={endDrag}
                onPointerCancel={() => {
                  if (drag.current?.timer) clearTimeout(drag.current.timer)
                  drag.current = null
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
