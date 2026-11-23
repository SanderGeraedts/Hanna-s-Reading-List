import type { Book } from '../library'
import { localDay } from '../library'
import type { OwnChallenge } from '../ownChallenges'
import { sleepReadIds } from '../sleepSeries'
import { isChoose, isCurrent, isFeed, isHatch, isName, isRelease } from './choices'
import type { ChoiceEvent, ChooseEvent, DuplicatePick, HatchEvent } from './choices'
import { earnedThrough, readingDays, thisWeek } from './cookies'
import type { ReadingDay, Week } from './cookies'
import { addDays, daysBetween } from './days'
import { earnedEggs, eggSpecies, eggTier, nextEgg } from './eggs'
import type { Egg, NextEgg } from './eggs'
import { seededHash } from './hash'
import {
  CREATURES_START,
  EGG_PRICE,
  FEED_SIZE,
  GROWN_FROM,
  GROWTH_PER_COOKIE,
  GROWTH_PER_READING_DAY,
  MISSING_AFTER_DAYS,
  NAME_MAX,
  POWER_UP_LEVELS,
  SHINY_DUPLICATE_ONE_IN,
  SHINY_ONE_IN,
  SLEEPY_FROM,
  SLEEPY_UNTIL,
  STAR_FROM,
  SUGGESTED_NAMES,
  WELCOME_CHOICES,
  WELCOME_EGG,
  YOUNG_FROM,
  levelCost,
} from './numbers'
import type { SpeciesId, Tier } from './species'

export { seededHash }

/**
 * Her creatures as they are right now, worked out from her books and her
 * choices (D-0033 §1): nothing here is stored. The same books and the same log
 * give the same pets, levels, eggs and balance on every device.
 */

export type Stage = 'baby' | 'young' | 'grown'
export type Mood = 'missing' | 'sleepy' | 'back'

// ---- seeded hashes (D-0033 §7) ----------------------------------------------------------

/**
 * Whether the egg hatches a shiny: 1 in 20, or 1 in 5 for a duplicate, a fixed
 * result of its id (also for the welcome egg, which is never a duplicate).
 * Every 1-in-20 shiny is also a 1-in-5 one.
 */
export function isShinyEgg(egg: string, duplicate = false): boolean {
  return seededHash(`shiny:${egg}`) % (duplicate ? SHINY_DUPLICATE_ONE_IN : SHINY_ONE_IN) === 0
}

/** The name suggested for a creature from this egg, `step` names further on in its list (🎲). */
export function suggestedName(species: SpeciesId, egg: string, step = 0): string {
  const list = SUGGESTED_NAMES[species] ?? ['Buddy']
  return list[(seededHash(`name:${egg}`) + step) % list.length]
}

/** A name as she typed it: trimmed and at most 20 characters, or null when empty. */
export function cleanName(raw: string): string | null {
  const name = [...raw.trim()].slice(0, NAME_MAX).join('').trim()
  return name ? name : null
}

// ---- growing (Design §1, §6) ------------------------------------------------------------

export interface Level {
  level: number
  /** growth into this level */
  into: number
  /** growth this level takes in all */
  need: number
}

/** Level 1 at growth 0; each next level costs levelCost(n). */
export function levelOf(growth: number): Level {
  let level = 1
  let left = Math.max(0, growth)
  while (left >= levelCost(level)) {
    left -= levelCost(level)
    level++
  }
  return { level, into: left, need: levelCost(level) }
}

/** The growth that lifts a pet at this growth exactly `levels` levels (into the level stays the same). */
export function growthForLevels(growth: number, levels: number): number {
  const { level } = levelOf(growth)
  let sum = 0
  for (let i = 0; i < levels; i++) sum += levelCost(level + i)
  return sum
}

export function stageOf(level: number): Stage {
  return level >= GROWN_FROM ? 'grown' : level >= YOUNG_FROM ? 'young' : 'baby'
}

export const STAGE_WORD: Record<Stage, string> = { baby: 'Baby', young: 'Young', grown: 'Grown-up' }

/** The level the next stage starts at, or null for a grown-up. */
export function nextStageLevel(level: number): number | null {
  return level < YOUNG_FROM ? YOUNG_FROM : level < GROWN_FROM ? GROWN_FROM : null
}

export const hasStar = (level: number) => level >= STAR_FROM

// ---- moods (Design §7) ------------------------------------------------------------------

/**
 * The mood right now, first match wins: missing you (the last reading day,
 * or the hatch day when she hasn't read since, is 3 or more days ago), sleepy
 * (22:30 to 06:00 on the device), back (today is a reading day and the one
 * before it was 3 or more days earlier). Never saved, never changes anything.
 */
export function moodOf(readingDayList: readonly string[], hatchDay: string, now: Date): Mood | null {
  const today = localDay(now)
  const past = readingDayList.filter((d) => d <= today).sort()
  const last = past.at(-1)
  const lastRef = last && last > hatchDay ? last : hatchDay
  if (daysBetween(lastRef, today) >= MISSING_AFTER_DAYS) return 'missing'
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes >= SLEEPY_FROM || minutes < SLEEPY_UNTIL) return 'sleepy'
  if (last === today) {
    const before = past.at(-2)
    const ref = before && before > hatchDay ? before : hatchDay
    if (daysBetween(ref, today) >= MISSING_AFTER_DAYS) return 'back'
  }
  return null
}

// ---- the whole picture -------------------------------------------------------------------

export interface Pet {
  /** the pet's id: its egg's id */
  id: string
  species: SpeciesId
  shiny: boolean
  /** the egg's tier */
  tier: Tier
  name: string
  /** the first suggestion not used by another pet of the species: the name when she hasn't given one */
  suggested: string
  hatchedAt: number
  hatchDay: string
  /** cookies fed in all */
  fed: number
  /** reading days from the hatch day on (each grows it a little by itself) */
  readingDays: number
  /** growth from duplicates used as power-ups */
  powerUps: number
  growth: number
  level: number
  into: number
  need: number
  stage: Stage
  mood: Mood | null
}

/** A hatched egg that is a species she had: what she did with it. */
export interface Duplicate {
  egg: string
  tier: Tier
  species: SpeciesId
  shiny: boolean
  /** null: she hasn't chosen (a shiny is then kept as a pet) */
  pick: DuplicatePick | null
}

export interface Creatures {
  today: string
  /** false before CREATURES_START (a test, or a wrong device clock) */
  started: boolean
  /** the welcome egg waits to be hatched */
  egg: boolean
  /** the current pet: her pick, or the first remaining one */
  pet: Pet | null
  /** every pet she has, in hatch order (welcome first) */
  pets: Pet[]
  /** milestone eggs waiting to be hatched, oldest first */
  eggs: Egg[]
  /** every milestone egg earned, in order */
  earnedEggs: Egg[]
  /** duplicates waiting for her choice (not shiny), oldest first */
  waiting: Duplicate[]
  /** every duplicate hatched, in hatch order */
  duplicates: Duplicate[]
  /** species ever hatched (released or traded ones stay found) */
  found: Set<SpeciesId>
  /** species whose shiny she has ever hatched */
  shinyFound: Set<SpeciesId>
  /** the milestone nearest to an egg */
  next: NextEgg | null
  /** cookies from reading */
  earned: number
  /** cookies from duplicates turned into cookies */
  bonus: number
  spent: number
  /** earned + bonus − spent; may be below zero after a fix to a past day */
  balance: number
  /** earned today */
  earnedToday: number
  week: Week
  days: Map<string, ReadingDay>
}

/** The hatch of an egg: the earliest hatch event for it (so two devices that both hatched it agree). */
export function hatchOf(log: readonly ChoiceEvent[], egg: string): HatchEvent | null {
  let best: HatchEvent | null = null
  for (const e of log) {
    if (!isHatch(e) || e.egg !== egg) continue
    // the welcome egg: only the five commons can be picked (D-0033 §3)
    if (egg === WELCOME_EGG && !WELCOME_CHOICES.includes(e.species!)) continue
    if (!best || e.at < best.at || (e.at === best.at && e.id < best.id)) best = e
  }
  return best
}

/** The newest name she gave a pet, or null. */
export function nameOf(log: readonly ChoiceEvent[], pet: string): string | null {
  let best: { at: number; id: string; name: string } | null = null
  for (const e of log) {
    if (!isName(e) || e.key !== pet) continue
    if (!best || e.at > best.at || (e.at === best.at && e.id > best.id)) best = e
  }
  return best ? cleanName(best.name) : null
}

/** Cookies she has given (to any pet). */
export const spentOf = (log: readonly ChoiceEvent[]) => log.reduce((n, e) => (isFeed(e) ? n + e.amount : n), 0)

/** By time; on the same millisecond a hatch comes before the choices about it, then by id. */
const byTime = (a: ChoiceEvent, b: ChoiceEvent) =>
  a.at - b.at || Number(a.kind !== 'hatch') - Number(b.kind !== 'hatch') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

export interface Options {
  /** a dev-only switch to see a shiny hatch (never in a build) */
  forceShiny?: boolean
  /** a dev-only switch: every milestone egg is a duplicate of the welcome pet (never in a build) */
  forceDuplicate?: boolean
  sleep?: Set<string>
  /** her own challenges (a challenge done gives an egg) */
  challenges?: readonly OwnChallenge[]
}

interface Hatched {
  egg: string
  tier: Tier
  species: SpeciesId
  shiny: boolean
  duplicate: boolean
  hatch: HatchEvent
}

interface Living {
  h: Hatched
  powerUps: number
  /** her choice for a duplicate (keep, or nothing yet for a kept shiny) */
  choice: ChooseEvent | null
}

export function deriveCreatures(books: Book[], log: readonly ChoiceEvent[], now: Date, opts: Options = {}): Creatures {
  const today = localDay(now)
  const days = readingDays(books, opts.sleep ?? sleepReadIds(books))
  const earned = earnedThrough(days, today)
  const spent = spentOf(log)
  const started = today >= CREATURES_START
  const welcome = hatchOf(log, WELCOME_EGG)
  const earnedList = started ? earnedEggs(books, days, today, opts.challenges) : []
  const dayList = [...days.keys()]

  // the order eggs were earned: welcome, the milestones, then hatched eggs no longer earned (a fixed past day)
  const order = new Map<string, number>([[WELCOME_EGG, 0]])
  earnedList.forEach((e, i) => order.set(e.id, i + 1))
  const firstHatch = new Map<string, HatchEvent>()
  for (const e of [...log].sort(byTime)) {
    if (!isHatch(e) || firstHatch.has(e.egg)) continue
    if (e.egg === WELCOME_EGG) {
      if (welcome) firstHatch.set(e.egg, welcome)
    } else if (eggTier(e.egg)) firstHatch.set(e.egg, e)
  }
  let late = order.size
  for (const [egg] of [...firstHatch].sort(([, a], [, b]) => byTime(a, b))) if (!order.has(egg)) order.set(egg, late++)

  // what each egg hatches, and whether it is a duplicate: decided by the eggs earned before it (D-0033 §7)
  const speciesOf = (egg: string, tier: Tier): SpeciesId | null => {
    if (egg === WELCOME_EGG) return welcome ? welcome.species! : null
    if (opts.forceDuplicate && welcome) return welcome.species!
    return eggSpecies(egg, tier)
  }
  const seen = new Set<SpeciesId>()
  const hatched: Hatched[] = []
  for (const [egg] of [...order].sort(([, a], [, b]) => a - b)) {
    const tier = eggTier(egg)!
    const species = speciesOf(egg, tier)
    if (!species) continue
    const duplicate = seen.has(species)
    seen.add(species)
    const hatch = firstHatch.get(egg)
    if (hatch) hatched.push({ egg, tier, species, shiny: opts.forceShiny || isShinyEgg(egg, duplicate), duplicate, hatch })
  }
  const hatchedBy = new Map(hatched.map((h) => [h.egg, h]))

  // reading days and feeds up to a moment, for a power-up's levels at the time it was used
  const feedsTo = (pet: string, before = Infinity) =>
    log.reduce((n, e) => (isFeed(e) && e.pet === pet && e.at < before ? n + e.amount : n), 0)
  const readingSince = (hatchDay: string, until: string) => dayList.filter((d) => d >= hatchDay && d <= until).length
  const hatchDayOf = (h: Hatched) => localDay(new Date(h.hatch.at))

  // the choices, in the order she made them
  const living = new Map<string, Living>()
  const pending = new Map<string, Hatched>()
  const decided = new Map<string, DuplicatePick>()
  let bonus = 0
  const events = [...log].sort(byTime)
  for (const e of events) {
    if (isHatch(e)) {
      const h = hatchedBy.get(e.egg)
      if (!h || h.hatch !== e) continue
      // a duplicate that isn't shiny waits for her choice; a shiny is kept by default (D-0033 §9)
      if (h.duplicate && !h.shiny) pending.set(h.egg, h)
      else living.set(h.egg, { h, powerUps: 0, choice: null })
    } else if (isChoose(e)) {
      const h = hatchedBy.get(e.egg)
      if (!h || !h.duplicate || decided.has(h.egg)) continue
      if (!pending.has(h.egg) && !(h.shiny && living.has(h.egg))) continue
      if (e.pick === 'keep') {
        decided.set(h.egg, 'keep')
        if (pending.delete(h.egg)) living.set(h.egg, { h, powerUps: 0, choice: e })
        continue
      }
      // shiny safety: cookies or a power-up from a shiny needs the hold (D-0033 §9)
      if (h.shiny && e.hold !== 1) continue
      if (e.pick === 'power') {
        const target = e.pet ? living.get(e.pet) : undefined
        if (!target || target.h.species !== h.species || e.pet === h.egg) continue
        const hatchDay = hatchDayOf(target.h)
        const growth =
          feedsTo(target.h.egg, e.at) * GROWTH_PER_COOKIE +
          readingSince(hatchDay, localDay(new Date(e.at))) * GROWTH_PER_READING_DAY +
          target.powerUps
        target.powerUps += growthForLevels(growth, POWER_UP_LEVELS)
      } else bonus += EGG_PRICE[h.tier] / 2
      decided.set(h.egg, e.pick)
      pending.delete(h.egg)
      living.delete(h.egg)
    } else if (isRelease(e)) {
      const pet = living.get(e.pet)
      // never her last pet, and a shiny only with the hold (D-0033 §9)
      if (!pet || living.size <= 1 || (pet.h.shiny && e.hold !== 1)) continue
      living.delete(e.pet)
    }
  }

  // the pets, in hatch order, with names that don't repeat within a species
  const pets: Pet[] = []
  for (const h of hatched) {
    const l = living.get(h.egg)
    if (!l) continue
    const hatchDay = hatchDayOf(h)
    const fed = feedsTo(h.egg)
    const reading = readingSince(hatchDay, today)
    const growth = fed * GROWTH_PER_COOKIE + reading * GROWTH_PER_READING_DAY + l.powerUps
    const lvl = levelOf(growth)
    const taken = new Set(pets.filter((p) => p.species === h.species).map((p) => p.name))
    const list = SUGGESTED_NAMES[h.species]
    let suggested = suggestedName(h.species, h.egg)
    for (let step = 0; step < list.length && taken.has(suggested); step++) suggested = suggestedName(h.species, h.egg, step + 1)
    pets.push({
      id: h.egg,
      species: h.species,
      shiny: h.shiny,
      tier: h.tier,
      name: nameOf(log, h.egg) ?? suggested,
      suggested,
      hatchedAt: h.hatch.at,
      hatchDay,
      fed,
      readingDays: reading,
      powerUps: l.powerUps,
      growth,
      ...lvl,
      stage: stageOf(lvl.level),
      mood: moodOf(dayList, hatchDay, now),
    })
  }

  // the current pet: her newest pick while it is still hers, else the first remaining one (D-0033 §9)
  let current: { at: number; id: string; pet: string } | null = null
  for (const e of log) if (isCurrent(e) && (!current || e.at > current.at || (e.at === current.at && e.id > current.id))) current = e
  const pet = pets.find((p) => p.id === current?.pet) ?? pets[0] ?? null

  const duplicates: Duplicate[] = hatched
    .filter((h) => h.duplicate)
    .map((h) => ({ egg: h.egg, tier: h.tier, species: h.species, shiny: h.shiny, pick: decided.get(h.egg) ?? null }))

  return {
    today,
    started,
    egg: started && !welcome,
    pet,
    pets,
    eggs: earnedList.filter((e) => !firstHatch.has(e.id)),
    earnedEggs: earnedList,
    waiting: duplicates.filter((d) => pending.has(d.egg)),
    duplicates,
    found: new Set(hatched.map((h) => h.species)),
    shinyFound: new Set(hatched.filter((h) => h.shiny).map((h) => h.species)),
    next: started ? nextEgg(books, days, today, earnedList) : null,
    earned,
    bonus,
    spent,
    balance: earned + bonus - spent,
    earnedToday: earned - earnedThrough(days, addDays(today, -1)),
    week: thisWeek(days, today),
    days,
  }
}

/** What one tap on Feed gives: 5 🍪, or what's left when fewer; 0 at a balance of 0 or below. */
export function feedAmount(balance: number): number {
  return Math.max(0, Math.min(FEED_SIZE, balance))
}

// ---- choices that remove a pet: refused without their confirm steps (D-0033 §9) -------------

export type Refusal = 'unknown' | 'confirm' | 'last' | 'shiny' | 'target'

/**
 * The `choose` event for a duplicate, or why it is refused: cookies or a
 * power-up from a shiny need the hold; a power-up needs a pet of the same species.
 */
export function chooseEvent(
  c: Creatures,
  egg: string,
  pick: DuplicatePick,
  opts: { target?: string; held?: boolean } = {},
): { ok: true; event: Omit<ChooseEvent, 'id' | 'at'> } | { ok: false; why: Refusal } {
  const d = c.duplicates.find((x) => x.egg === egg)
  if (!d || d.pick !== null) return { ok: false, why: 'unknown' }
  if (!d.shiny && !c.waiting.some((w) => w.egg === egg)) return { ok: false, why: 'unknown' }
  if (pick !== 'keep' && d.shiny && !opts.held) return { ok: false, why: 'shiny' }
  if (pick === 'power') {
    const target = c.pets.find((p) => p.id === opts.target)
    if (!target || target.species !== d.species || target.id === egg) return { ok: false, why: 'target' }
  }
  return {
    ok: true,
    event: {
      kind: 'choose',
      egg,
      pick,
      ...(pick === 'power' && { pet: opts.target }),
      ...(pick !== 'keep' && d.shiny && { hold: 1 }),
    },
  }
}

/** The `release` event for a pet, or why it is refused: the confirm, her last pet, a shiny without the hold. */
export function releaseEvent(
  c: Creatures,
  pet: string,
  opts: { confirmed?: boolean; held?: boolean } = {},
): { ok: true; event: { kind: 'release'; pet: string; confirm: 1; hold?: 1 } } | { ok: false; why: Refusal } {
  const p = c.pets.find((x) => x.id === pet)
  if (!p) return { ok: false, why: 'unknown' }
  if (c.pets.length <= 1) return { ok: false, why: 'last' }
  if (!opts.confirmed) return { ok: false, why: 'confirm' }
  if (p.shiny && !opts.held) return { ok: false, why: 'shiny' }
  return { ok: true, event: { kind: 'release', pet, confirm: 1, ...(p.shiny && { hold: 1 as const }) } }
}
