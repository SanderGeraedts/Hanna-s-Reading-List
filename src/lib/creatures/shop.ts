import type { ChoiceEvent } from './choices'
import { FOOD_GROWTH, SHOP } from './numbers'
import type { Tier } from './species'
import { TIERS } from './species'

/**
 * The creature shop (T-0031): the 41 items for sale, and what her `buy`,
 * `wear`, `place` and `habitat` choices (D-0034) add up to. Nothing here is
 * stored: owned items, outfits, the den and the cookies spent are worked out
 * from the log on every device, like everything else (D-0033 §1).
 *
 * - `buy` { item, price } (food also { pet }): the price as it was shown, so a
 *   later price change never changes what she paid (Goal 3). An item that can
 *   be bought once counts once, even when two devices both bought it; food and
 *   eggs count every time.
 * - `wear` key `<pet id>:<slot>` { item | 'none' }: pet ids may hold colons, so
 *   the slot is after the last one.
 * - `place` key `home:<slot>` { item | 'none' }.
 * - `habitat` key `den` { item }: 'cosy' or a habitat she owns.
 *
 * A `wear`, `place` or `habitat` of an item she doesn't own (yet: its `buy` may
 * still be on its way from another device) is ignored until the `buy` arrives.
 */

export type ShopCategory = 'food' | 'outfits' | 'home' | 'eggs' | 'toys' | 'habitats' | 'room'
export type OutfitSlot = 'head' | 'face' | 'neck' | 'back'
export type DenSlot = 'bed' | 'rug' | 'wall' | 'left' | 'right' | 'toy'
export type RoomDecorId = 'dragon-plush' | 'pennant' | 'egg-display' | 'snow-globe'
export type HabitatId = 'cosy' | 'forest' | 'beach' | 'ice' | 'castle-library'

export interface ShopItem {
  id: string
  name: string
  category: ShopCategory
  /** outfits: the anchor slot; home and toys: the den spot */
  slot?: OutfitSlot | DenSlot
  /** eggs: the tier */
  tier?: Tier
}

export const OUTFIT_SLOTS: readonly OutfitSlot[] = ['head', 'face', 'neck', 'back']
export const DEN_SLOTS: readonly DenSlot[] = ['bed', 'rug', 'wall', 'left', 'right', 'toy']

export const SLOT_WORD: Record<OutfitSlot | DenSlot, string> = {
  head: 'Head',
  face: 'Face',
  neck: 'Neck',
  back: 'Back',
  bed: 'Bed',
  rug: 'Rug',
  wall: 'Wall',
  left: 'Left corner',
  right: 'Right corner',
  toy: 'Toy',
}

/** The category chips and headings, in order (Design §5). */
export const CATEGORIES: ReadonlyArray<{ id: ShopCategory; emoji: string; chip: string; heading: string }> = [
  { id: 'food', emoji: '🍓', chip: 'Food', heading: 'Food' },
  { id: 'outfits', emoji: '🎀', chip: 'Outfits', heading: 'Outfits & accessories' },
  { id: 'home', emoji: '🛋️', chip: 'Home', heading: 'Home' },
  { id: 'eggs', emoji: '🥚', chip: 'Eggs', heading: 'Eggs' },
  { id: 'toys', emoji: '🧶', chip: 'Toys', heading: 'Toys' },
  { id: 'habitats', emoji: '🌲', chip: 'Habitats', heading: 'Habitats' },
  { id: 'room', emoji: '🎨', chip: 'Room', heading: 'Reading room' },
]

export const isCategory = (v: unknown): v is ShopCategory => CATEGORIES.some((c) => c.id === v)

const item = (id: string, name: string, category: ShopCategory, extra: Partial<ShopItem> = {}): ShopItem => ({ id, name, category, ...extra })

/** The 41 items for sale, in shop order: by slot, then price (Design §2). Prices are in `SHOP`. */
export const SHOP_ITEMS: readonly ShopItem[] = [
  item('berry-snack', 'Berry snack', 'food'),
  item('honey-cake', 'Honey cake', 'food'),
  item('picnic-feast', 'Picnic feast', 'food'),

  item('big-bow', 'Big bow', 'outfits', { slot: 'head' }),
  item('bobble-hat', 'Bobble hat', 'outfits', { slot: 'head' }),
  item('flower-crown', 'Flower crown', 'outfits', { slot: 'head' }),
  item('little-crown', 'Little crown', 'outfits', { slot: 'head' }),
  item('reading-glasses', 'Reading glasses', 'outfits', { slot: 'face' }),
  item('heart-glasses', 'Heart glasses', 'outfits', { slot: 'face' }),
  item('star-glasses', 'Star glasses', 'outfits', { slot: 'face' }),
  item('bow-tie', 'Bow tie', 'outfits', { slot: 'neck' }),
  item('striped-scarf', 'Striped scarf', 'outfits', { slot: 'neck' }),
  item('bell-collar', 'Bell collar', 'outfits', { slot: 'neck' }),
  item('little-backpack', 'Little backpack', 'outfits', { slot: 'back' }),
  item('star-cape', 'Star cape', 'outfits', { slot: 'back' }),

  item('cloud-cushion', 'Cloud cushion', 'home', { slot: 'bed' }),
  item('basket-bed', 'Basket bed', 'home', { slot: 'bed' }),
  item('star-rug', 'Star rug', 'home', { slot: 'rug' }),
  item('fairy-lights', 'Fairy lights', 'home', { slot: 'wall' }),
  item('weather-window', 'Window', 'home', { slot: 'wall' }),
  item('potted-plant', 'Potted plant', 'home', { slot: 'left' }),
  item('mini-bookcase', 'Mini bookcase', 'home', { slot: 'left' }),
  item('book-tower', 'Book tower', 'home', { slot: 'right' }),
  item('reading-lamp', 'Reading lamp', 'home', { slot: 'right' }),

  ...TIERS.map((t) => item(eggItem(t), `${t[0].toUpperCase()}${t.slice(1)} egg`, 'eggs', { tier: t })),

  item('ball', 'Ball', 'toys', { slot: 'toy' }),
  item('yarn', 'Ball of yarn', 'toys', { slot: 'toy' }),
  item('slide', 'Slide', 'toys', { slot: 'toy' }),

  item('forest', 'Forest', 'habitats'),
  item('beach', 'Beach', 'habitats'),
  item('ice', 'Ice land', 'habitats'),
  item('castle-library', 'Castle library', 'habitats'),

  item('dragon-plush', 'Dragon plush', 'room'),
  item('pennant', 'Pennant flags', 'room'),
  item('egg-display', 'Egg display', 'room'),
  item('snow-globe', 'Snow globe', 'room'),
]

/** The free habitat she always has (not sold, so not one of the 41). */
export const COSY: ShopItem = { id: 'cosy', name: 'Cosy den', category: 'habitats' }

/** "egg-very-rare" for a tier. */
export function eggItem(t: Tier): string {
  return `egg-${t.replace(' ', '-')}`
}

const BY_ID = new Map(SHOP_ITEMS.map((i) => [i.id, i]))
export const shopItem = (id: string): ShopItem | undefined => (id === COSY.id ? COSY : BY_ID.get(id))
export const itemsIn = (c: ShopCategory): ShopItem[] => [...(c === 'habitats' ? [COSY] : []), ...SHOP_ITEMS.filter((i) => i.category === c)]

/** The price in 🍪 today (a purchase keeps its own price). */
export const priceOf = (id: string): number => SHOP[id] ?? 0

/** Food and eggs can be bought again and again; everything else once. */
export const repeatable = (i: ShopItem) => i.category === 'food' || i.category === 'eggs'

/** "the bobble hat", "the window". */
export const theItem = (i: Pick<ShopItem, 'name'>) => `the ${i.name.toLowerCase()}`

// ---- what her choices add up to ------------------------------------------------------------

export interface Purchase {
  /** the buy event's id */
  id: string
  at: number
  item: string
  /** the price she paid */
  price: number
  /** food: the pet it was given to */
  pet?: string
}

export interface ShopEgg {
  /** `shop:<purchase id>` (D-0033 §7) */
  id: string
  tier: Tier
  at: number
}

export interface ShopState {
  /** every purchase that counts, in time order */
  purchases: Purchase[]
  /** items she owns (everything but food and eggs), also ones no longer sold */
  owned: Set<string>
  /** cookies paid in all */
  spent: number
  /** what each pet wears, per slot (only owned outfits, in their own slot) */
  worn: Map<string, Partial<Record<OutfitSlot, string>>>
  /** what stands in each den spot (only owned items of that spot) */
  placed: Partial<Record<DenSlot, string>>
  habitat: HabitatId
  /** eggs she bought, oldest first */
  eggs: ShopEgg[]
  /** food given: per pet, at what time, how much growth */
  food: Array<{ pet: string; at: number; growth: number }>
}

const str = (v: unknown): v is string => typeof v === 'string' && v !== ''
const byTime = (a: ChoiceEvent, b: ChoiceEvent) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
/** For setting kinds: the newest event per key (the log already keeps only that, but a device's own copy may not be merged yet). */
function newestPerKey(log: readonly ChoiceEvent[], kind: string): Map<string, ChoiceEvent> {
  const out = new Map<string, ChoiceEvent>()
  for (const e of log) {
    if (e.kind !== kind || !str((e as { key?: unknown }).key)) continue
    const key = (e as unknown as { key: string }).key
    const had = out.get(key)
    if (!had || e.at > had.at || (e.at === had.at && e.id > had.id)) out.set(key, e)
  }
  return out
}

/** The slot of a `wear` key: after the last colon (pet ids may hold colons). */
export function splitWearKey(key: string): { pet: string; slot: string } | null {
  const i = key.lastIndexOf(':')
  if (i <= 0 || i === key.length - 1) return null
  return { pet: key.slice(0, i), slot: key.slice(i + 1) }
}
export const wearKey = (pet: string, slot: OutfitSlot) => `${pet}:${slot}`
export const placeKey = (slot: DenSlot) => `home:${slot}`

export function deriveShop(log: readonly ChoiceEvent[]): ShopState {
  const purchases: Purchase[] = []
  const owned = new Set<string>()
  const eggs: ShopEgg[] = []
  const food: ShopState['food'] = []
  let spent = 0
  for (const e of [...log].sort(byTime)) {
    if (e.kind !== 'buy') continue
    const x = e as unknown as Record<string, unknown>
    const price = x.price
    if (!str(x.item) || typeof price !== 'number' || !Number.isFinite(price) || price < 0) continue
    const it = shopItem(x.item)
    // something bought once counts once, also when two devices both bought it
    if (!(it && repeatable(it))) {
      if (owned.has(x.item)) continue
      owned.add(x.item)
    }
    const p: Purchase = { id: e.id, at: e.at, item: x.item, price, ...(str(x.pet) && { pet: x.pet }) }
    purchases.push(p)
    spent += price
    if (it?.category === 'eggs' && it.tier) eggs.push({ id: `shop:${e.id}`, tier: it.tier, at: e.at })
    if (it?.category === 'food' && p.pet) food.push({ pet: p.pet, at: e.at, growth: FOOD_GROWTH[it.id] ?? 0 })
  }

  const worn = new Map<string, Partial<Record<OutfitSlot, string>>>()
  for (const [key, e] of newestPerKey(log, 'wear')) {
    const k = splitWearKey(key)
    const id = (e as unknown as { item?: unknown }).item
    if (!k || !str(id) || id === 'none' || !owned.has(id)) continue
    const it = shopItem(id)
    if (it?.category !== 'outfits' || it.slot !== k.slot) continue
    const w = worn.get(k.pet) ?? {}
    w[k.slot as OutfitSlot] = id
    worn.set(k.pet, w)
  }

  const placed: ShopState['placed'] = {}
  for (const [key, e] of newestPerKey(log, 'place')) {
    const slot = key.startsWith('home:') ? key.slice(5) : ''
    const id = (e as unknown as { item?: unknown }).item
    if (!(DEN_SLOTS as readonly string[]).includes(slot) || !str(id) || id === 'none' || !owned.has(id)) continue
    const it = shopItem(id)
    if (!it || (it.category !== 'home' && it.category !== 'toys') || it.slot !== slot) continue
    placed[slot as DenSlot] = id
  }

  let habitat: HabitatId = 'cosy'
  const h = newestPerKey(log, 'habitat').get('den') as unknown as { item?: unknown } | undefined
  if (h && str(h.item) && (h.item === 'cosy' || (owned.has(h.item) && shopItem(h.item)?.category === 'habitats'))) habitat = h.item as HabitatId

  return { purchases, owned, spent, worn, placed, habitat, eggs, food }
}

/** The room decorations she owns (they join the 🎨 panel on every device, D-0022). */
export function ownedDecor(log: readonly ChoiceEvent[]): RoomDecorId[] {
  const owned = deriveShop(log).owned
  return SHOP_ITEMS.filter((i) => i.category === 'room' && owned.has(i.id)).map((i) => i.id as RoomDecorId)
}

// ---- checking a choice before it is saved ----------------------------------------------------

export type ShopRefusal = 'unknown' | 'owned' | 'balance' | 'pet' | 'slot'

/** What a buy saves, or why it is refused: not sold, bought already (once-only items), too few cookies, no pet for food. */
export function buyEvent(
  shop: ShopState,
  balance: number,
  id: string,
  opts: { pet?: string; pets?: readonly string[] } = {},
): { ok: true; event: { kind: 'buy'; item: string; price: number; pet?: string } } | { ok: false; why: ShopRefusal } {
  const it = BY_ID.get(id)
  const price = SHOP[id]
  if (!it || price === undefined) return { ok: false, why: 'unknown' }
  if (!repeatable(it) && shop.owned.has(id)) return { ok: false, why: 'owned' }
  // buying waits while the balance is below the price, also below zero (D-0033 §2)
  if (balance < price || balance <= 0) return { ok: false, why: 'balance' }
  if (it.category === 'food' && (!opts.pet || (opts.pets && !opts.pets.includes(opts.pet)))) return { ok: false, why: 'pet' }
  return { ok: true, event: { kind: 'buy', item: id, price, ...(it.category === 'food' && { pet: opts.pet }) } }
}

/** A `wear` choice: only an owned outfit, in its own slot; `none` takes the slot off. */
export function wearEvent(
  shop: ShopState,
  pet: string,
  slot: OutfitSlot,
  id: string | 'none',
): { ok: true; event: { kind: 'wear'; key: string; item: string } } | { ok: false; why: ShopRefusal } {
  if (id !== 'none') {
    const it = BY_ID.get(id)
    if (!it || it.category !== 'outfits') return { ok: false, why: 'unknown' }
    if (it.slot !== slot) return { ok: false, why: 'slot' }
    if (!shop.owned.has(id)) return { ok: false, why: 'owned' }
  }
  return { ok: true, event: { kind: 'wear', key: wearKey(pet, slot), item: id } }
}

/** A `place` choice: only an owned home item or toy, in its own spot; `none` puts the spot away. */
export function placeEvent(
  shop: ShopState,
  slot: DenSlot,
  id: string | 'none',
): { ok: true; event: { kind: 'place'; key: string; item: string } } | { ok: false; why: ShopRefusal } {
  if (id !== 'none') {
    const it = BY_ID.get(id)
    if (!it || (it.category !== 'home' && it.category !== 'toys')) return { ok: false, why: 'unknown' }
    if (it.slot !== slot) return { ok: false, why: 'slot' }
    if (!shop.owned.has(id)) return { ok: false, why: 'owned' }
  }
  return { ok: true, event: { kind: 'place', key: placeKey(slot), item: id } }
}

/** A `habitat` choice: the Cosy den or an owned habitat. */
export function habitatEvent(shop: ShopState, id: string): { ok: true; event: { kind: 'habitat'; key: 'den'; item: string } } | { ok: false; why: ShopRefusal } {
  if (id !== 'cosy') {
    const it = BY_ID.get(id)
    if (!it || it.category !== 'habitats') return { ok: false, why: 'unknown' }
    if (!shop.owned.has(id)) return { ok: false, why: 'owned' }
  }
  return { ok: true, event: { kind: 'habitat', key: 'den', item: id } }
}
