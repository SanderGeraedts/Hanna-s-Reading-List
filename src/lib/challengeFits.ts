import type { Book } from './library'
import { localDay } from './library'
import { readNextChoices } from './readNext'
import { seriesGroups } from './series'
import { sleepReadIds } from './sleepSeries'
import { notOutYet } from './upcoming'
import { placesOf } from './places'
import { MAP_COUNTRY_SET } from './mapCountries'
import { worldCountries } from './worldChallenge'
import { matchesSeason, seasonChallenge } from './seasonChallenge'
import { SEASON_LABEL } from './garden/seasons'
import { fits } from './ownChallenges'
import type { OwnChallenge } from './ownChallenges'

/**
 * Books from her own pile that would fit a challenge (T-0066, from Hanna).
 *
 * The A–Z challenge has offered this since #152 (`alphabetYear().tips`) and the
 * bingo card since T-0017 (a square suggests a book when she opens it); the
 * world, the seasons and her own challenges offered nothing, which is what she
 * noticed. The rule for **which** books may be offered is the A–Z one, lifted
 * out here so every challenge agrees: a book she is reading or has paused
 * first, then one she wants, and a wanted book only when she could really
 * start it next (a series in order, D-0025). Never a sleep read, never a book
 * that isn't out yet, and never one she has already finished.
 *
 * Only her own shelf is looked at — nothing is fetched — so a challenge card
 * can never sit waiting on the internet.
 */

export interface Fit {
  book: Book
  /** why it fits, in her words: "Set in Peru", "Cosy for winter" */
  why: string
}

/** At most this many suggestions under one challenge: a hint, not a second shelf. */
export const FIT_MAX = 3

const RANK = { reading: 0, paused: 1, want: 2, read: 3, dnf: 4 } as const

/** The books she could pick up next, best first — the same pile the A–Z tips use. */
export function pileOf(books: Book[], today = localDay()): Book[] {
  const sleep = sleepReadIds(books)
  const startable = new Set(readNextChoices(books, today).map((b) => b.id))
  return books
    .filter((b) => b.status !== 'read' && !sleep.has(b.id) && !notOutYet(b, today))
    .filter((b) => b.status !== 'want' || startable.has(b.id))
    .sort((a, b) => RANK[a.status] - RANK[b.status] || a.title.localeCompare(b.title))
}

/**
 * Books on her pile set in a country she has not read this year. One country
 * per book and one book per country, so three suggestions are three new
 * countries rather than three books about France.
 */
export function worldFits(books: Book[], year: number, today = localDay(), max = FIT_MAX): Fit[] {
  const had = new Set(worldCountries(books, year).map((c) => c.country))
  const out: Fit[] = []
  for (const book of pileOf(books, today)) {
    if (out.length >= max) break
    if (!book.places) continue
    const fresh = placesOf(book.places, MAP_COUNTRY_SET).countries.find((c) => !had.has(c))
    if (!fresh) continue
    had.add(fresh)
    out.push({ book, why: `Set in ${fresh}` })
  }
  return out
}

/** Books on her pile that would count for a season she has not finished yet. */
export function seasonFits(books: Book[], year: number, today = localDay(), max = FIT_MAX): Fit[] {
  const short = seasonChallenge(books, year, today).filter((s) => !s.complete)
  if (!short.length) return []
  const out: Fit[] = []
  const used = new Set<string>()
  for (const book of pileOf(books, today)) {
    if (out.length >= max) break
    const hit = short.find((s) => !used.has(s.season) && matchesSeason(book, s.season))
    if (!hit) continue
    used.add(hit.season)
    out.push({ book, why: `For ${SEASON_LABEL[hit.season].toLowerCase()}` })
  }
  return out
}

/** Books on her pile that would count for one of her own challenges. */
export function ownFits(books: Book[], challenge: OwnChallenge, today = localDay(), max = FIT_MAX): Fit[] {
  const series = seriesGroups(books)
  const out: Fit[] = []
  for (const book of pileOf(books, today)) {
    if (out.length >= max) break
    if (!fits(challenge, book, series)) continue
    out.push({ book, why: challenge.name })
  }
  return out
}

/** What to say when her pile has nothing, so the suggestions are never simply blank. */
export const worldNone = (toGo: number) =>
  toGo > 0 ? `Nothing on your shelf is set in a new country — ${toGo} more ${toGo === 1 ? 'country' : 'countries'} to go.` : ''

export const seasonNone = (seasons: readonly string[]) =>
  seasons.length ? `Nothing on your shelf fits ${seasons.join(' or ')} yet.` : ''

export const ownNone = (name: string) => `Nothing on your shelf fits ${name} yet.`
