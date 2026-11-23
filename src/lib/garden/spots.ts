import type { ChoiceEvent } from '../creatures/choices'
import { EARLIER_YEAR, MAX_ITEM_SLOTS, SPOTS_PER_BED, isItemId } from './numbers'
import type { GardenItemId } from './numbers'

/**
 * Where everything stands (T-0060, D-0052): her saved spots, read out of the
 * existing choice log, over a stable automatic placement, so a garden she has
 * never touched is already tidy and moving one plant never reshuffles the rest.
 *
 * Saved as `place` events with garden keys — `g:p:<book id>` for a plant and
 * `g:i:<year>:<item>` for a garden item — which the den's reader ignores and
 * which this reader keeps apart from the den's own `home:<slot>` keys.
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

/** Her saved plant spots, by book id. Keys that aren't the garden's (the den's `home:…`) are ignored. */
export function savedPlants(log: readonly ChoiceEvent[]): Map<string, Spot> {
  const out = new Map<string, Spot>()
  for (const [key, e] of newestPlaces(log)) {
    if (!key.startsWith(PLANT_KEY_PREFIX)) continue
    const book = key.slice(PLANT_KEY_PREFIX.length)
    const bed = num((e as { bed?: unknown }).bed)
    const spot = num((e as { spot?: unknown }).spot)
    if (!book || bed === null || spot === null) continue
    if (bed < 0 || spot < 0 || spot >= SPOTS_PER_BED || !Number.isInteger(bed) || !Number.isInteger(spot)) continue
    out.set(book, { bed, spot })
  }
  return out
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
  /** her own spot for it, when she has moved it */
  saved?: Spot
}

export interface Arrangement {
  /** book id → where it stands */
  spots: Map<string, Spot>
  /** how many beds the year garden has */
  beds: number
}

/**
 * Where the plants of one year garden stand. The list is in the order the
 * plants were finished; a plant she has not moved wants the spot of its own
 * place in that order, and takes the next free one when hers is there already.
 * Because a plant's wish depends on its own rank and not on what is still free,
 * moving one plant moves at most the one plant whose spot it took — the rest of
 * the garden stays exactly where it was.
 */
export function arrange(plants: readonly Placeable[]): Arrangement {
  const spots = new Map<string, Spot>()
  const taken = new Set<number>()
  let top = 0
  for (const p of plants) {
    if (!p.saved) continue
    const at = spotIndex(p.saved)
    // two saved plants on one spot (two devices, same moment): the first in finish order keeps it
    if (taken.has(at)) continue
    taken.add(at)
    spots.set(p.id, p.saved)
    top = Math.max(top, at)
  }
  plants.forEach((p, rank) => {
    if (spots.has(p.id)) return
    let at = rank
    while (taken.has(at)) at++
    taken.add(at)
    spots.set(p.id, spotAt(at))
    top = Math.max(top, at)
  })
  const beds = Math.max(1, Math.ceil(Math.max(plants.length, top + 1) / SPOTS_PER_BED))
  return { spots, beds }
}

/** A `place` event body for a plant's new spot (the caller adds id and at). */
export const plantPlace = (bookId: string, to: Spot) =>
  ({ kind: 'place', key: plantKey(bookId), bed: to.bed, spot: to.spot }) as const

/** A `place` event body for a garden item; `off: 1` takes it away again. */
export const itemPlace = (year: number, item: GardenItemId, slot: number) =>
  ({ kind: 'place', key: itemKey(year, item), slot }) as const

export const itemRemove = (year: number, item: GardenItemId) =>
  ({ kind: 'place', key: itemKey(year, item), slot: 0, off: 1 }) as const

export const EARLIER = EARLIER_YEAR
