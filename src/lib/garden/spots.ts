import type { ChoiceEvent } from '../creatures/choices'
import { EARLIER_YEAR, MAX_ITEM_SLOTS, SPOTS_PER_BED, isItemId } from './numbers'
import type { GardenItemId } from './numbers'

/**
 * Where everything stands (T-0060, D-0052, D-0071): the plants by the order
 * she finished the books, and the garden items where she put them, read out of
 * the existing choice log.
 *
 * An item is saved as a `place` event with a garden key, `g:i:<year>:<item>`,
 * which the den's reader ignores and which this reader keeps apart from the
 * den's own `home:<slot>` keys. The `g:p:<book id>` keys of the plants she
 * once moved are left in the log untouched and are no longer read: a log only
 * ever grows (D-0052 §6).
 */

export interface Spot {
  /** 0-based bed in the year garden */
  bed: number
  /** 0-based spot within the bed */
  spot: number
}

export const PLANT_KEY_PREFIX = 'g:p:'
export const ITEM_KEY_PREFIX = 'g:i:'

export const plantKey = (bookId: string) => `${PLANT_KEY_PREFIX}${bookId}`
export const itemKey = (year: number, item: GardenItemId) => `${ITEM_KEY_PREFIX}${year}:${item}`

/** The index of a spot inside a year garden, counting bed by bed. */
export const spotIndex = (s: Spot) => s.bed * SPOTS_PER_BED + s.spot
export const spotAt = (index: number): Spot => ({ bed: Math.floor(index / SPOTS_PER_BED), spot: index % SPOTS_PER_BED })

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** The newest `place` event per key, as the server and the device both read it (D-0034 §1). */
function newestPlaces(log: readonly ChoiceEvent[]): Map<string, ChoiceEvent> {
  const best = new Map<string, ChoiceEvent>()
  for (const e of log) {
    if (e.kind !== 'place') continue
    const key = (e as { key?: unknown }).key
    if (typeof key !== 'string' || key === '') continue
    const had = best.get(key)
    if (!had || e.at > had.at || (e.at === had.at && e.id > had.id)) best.set(key, e)
  }
  return best
}

/** Her placed garden items, per year garden: year → item → slot. An item taken away (`off: 1`) is left out. */
export function savedItems(log: readonly ChoiceEvent[]): Map<number, Map<GardenItemId, number>> {
  const out = new Map<number, Map<GardenItemId, number>>()
  for (const [key, e] of newestPlaces(log)) {
    if (!key.startsWith(ITEM_KEY_PREFIX)) continue
    const rest = key.slice(ITEM_KEY_PREFIX.length)
    const at = rest.indexOf(':')
    if (at < 0) continue
    const year = Number(rest.slice(0, at))
    const item = rest.slice(at + 1)
    if (!Number.isInteger(year) || year < 0 || !isItemId(item)) continue
    if (num((e as { off?: unknown }).off) === 1) continue
    const slot = num((e as { slot?: unknown }).slot)
    // the widest strip any garden can have: a slot is checked against the year's own width where it is used
    if (slot === null || !Number.isInteger(slot) || slot < 0 || slot >= MAX_ITEM_SLOTS) continue
    let year_ = out.get(year)
    if (!year_) out.set(year, (year_ = new Map()))
    year_.set(item, slot)
  }
  return out
}

/** A plant before it has a spot: enough to put it in its place. */
export interface Placeable {
  id: string
}

export interface Arrangement {
  /** book id → where it stands */
  spots: Map<string, Spot>
  /** how many beds the year garden has */
  beds: number
}

/**
 * Where the plants of one year garden stand: the list is in the order she
 * finished the books, and each plant takes the spot of its own place in that
 * order, bed by bed (D-0071 §1). Nothing is read back from her choices, so the
 * garden is the same on every device without anything being saved.
 */
export function arrange(plants: readonly Placeable[]): Arrangement {
  const spots = new Map<string, Spot>()
  plants.forEach((p, rank) => spots.set(p.id, spotAt(rank)))
  const beds = Math.max(1, Math.ceil(plants.length / SPOTS_PER_BED))
  return { spots, beds }
}

/** A `place` event body for a garden item; `off: 1` takes it away again. */
export const itemPlace = (year: number, item: GardenItemId, slot: number) =>
  ({ kind: 'place', key: itemKey(year, item), slot }) as const

export const itemRemove = (year: number, item: GardenItemId) =>
  ({ kind: 'place', key: itemKey(year, item), slot: 0, off: 1 }) as const

export const EARLIER = EARLIER_YEAR
