import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Book } from '#/lib/library'
import type { OwnChallenge } from '#/lib/ownChallenges'
import { chooseEvent, deriveCreatures, feedAmount, levelOf, releaseEvent } from '#/lib/creatures/creature'
import type { Creatures, Pet, Refusal } from '#/lib/creatures/creature'
import type { DuplicatePick } from '#/lib/creatures/choices'
import {
  NOT_ENOUGH,
  boughtSay,
  cookiesSay,
  decorSay,
  duplicateCookies,
  eggBoughtSay,
  feedSay,
  foodSay,
  habitatSay,
  levelUpLine,
  levelUpSay,
  placeSay,
  putAwaySay,
  releaseSay,
  takeOffSay,
  wearSay,
} from '#/lib/creatures/words'
import { buyEvent, habitatEvent, placeEvent, shopItem, wearEvent } from '#/lib/creatures/shop'
import type { DenSlot, OutfitSlot, ShopRefusal } from '#/lib/creatures/shop'
import { FOOD_GROWTH } from '#/lib/creatures/numbers'
import { POWER_UP_LEVELS } from '#/lib/creatures/numbers'
import { useCreatureChoices, useSeenLevels } from '../useCreatureChoices'
import type { CreatureChoices } from '../useCreatureChoices'
import { useOwnChallenges } from '../OwnChallenges'

/**
 * Her creatures for the whole page (T-0029, T-0030): the choices log, her own
 * challenges (a challenge done gives an egg) and the level-ups seen on this
 * device live here once, so the Creatures tab, the dashboard block and Waiting
 * for you always show the same pets and eggs.
 */

export interface CreaturesApi {
  choices: CreatureChoices
  seen: Record<string, number>
  see: (pet: string, level: number) => void
  challenges: readonly OwnChallenge[]
  /** dev only: every hatch comes out shiny (to see one; never in a build) */
  forceShiny: boolean
  /** dev only: every milestone egg hatches her first pet's species again (never in a build) */
  forceDuplicate: boolean
}

const Ctx = createContext<CreaturesApi | null>(null)

/**
 * In dev, `localStorage['hannas-reading-list:dev-shiny'] = '1'` makes every hatch shiny, and
 * `…:dev-duplicate` = '1' every milestone egg a duplicate (T-0029/T-0030 Design §14).
 */
function devFlag(name: string): boolean {
  if (!import.meta.env.DEV) return false
  try {
    return localStorage.getItem(`hannas-reading-list:${name}`) === '1'
  } catch {
    return false
  }
}

/** The page's creatures state; the page that holds the provider may read it too (the 🎨 room needs her purchases, T-0031). */
export function useCreaturesValue(accountId: string | null): CreaturesApi {
  const choices = useCreatureChoices(accountId)
  const [seen, see] = useSeenLevels(accountId)
  const [challenges] = useOwnChallenges(accountId)
  const [forceShiny] = useState(() => devFlag('dev-shiny'))
  const [forceDuplicate] = useState(() => devFlag('dev-duplicate'))
  return useMemo(
    () => ({ choices, seen, see, challenges, forceShiny, forceDuplicate }),
    [choices, seen, see, challenges, forceShiny, forceDuplicate],
  )
}

export function CreaturesProvider({ accountId, value, children }: { accountId?: string | null; value?: CreaturesApi; children: ReactNode }) {
  if (value) return <Ctx.Provider value={value}>{children}</Ctx.Provider>
  return <OwnProvider accountId={accountId ?? null}>{children}</OwnProvider>
}

function OwnProvider({ accountId, children }: { accountId: string | null; children: ReactNode }) {
  const value = useCreaturesValue(accountId)
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Without a provider (a block rendered on its own, e.g. in a test): an empty log that saves nothing. */
const NO_CHOICES: CreaturesApi = {
  choices: { log: [], hatch: () => {}, rename: () => {}, feed: () => {}, hatchEgg: () => {}, record: () => {}, buy: () => false },
  seen: {},
  see: () => {},
  challenges: [],
  forceShiny: false,
  forceDuplicate: false,
}

export function useCreaturesApi(): CreaturesApi {
  return useContext(Ctx) ?? NO_CHOICES
}

/** The device clock, again every minute (moods follow the time of day). */
export function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])
  return now
}

export interface LevelUp {
  pet: Pet
  text: string
}

export type Done = { ok: true; say: string } | { ok: false; why: Refusal }
export type ShopDone = { ok: true; say: string; levelUp?: boolean } | { ok: false; why: ShopRefusal; say?: string }

/** Her creatures right now, worked out from the books and the log, with what the buttons need. */
export function useCreatures(books: Book[]) {
  const api = useCreaturesApi()
  const now = useMinuteClock()
  const c: Creatures = useMemo(
    () =>
      deriveCreatures(books, api.choices.log, now, {
        forceShiny: api.forceShiny,
        forceDuplicate: api.forceDuplicate,
        challenges: api.challenges,
      }),
    [books, api.choices.log, now, api.forceShiny, api.forceDuplicate, api.challenges],
  )
  const pet = c.pet
  // the newest level-up not seen on this device; never on its first meeting with a level-1 pet
  const levelUp: LevelUp | null = pet && pet.level > (api.seen[pet.id] ?? 1) ? { pet, text: levelUpLine(pet.name, pet.level, api.seen[pet.id] ?? 1) } : null

  /** One tap on Feed for a pet (the current one by default): gives what feedAmount allows; answers what the live region says, or null when nothing was given. */
  const feed = useCallback((petId?: string): { say: string; levelUp: boolean } | null => {
    const pet = (petId && c.pets.find((p) => p.id === petId)) || c.pet
    if (!pet) return null
    const amount = feedAmount(c.balance)
    if (!amount) return null
    api.choices.feed(pet.id, amount)
    const after = levelOf(pet.growth + amount).level
    // she saw it happen: not in Waiting for you on this device
    if (after > pet.level) {
      api.see(pet.id, after)
      return { say: levelUpSay(pet.name, after, pet.level), levelUp: true }
    }
    return { say: feedSay(pet.name, amount, c.balance - amount), levelUp: false }
  }, [api, c])

  /** A duplicate choice, refused (and nothing saved) without the hold on a shiny (D-0033 §9). */
  const choose = useCallback(
    (egg: string, pick: DuplicatePick, opts: { target?: string; held?: boolean } = {}): Done => {
      const r = chooseEvent(c, egg, pick, opts)
      if (!r.ok) return r
      api.choices.record(r.event)
      if (pick === 'cookies') {
        const d = c.duplicates.find((x) => x.egg === egg)!
        return { ok: true, say: cookiesSay(duplicateCookies(d.tier)) }
      }
      if (pick === 'power') {
        const target = c.pets.find((p) => p.id === opts.target)!
        const after = target.level + POWER_UP_LEVELS
        api.see(target.id, after)
        return { ok: true, say: levelUpSay(target.name, after, target.level) }
      }
      return { ok: true, say: '' }
    },
    [api, c],
  )

  /** A release, refused (and nothing saved) without the confirm, for her last pet, or for a shiny without the hold. */
  const release = useCallback(
    (petId: string, opts: { confirmed?: boolean; held?: boolean }): Done => {
      const r = releaseEvent(c, petId, opts)
      if (!r.ok) return r
      api.choices.record(r.event)
      const gone = c.pets.find((p) => p.id === petId)!
      // a release only happens from the current pet's card: her first remaining pet takes its place
      const next = c.pets.filter((p) => p.id !== petId)[0]
      return { ok: true, say: releaseSay(gone.name, next.name) }
    },
    [api, c],
  )

  /** Saves the current pet (the caller waits for her to stop arrowing). */
  const setCurrent = useCallback((petId: string) => api.choices.record({ kind: 'current', key: 'pet', pet: petId }), [api])

  // ---- the shop (T-0031) ----

  /**
   * A purchase, checked against the balance right now (it may have changed on another device:
   * then nothing is saved and the live region says so). Food goes to `pet` at once.
   */
  const buy = useCallback(
    (id: string, opts: { pet?: string } = {}): ShopDone => {
      const r = buyEvent(c.shop, c.balance, id, { pet: opts.pet, pets: c.pets.map((p) => p.id) })
      if (!r.ok) return r.why === 'balance' ? { ...r, say: NOT_ENOUGH } : r
      if (!api.choices.buy(r.event)) return { ok: false, why: 'owned' }
      const it = shopItem(id)!
      const after = c.balance - r.event.price
      if (it.category === 'eggs') return { ok: true, say: eggBoughtSay(it.tier!) }
      if (it.category === 'food') {
        const pet = c.pets.find((p) => p.id === opts.pet)!
        const level = levelOf(pet.growth + (FOOD_GROWTH[id] ?? 0)).level
        if (level > pet.level) {
          // she saw it happen: not in Waiting for you on this device
          api.see(pet.id, level)
          return { ok: true, say: `${foodSay(pet.name, it, after)} ${levelUpSay(pet.name, level, pet.level)}`, levelUp: true }
        }
        return { ok: true, say: foodSay(pet.name, it, after) }
      }
      return { ok: true, say: boughtSay(it, after) }
    },
    [api, c],
  )

  /** Puts an owned outfit on a pet (one per slot: what was there comes off), or takes the slot off (`none`). */
  const wear = useCallback(
    (petId: string, slot: OutfitSlot, id: string | 'none'): ShopDone => {
      const was = c.shop.worn.get(petId)?.[slot]
      const r = wearEvent(c.shop, petId, slot, id)
      if (!r.ok) return r
      api.choices.record(r.event)
      const pet = c.pets.find((p) => p.id === petId)
      if (id === 'none') return { ok: true, say: was ? takeOffSay(shopItem(was)!) : '' }
      return { ok: true, say: wearSay(pet?.name ?? '', shopItem(id)!) }
    },
    [api, c],
  )

  /** Places an owned home item or toy in its spot (the old one goes back), or puts the spot away (`none`). */
  const place = useCallback(
    (slot: DenSlot, id: string | 'none'): ShopDone => {
      const was = c.shop.placed[slot]
      const r = placeEvent(c.shop, slot, id)
      if (!r.ok) return r
      api.choices.record(r.event)
      if (id === 'none') return { ok: true, say: was ? putAwaySay(shopItem(was)!) : '' }
      return { ok: true, say: placeSay(shopItem(id)!, was && was !== id ? shopItem(was) : undefined) }
    },
    [api, c],
  )

  /** Makes the Cosy den or an owned habitat the den's background. */
  const setHabitat = useCallback(
    (id: string): ShopDone => {
      const r = habitatEvent(c.shop, id)
      if (!r.ok) return r
      api.choices.record(r.event)
      return { ok: true, say: habitatSay(shopItem(id)!) }
    },
    [api, c],
  )

  return { c, api, levelUp, feed, choose, release, setCurrent, now, buy, wear, place, setHabitat }
}

/** The live region's words for a decoration shown or hidden in the room on this device. */
export const decorShownSay = (id: string, on: boolean) => decorSay(shopItem(id)!, on)
