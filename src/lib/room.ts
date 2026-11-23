import { DECOR } from './shelfLayout'
import type { DecorKind } from './shelfLayout'

/**
 * Make the room yours: the wood of the bookcase, the wallpaper (on every
 * page), whether the books are detailed hardcovers (D-0035) and which
 * decorations stand on the shelves, in which order. Kept per
 * device, like the dashboard layout; the defaults are the room as it was.
 */

export type Wood = 'walnut' | 'honey' | 'whitewash' | 'ebony' | 'cherry'
export type Wallpaper = 'lavender' | 'midnight'

export const WOODS: Record<Wood, string> = {
  walnut: 'Walnut',
  honey: 'Honey oak',
  whitewash: 'White-washed',
  ebony: 'Dark ebony',
  cherry: 'Cherry',
}

export const WALLPAPERS: Record<Wallpaper, string> = {
  lavender: 'Lavender stripes',
  midnight: 'Midnight blue with stars',
}

export const DECOR_NAMES: Record<DecorKind, string> = {
  koala: 'Koala',
  cat: 'Sleeping cat',
  mug: 'Mug of tea',
  ivy: 'Ivy',
  candle: 'Candle',
  succulent: 'Succulent',
  frame: 'Picture frame',
  vase: 'Pampas vase',
}

export interface Room {
  wood: Wood
  wallpaper: Wallpaper
  /** every decoration once, in shelf order (the first on the top shelf), on or off */
  decor: Array<{ kind: DecorKind; on: boolean }>
  /** the books as hardcovers (on) or as simple blocks (off), on this device (D-0035) */
  detailedBooks: boolean
}

export const DEFAULT_ROOM: Room = {
  wood: 'walnut',
  wallpaper: 'lavender',
  decor: DECOR.map((d) => ({ kind: d.kind, on: true })),
  detailedBooks: true,
}

const isKey = <T extends string>(o: Record<T, string>, v: unknown): v is T => typeof v === 'string' && Object.hasOwn(o, v)

/** A saved room made safe: unknown values fall back to the defaults, every decoration exactly once. */
export function cleanRoom(raw: unknown): Room {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Room, unknown>>
  const seen = new Set<DecorKind>()
  const decor: Room['decor'] = []
  for (const d of Array.isArray(r.decor) ? r.decor : []) {
    const kind = (d as { kind?: unknown })?.kind
    if (!isKey(DECOR_NAMES, kind) || seen.has(kind)) continue
    seen.add(kind)
    decor.push({ kind, on: (d as { on?: unknown }).on !== false })
  }
  // decorations added later come in at the end, switched on
  for (const d of DEFAULT_ROOM.decor) if (!seen.has(d.kind)) decor.push({ ...d })
  return {
    wood: isKey(WOODS, r.wood) ? r.wood : DEFAULT_ROOM.wood,
    wallpaper: isKey(WALLPAPERS, r.wallpaper) ? r.wallpaper : DEFAULT_ROOM.wallpaper,
    decor,
    // only a saved false turns them off: a room saved before the switch counts as on
    detailedBooks: r.detailedBooks !== false,
  }
}

/** The decorations to put on the shelves, in order. */
export const shownDecor = (room: Room): DecorKind[] => room.decor.filter((d) => d.on).map((d) => d.kind)

export function toggleDecor(room: Room, kind: DecorKind): Room {
  return { ...room, decor: room.decor.map((d) => (d.kind === kind ? { ...d, on: !d.on } : d)) }
}

/** Moves a decoration one place up (-1, a shelf higher) or down (+1). */
export function moveDecor(room: Room, kind: DecorKind, by: -1 | 1): Room {
  const i = room.decor.findIndex((d) => d.kind === kind)
  const j = i + by
  if (i < 0 || j < 0 || j >= room.decor.length) return room
  const decor = [...room.decor]
  ;[decor[i], decor[j]] = [decor[j], decor[i]]
  return { ...room, decor }
}
