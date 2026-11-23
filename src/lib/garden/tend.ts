import { SPOTS_PER_BED, itemSlotsFor, itemSpec } from './numbers'
import type { GardenItemId } from './numbers'
import type { Garden, Plant, YearGarden } from './garden'
import { itemPlace, itemRemove, plantPlace, spotAt } from './spots'
import type { Spot } from './spots'
import { plantLine } from './words'

/**
 * Tending the garden (T-0063): moving a plant to another spot — swapping with
 * whatever stands there — and placing or taking away a garden item. Every
 * answer is a list of `place` events for the choice log (D-0052) and the line
 * the status says; nothing here touches the shelf, and nothing can remove a
 * plant.
 */

export type PlaceEvent = { kind: 'place'; key: string } & Record<string, string | number>

export type TendRefusal = 'nowhere' | 'same-spot' | 'other-year' | 'locked' | 'no-slot' | 'not-placed' | 'already-tidy'

export type Tended =
  /** `undo` puts the garden back exactly as it stood, as a second set of events */
  { ok: true; events: PlaceEvent[]; say: string; undo?: PlaceEvent[] } | { ok: false; why: TendRefusal }

const onBoard = (year: YearGarden, to: Spot) =>
  Number.isInteger(to.bed) && Number.isInteger(to.spot) && to.bed >= 0 && to.bed < year.beds && to.spot >= 0 && to.spot < SPOTS_PER_BED

/**
 * Moves a plant to a spot in its own year garden. An empty spot takes it; a
 * spot with a plant in it swaps the two, which is why two events come back.
 */
export function movePlant(year: YearGarden, plantId: string, to: Spot): Tended {
  const plant = year.plants.find((p) => p.id === plantId)
  if (!plant) return { ok: false, why: 'other-year' }
  if (!onBoard(year, to)) return { ok: false, why: 'nowhere' }
  if (plant.bed === to.bed && plant.spot === to.spot) return { ok: false, why: 'same-spot' }
  const there = year.plants.find((p) => p.bed === to.bed && p.spot === to.spot && p.id !== plantId)
  const events: PlaceEvent[] = [plantPlace(plant.id, to)]
  if (there) {
    // the plant that was there takes the moved plant's old spot: a swap, never a plant without a spot
    events.push(plantPlace(there.id, { bed: plant.bed, spot: plant.spot }))
    return { ok: true, events, say: `Swapped with the ${plantLine(there)}.` }
  }
  return { ok: true, events, say: `Moved to bed ${to.bed + 1}, spot ${to.spot + 1}.` }
}

/** Puts an unlocked garden item in a slot of a year garden. */
export function placeItem(garden: Garden, year: number, item: GardenItemId, slot: number): Tended {
  if (!garden.unlocked.includes(item)) return { ok: false, why: 'locked' }
  const slots = itemSlotsFor(garden.years.find((y) => y.year === year)?.beds ?? 1)
  if (!Number.isInteger(slot) || slot < 0 || slot >= slots) return { ok: false, why: 'no-slot' }
  const name = itemName(item)
  return { ok: true, events: [itemPlace(year, item, slot)], say: `${name} placed.` }
}

/** Takes a garden item away again; it stays unlocked. */
export function removeItem(garden: Garden, year: number, item: GardenItemId): Tended {
  const standing = garden.years.find((y) => y.year === year)?.items.has(item)
  if (!standing) return { ok: false, why: 'not-placed' }
  return { ok: true, events: [itemRemove(year, item)], say: `${itemName(item)} taken away.` }
}

/** The first free slot of a year garden's item strip, or null when they are all taken. */
export function freeItemSlot(year: YearGarden): number | null {
  const taken = new Set(year.items.values())
  const slots = itemSlotsFor(year.beds)
  for (let s = 0; s < slots; s++) if (!taken.has(s)) return s
  return null
}

/**
 * Tidies a year garden into reading order (T-0066): the book she finished first
 * takes the first spot of the first bed, and so on through the beds. `plants`
 * is already in finish order, so a plant's rank is its place in that list.
 *
 * Every plant that has to move gets a `place` event, and `undo` holds the
 * events that put each of them back where it stood — nothing is ever lost, and
 * a garden that is already tidy is refused rather than written again.
 */
export function tidyYear(year: YearGarden): Tended {
  const events: PlaceEvent[] = []
  const undo: PlaceEvent[] = []
  year.plants.forEach((p, rank) => {
    const to = spotAt(rank)
    if (p.bed === to.bed && p.spot === to.spot) return
    events.push(plantPlace(p.id, to))
    undo.push(plantPlace(p.id, { bed: p.bed, spot: p.spot }))
  })
  if (!events.length) return { ok: false, why: 'already-tidy' }
  const n = events.length
  return { ok: true, events, undo, say: `Tidied into reading order: ${n} plant${n === 1 ? '' : 's'} moved.` }
}

/**
 * The spot the arrow keys go to from a spot: left and right within a row, up
 * and down between rows, and past the top or the bottom of a bed into the bed
 * next to it, so every spot of the year garden can be reached (T-0063 §1).
 */
export function stepSpot(year: YearGarden, from: Spot, key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'): Spot {
  const columns = SPOTS_PER_BED / 3
  const row = Math.floor(from.spot / columns)
  const column = from.spot % columns
  const clampBed = (b: number) => Math.max(0, Math.min(year.beds - 1, b))
  if (key === 'ArrowLeft') return column > 0 ? { ...from, spot: from.spot - 1 } : from
  if (key === 'ArrowRight') return column < columns - 1 ? { ...from, spot: from.spot + 1 } : from
  if (key === 'ArrowUp') {
    if (row > 0) return { ...from, spot: from.spot - columns }
    const bed = clampBed(from.bed - 1)
    return bed === from.bed ? from : { bed, spot: SPOTS_PER_BED - columns + column }
  }
  if (row < 2) return { ...from, spot: from.spot + columns }
  const bed = clampBed(from.bed + 1)
  return bed === from.bed ? from : { bed, spot: column }
}

export const itemName = (item: GardenItemId): string => itemSpec(item).name

/** The plant standing on a spot, or null. */
export const plantOn = (year: YearGarden, at: Spot): Plant | null =>
  year.plants.find((p) => p.bed === at.bed && p.spot === at.spot) ?? null
