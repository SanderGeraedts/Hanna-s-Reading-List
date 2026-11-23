import type { Book } from '../library'
import { localDay } from '../library'
import { sleepReadIds } from '../sleepSeries'
import { isFeed, isHatch, isName } from './choices'
import type { ChoiceEvent, HatchEvent } from './choices'
import { earnedThrough, readingDays, thisWeek } from './cookies'
import type { ReadingDay, Week } from './cookies'
import { addDays, daysBetween } from './days'
import {
  CREATURES_START,
  FEED_SIZE,
  GROWN_FROM,
  GROWTH_PER_COOKIE,
  GROWTH_PER_READING_DAY,
  MISSING_AFTER_DAYS,
  NAME_MAX,
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
import type { SpeciesId } from './species'

/**
 * Her creature as it is right now, worked out from her books and her choices
 * (D-0033 §1): nothing here is stored. The same books and the same log give
 * the same creature, level and balance on every device.
 */

export type Stage = 'baby' | 'young' | 'grown'
export type Mood = 'missing' | 'sleepy' | 'back'

// ---- seeded hashes (D-0033 §7) ----------------------------------------------------------

/** FNV-1a, 32 bits: the same number for the same text on every device. */
export function seededHash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Whether the egg hatches a shiny: 1 in 20, a fixed result of its id (also for the welcome egg). */
export function isShinyEgg(egg: string): boolean {
  return seededHash(`shiny:${egg}`) % SHINY_ONE_IN === 0
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
  name: string
  /** the first suggestion: the name when she hasn't given one */
  suggested: string
  hatchedAt: number
  hatchDay: string
  /** cookies fed in all */
  fed: number
  /** reading days from the hatch day on (each grows it a little by itself) */
  readingDays: number
  growth: number
  level: number
  into: number
  need: number
  stage: Stage
  mood: Mood | null
}

export interface Creatures {
  today: string
  /** false before CREATURES_START (a test, or a wrong device clock) */
  started: boolean
  /** the welcome egg waits to be hatched */
  egg: boolean
  pet: Pet | null
  earned: number
  spent: number
  /** earned − spent; may be below zero after a fix to a past day */
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
    if (egg === WELCOME_EGG && !WELCOME_CHOICES.includes(e.species)) continue
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

export interface Options {
  /** a dev-only switch to see a shiny hatch (never in a build) */
  forceShiny?: boolean
  sleep?: Set<string>
}

export function deriveCreatures(books: Book[], log: readonly ChoiceEvent[], now: Date, opts: Options = {}): Creatures {
  const today = localDay(now)
  const days = readingDays(books, opts.sleep ?? sleepReadIds(books))
  const earned = earnedThrough(days, today)
  const spent = spentOf(log)
  const started = today >= CREATURES_START
  const hatch = hatchOf(log, WELCOME_EGG)
  let pet: Pet | null = null
  if (hatch) {
    const hatchDay = localDay(new Date(hatch.at))
    const dayList = [...days.keys()].filter((d) => d >= hatchDay && d <= today)
    const fed = log.reduce((n, e) => (isFeed(e) && e.pet === hatch.egg ? n + e.amount : n), 0)
    const growth = fed * GROWTH_PER_COOKIE + dayList.length * GROWTH_PER_READING_DAY
    const lvl = levelOf(growth)
    const suggested = suggestedName(hatch.species, hatch.egg)
    pet = {
      id: hatch.egg,
      species: hatch.species,
      shiny: opts.forceShiny || isShinyEgg(hatch.egg),
      name: nameOf(log, hatch.egg) ?? suggested,
      suggested,
      hatchedAt: hatch.at,
      hatchDay,
      fed,
      readingDays: dayList.length,
      growth,
      ...lvl,
      stage: stageOf(lvl.level),
      mood: moodOf([...days.keys()], hatchDay, now),
    }
  }
  return {
    today,
    started,
    egg: started && !hatch,
    pet,
    earned,
    spent,
    balance: earned - spent,
    earnedToday: earned - earnedThrough(days, addDays(today, -1)),
    week: thisWeek(days, today),
    days,
  }
}

/** What one tap on Feed gives: 5 🍪, or what's left when fewer; 0 at a balance of 0 or below. */
export function feedAmount(balance: number): number {
  return Math.max(0, Math.min(FEED_SIZE, balance))
}
