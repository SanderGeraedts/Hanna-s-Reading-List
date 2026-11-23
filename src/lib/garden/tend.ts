import { SPOTS_PER_BED, itemSlotsFor, itemSpec } from './numbers'
import type { GardenItemId } from './numbers'
import type { Garden, Plant, YearGarden } from './garden'
import { itemPlace, itemRemove } from './spots'
import type { Spot } from './spots'

/**
 * Tending the garden (T-0063, D-0071): placing a garden item and taking it
 * away again. A **plant** is never moved — plants stand in the order she
 * finished the books — so the only choice saved here is where an item stands.
 * Every answer is a list of `place` events for the choice log (D-0052) and the
 * line the status says; nothing here touches the shelf.
 */

export type PlaceEvent = { kind: 'place'; key: string } & Record<string, string | number>

export type TendRefusal = 'locked' | 'no-slot' | 'not-placed'

export type Tended = { ok: true; events: PlaceEvent[]; say: string } | { ok: false; why: TendRefusal }

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
