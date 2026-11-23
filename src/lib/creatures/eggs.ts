import type { Book } from '../library'
import { bingoYear } from '../bingo'
import { seriesProgress } from '../insights'
import { challengeFor, itemFor } from '../monthChallenge'
import { challengeBooks } from '../ownChallenges'
import type { OwnChallenge } from '../ownChallenges'
import { sleepReadIds } from '../sleepSeries'
import { allFinishes } from '../stats'
import type { ReadingDay } from './cookies'
import { addDays } from './days'
import { mixedHash, seededHash } from './hash'
import {
  BINGO_TIER,
  BOOKS_LEGENDARY,
  BOOKS_RARE,
  BOOKS_STEP,
  CHALLENGE_TIER,
  CREATURES_START,
  HOURS_RARE,
  HOURS_STEP,
  SERIES_TIER,
  STREAK_EGGS,
  WELCOME_EGG,
} from './numbers'
import { SPECIES } from './species'
import type { SpeciesId, Tier } from './species'

/**
 * Milestone eggs (D-0033 §6, T-0030 Goal 1): worked out from her books from
 * the start day, never stored. Every egg has a stable id, and its tier
 * follows from that id alone, so a hatch stays the same even when a fix to a
 * past day takes the milestone away again (a pet is never lost).
 */

/** `shop`: bought in the shop (T-0031), id `shop:<purchase id>`, its tier from the purchase */
export type EggKind = 'welcome' | 'books' | 'hours' | 'streak' | 'series' | 'challenge' | 'month' | 'bingo' | 'shop'

export interface Egg {
  id: string
  tier: Tier
  kind: EggKind
  /** the day it was earned (yyyy-mm-dd) */
  day: string
  /** the milestone's number: books, hours or streak days */
  n?: number
  /** a series' or challenge's name, or the challenge month ("2026-11") */
  label?: string
}

/** Order on one day: books, hours, streak, series, challenge, month, bingo. */
const KIND_ORDER: Record<EggKind, number> = { welcome: 0, books: 1, hours: 2, streak: 3, series: 4, challenge: 5, month: 6, bingo: 7, shop: 8 }

const booksTier = (n: number): Tier => (n % BOOKS_LEGENDARY === 0 ? 'legendary' : n % BOOKS_RARE === 0 ? 'rare' : 'common')
const hoursTier = (n: number): Tier => (n % HOURS_RARE === 0 ? 'rare' : 'common')

/** The tier of an egg from its id alone, or null for an id this version doesn't know. */
export function eggTier(id: string): Tier | null {
  if (id === WELCOME_EGG) return 'common'
  let m = /^m:books-(\d+)$/.exec(id)
  if (m) return Number(m[1]) % BOOKS_STEP === 0 && Number(m[1]) > 0 ? booksTier(Number(m[1])) : null
  m = /^m:hours-(\d+)$/.exec(id)
  if (m) return Number(m[1]) % HOURS_STEP === 0 && Number(m[1]) > 0 ? hoursTier(Number(m[1])) : null
  m = /^m:streak-(\d+)$/.exec(id)
  if (m) return STREAK_EGGS.find(([n]) => n === Number(m![1]))?.[1] ?? null
  if (/^m:series-[a-z0-9]+$/.test(id)) return SERIES_TIER
  if (/^m:challenge-[A-Za-z0-9_-]+$/.test(id)) return CHALLENGE_TIER
  if (/^m:bingo-\d{4}-\d+$/.test(id)) return BINGO_TIER
  return null
}

/** The species a milestone egg hatches: a seeded hash of its id over its tier's species (D-0033 §7). */
export function eggSpecies(id: string, tier: Tier): SpeciesId {
  const list = SPECIES.filter((s) => s.tier === tier)
  return list[mixedHash(`species:${id}`) % list.length].id
}

const minutesOf = (d: ReadingDay) => d.minutes + d.sleepMinutes
/** Reading days (with minutes in them) up to today, sorted. */
const minuteDays = (days: Map<string, ReadingDay>, today: string) =>
  [...days.values()].filter((d) => d.day <= today && minutesOf(d) > 0).sort((a, b) => (a.day < b.day ? -1 : 1))

/** Finish days from the start up to today, sorted (a re-read counts again). */
function finishDays(books: Book[], today: string): string[] {
  return allFinishes(books)
    .map((f) => f.day)
    .filter((d): d is string => !!d && d >= CREATURES_START && d <= today)
    .sort()
}

/** Every milestone egg earned up to today (the welcome egg aside), in the order they were earned. */
export function earnedEggs(
  books: Book[],
  days: Map<string, ReadingDay>,
  today: string,
  challenges: readonly OwnChallenge[] = [],
): Egg[] {
  const out: Egg[] = []
  const inRange = (d: string | undefined): d is string => !!d && d >= CREATURES_START && d <= today

  // every 5th finished book
  const finishes = finishDays(books, today)
  for (let n = BOOKS_STEP; n <= finishes.length; n += BOOKS_STEP)
    out.push({ id: `m:books-${n}`, tier: booksTier(n), kind: 'books', day: finishes[n - 1], n })

  // every 10 hours read or listened (sleep reads count their real minutes)
  let total = 0
  let nextHours = HOURS_STEP
  const reading = minuteDays(days, today)
  for (const d of reading) {
    total += minutesOf(d)
    while (total + 1e-6 >= nextHours * 60) {
      out.push({ id: `m:hours-${nextHours}`, tier: hoursTier(nextHours), kind: 'hours', day: d.day, n: nextHours })
      nextHours += HOURS_STEP
    }
  }

  // streaks of 7, 30 and 100 days in a row, each once
  let run = 0
  let prev: string | null = null
  const hit = new Set<number>()
  for (const d of reading) {
    run = prev !== null && addDays(prev, 1) === d.day ? run + 1 : 1
    prev = d.day
    for (const [n, tier] of STREAK_EGGS)
      if (run === n && !hit.has(n)) {
        hit.add(n)
        out.push({ id: `m:streak-${n}`, tier, kind: 'streak', day: d.day, n })
      }
  }

  // a finished series: every book read, the last first finish on or after the start
  for (const s of seriesProgress(books)) {
    if (s.total < 2 || s.read < s.total) continue
    const firsts = s.books.map((b) => [...(b.finished ?? [])].sort()[0])
    if (firsts.some((d) => !d)) continue
    const day = firsts.sort().at(-1)
    if (inRange(day))
      out.push({ id: `m:series-${seededHash(s.name.toLowerCase().trim()).toString(36)}`, tier: SERIES_TIER, kind: 'series', day, label: s.name })
  }

  // her own challenges: the day the target-th book was finished
  for (const c of challenges) {
    const counted = challengeBooks(c, books)
    if (counted.length < c.target) continue
    const firsts = counted
      .map((b) => (b.finished ?? []).filter((d) => d.startsWith(`${c.year}-`)).sort()[0])
      .filter((d): d is string => !!d)
      .sort()
    const day = firsts[c.target - 1]
    if (inRange(day)) out.push({ id: `m:challenge-${c.id}`, tier: CHALLENGE_TIER, kind: 'challenge', day, label: c.name })
  }

  // the monthly challenge (one egg per month done) and full bingo cards, per year from the start
  const sleep = sleepReadIds(books)
  for (let y = Number(CREATURES_START.slice(0, 4)); y <= Number(today.slice(0, 4)); y++) {
    for (const [month, book] of challengeFor(books, y)) {
      const item = itemFor(month, book, sleep)
      if (inRange(item.doneOn)) out.push({ id: `m:challenge-month-${month}`, tier: CHALLENGE_TIER, kind: 'month', day: item.doneOn, label: month })
    }
    for (const card of bingoYear(books, y, today).finished) {
      const day = card.endsAt.slice(0, 10)
      if (inRange(day)) out.push({ id: `m:bingo-${y}-${card.card}`, tier: BINGO_TIER, kind: 'bingo', day, n: card.card })
    }
  }

  return out.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.n ?? 0) - (b.n ?? 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

// ---- the next egg (Design §2) -------------------------------------------------------------

export interface NextEgg {
  kind: 'books' | 'hours' | 'streak'
  /** books, minutes or days still to go */
  left: number
  tier: Tier
}

/** The current streak counted from the start day: alive while she read today or yesterday. */
export function streakNow(days: Map<string, ReadingDay>, today: string): number {
  const has = (d: string) => {
    const x = days.get(d)
    return !!x && minutesOf(x) > 0
  }
  let day = has(today) ? today : addDays(today, -1)
  let n = 0
  while (day >= CREATURES_START && has(day)) {
    n++
    day = addDays(day, -1)
  }
  return n
}

/**
 * Of books, hours and streak, the one furthest along in its current step
 * (done ÷ needed; a tie goes to books, then hours, then streak). Series,
 * challenges and bingo stay a surprise.
 */
export function nextEgg(books: Book[], days: Map<string, ReadingDay>, today: string, earned: readonly Egg[]): NextEgg | null {
  const options: Array<NextEgg & { progress: number }> = []
  const finished = finishDays(books, today).length
  const nextBooks = (Math.floor(finished / BOOKS_STEP) + 1) * BOOKS_STEP
  options.push({ kind: 'books', left: nextBooks - finished, tier: booksTier(nextBooks), progress: (finished % BOOKS_STEP) / BOOKS_STEP })

  const minutes = minuteDays(days, today).reduce((n, d) => n + minutesOf(d), 0)
  const nextHours = (Math.floor((minutes + 1e-6) / (HOURS_STEP * 60)) + 1) * HOURS_STEP
  const leftMinutes = Math.max(1, Math.ceil(nextHours * 60 - minutes - 1e-6))
  options.push({ kind: 'hours', left: leftMinutes, tier: hoursTier(nextHours), progress: 1 - leftMinutes / (HOURS_STEP * 60) })

  const streak = streakNow(days, today)
  const had = new Set(earned.filter((e) => e.kind === 'streak').map((e) => e.n))
  const target = STREAK_EGGS.find(([n]) => n > streak && !had.has(n))
  if (streak > 0 && target) options.push({ kind: 'streak', left: target[0] - streak, tier: target[1], progress: streak / target[0] })

  let best = options[0]
  for (const o of options) if (o.progress > best.progress + 1e-9) best = o
  const { progress: _, ...rest } = best
  return rest
}
