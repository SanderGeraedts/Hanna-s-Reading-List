import type { Book } from './library'
import { PHYSICAL_FORMATS, formatsOf } from './library'
import { AUDIO_FORMATS, formatDuration, listenOnly } from './listening'

/*
 * How tall her want-to-read pile would stand, stacked up, measured like real
 * printed books (T-0023, D-0030). The 3D shelf keeps its own thickness
 * (`bookDims`); this formula is only for the pile.
 */

/** D-0030: a sheet of paperback paper, per page. */
export const PAGE_MM = 0.07
/** D-0030: a paperback's cover. */
export const PAPERBACK_COVER_MM = 1
/** D-0030: a hardcover's two boards and binding. */
export const HARDCOVER_BOARDS_MM = 5
/** D-0030: 30 pages an hour of listening, so 2 minutes a page. */
export const MINUTES_PER_PAGE = 2
/** D-0030: a book with no length at all counts as this many pages. */
export const DEFAULT_PAGES = 280

export type Binding = 'paperback' | 'hardcover'
/** The kinds under the switch: 📖 Paper, 📱 E-book, 🎧 Audiobook. */
export type PileKind = 'paper' | 'ebook' | 'audio'
export const PILE_KINDS: PileKind[] = ['paper', 'ebook', 'audio']

const positive = (n: number | undefined) => (n && n > 0 ? n : undefined)

/**
 * The book's page count for the pile: for a book she only listens to,
 * minutes ÷ 2 first (its `pages` is usually a copy of its minutes, D-0008);
 * for every other book its pages first; otherwise 280.
 */
export function pilePages(book: Book): number {
  const pages = positive(book.pages)
  const fromMinutes = positive(book.minutes) === undefined ? undefined : book.minutes! / MINUTES_PER_PAGE
  return (listenOnly(book) ? (fromMinutes ?? pages) : (pages ?? fromMinutes)) ?? DEFAULT_PAGES
}

/** Hardcover when Hardcover is among its formats, otherwise paperback. */
export function bindingOf(book: Book): Binding {
  return formatsOf(book).includes('hardcover') ? 'hardcover' : 'paperback'
}

/** One book's thickness in metres, as a real printed book (no minimum or maximum). */
export function bookThickness(book: Book, binding: Binding = bindingOf(book)): number {
  const mm = PAGE_MM * pilePages(book) + (binding === 'hardcover' ? HARDCOVER_BOARDS_MM : PAPERBACK_COVER_MM)
  return mm / 1000
}

/** Every kind the book counts in (a book counts in each kind it has; Other / no format in none). */
export function bookKinds(book: Book): PileKind[] {
  const formats = formatsOf(book)
  const kinds: PileKind[] = []
  if (formats.some((f) => PHYSICAL_FORMATS.includes(f))) kinds.push('paper')
  if (formats.includes('ebook')) kinds.push('ebook')
  if (formats.some((f) => AUDIO_FORMATS.includes(f))) kinds.push('audio')
  return kinds
}

/** A book's listening minutes for the 🎧 Audiobook total: minutes, else pages × 2, else 560. */
export function audioMinutes(book: Book): number {
  return positive(book.minutes) ?? (positive(book.pages) ?? DEFAULT_PAGES) * MINUTES_PER_PAGE
}

export interface Pile {
  /** every want-to-read book once, in metres */
  all: number
  /** 📖 the paper books, in metres */
  paper: number
  /** 📱 the e-books (as paperbacks), in metres */
  ebook: number
  /** 🎧 total listening minutes of the audiobooks */
  audioMinutes: number
  /** how many want-to-read books count in All and in each kind */
  counts: { all: number; paper: number; ebook: number; audio: number }
}

export function pileHeights(books: Book[]): Pile {
  const out: Pile = { all: 0, paper: 0, ebook: 0, audioMinutes: 0, counts: { all: 0, paper: 0, ebook: 0, audio: 0 } }
  for (const book of books) {
    if (book.status !== 'want') continue
    const t = bookThickness(book)
    out.all += t
    out.counts.all += 1
    for (const kind of bookKinds(book)) {
      out.counts[kind] += 1
      if (kind === 'paper') out.paper += t
      else if (kind === 'ebook') out.ebook += bookThickness(book, 'paperback')
      else out.audioMinutes += audioMinutes(book)
    }
  }
  return out
}

/** The kinds that have want-to-read books, in switch order. The switch shows when there are two or more. */
export function pileKinds(pile: Pile): PileKind[] {
  return PILE_KINDS.filter((k) => pile.counts[k] > 0)
}

export interface HeightParts {
  /** the number as shown, with a decimal point: "1.62", "48" */
  number: string
  unit: 'cm' | 'm'
}

const num = (n: number, decimals: number) => n.toLocaleString('en-GB', { maximumFractionDigits: decimals })
const round = (n: number, decimals: number) => Math.round(n * 10 ** decimals) / 10 ** decimals

/** Whole cm under 1 m, two decimals up to 10 m, one up to 100 m, whole metres beyond; worked out on the rounded value. */
export function heightParts(metres: number): HeightParts {
  const cm = Math.round(metres * 100)
  if (cm < 100) return { number: num(Math.max(1, cm), 0), unit: 'cm' }
  const two = round(metres, 2)
  if (two < 10) return { number: num(two, 2), unit: 'm' }
  const one = round(metres, 1)
  if (one < 100) return { number: num(one, 1), unit: 'm' }
  return { number: num(Math.round(metres), 0), unit: 'm' }
}

/** "1.62 m"; pass a non-breaking space as `space` for the screen. */
export function heightText(metres: number, space = ' '): string {
  const { number, unit } = heightParts(metres)
  return `${number}${space}${unit}`
}

/** What a screen reader hears: "1.62 metres", "1 centimetre". */
export function heightSpoken(metres: number): string {
  const { number, unit } = heightParts(metres)
  const word = unit === 'cm' ? 'centimetre' : 'metre'
  return `${number} ${number === '1' ? word : `${word}s`}`
}

export interface HeightThing {
  name: string
  metres: number
}

/** Everyday things to compare the pile with, in order of height. */
export const HEIGHT_THINGS: HeightThing[] = [
  { name: 'a mug', metres: 0.1 },
  { name: 'a cat', metres: 0.25 },
  { name: 'a kitchen counter', metres: 0.9 },
  { name: 'a door handle', metres: 1.05 },
  { name: 'an adult', metres: 1.75 },
  { name: 'a door', metres: 2 },
  { name: 'a double-decker bus', metres: 4.4 },
  { name: 'a giraffe', metres: 5 },
  { name: 'a house', metres: 8 },
  { name: 'an oak tree', metres: 20 },
  { name: 'the Leaning Tower of Pisa', metres: 56 },
  { name: 'Big Ben', metres: 96 },
  { name: 'the Eiffel Tower', metres: 330 },
]

export type Comparison =
  | { kind: 'about'; thing: HeightThing }
  | { kind: 'taller'; thing: HeightThing }
  | { kind: 'shorter'; thing: HeightThing }

/**
 * "About as tall as" the closest thing within 10% (closest by ratio, on the
 * unrounded height), otherwise "taller than" the tallest thing it beats, or
 * "not as tall as a mug yet".
 */
export function compareHeight(metres: number): Comparison {
  let about: HeightThing | undefined
  let best = Infinity
  for (const thing of HEIGHT_THINGS) {
    const ratio = metres / thing.metres
    if (ratio < 0.9 || ratio > 1.1) continue
    // distance by ratio, the same either way: 0.9× is as far as 1/0.9×
    const distance = Math.abs(Math.log(ratio))
    if (distance < best) {
      best = distance
      about = thing
    }
  }
  if (about) return { kind: 'about', thing: about }
  const beaten = HEIGHT_THINGS.filter((t) => metres > t.metres)
  if (beaten.length) return { kind: 'taller', thing: beaten[beaten.length - 1] }
  return { kind: 'shorter', thing: HEIGHT_THINGS[0] }
}

/** The words before and after the thing's height: "about as tall as an adult (" … ")". */
export function comparisonWords(c: Comparison): { before: string; after: string } {
  if (c.kind === 'about') return { before: `about as tall as ${c.thing.name} (`, after: ')' }
  if (c.kind === 'taller') return { before: `taller than ${c.thing.name} (`, after: ')' }
  return { before: `not as tall as ${c.thing.name} (`, after: ') yet' }
}

/** "about as tall as an adult (1.75 m)" */
export function comparisonText(c: Comparison, space = ' '): string {
  const { before, after } = comparisonWords(c)
  return `${before}${heightText(c.thing.metres, space)}${after}`
}

/** The words before the height: "Stacked up, your pile would be", "Your paper books would stand". */
export function heightLead(kind: 'all' | 'paper' | 'ebook', count: number): string {
  if (kind === 'all') return 'Stacked up, your pile would be'
  if (kind === 'paper') return count === 1 ? 'Your paper book would stand' : 'Your paper books would stand'
  return count === 1 ? 'Your e-book would stand' : 'Your e-books would stand'
}

/** "Stacked up, your pile would be 1.62 m: about as tall as an adult (1.75 m)." */
export function pileHeightLine(metres: number, space = ' '): string {
  return kindHeightLine('all', metres, 2, space)
}

/** "Your paper books would stand 7 cm: not as tall as a mug (10 cm) yet." */
export function kindHeightLine(kind: 'all' | 'paper' | 'ebook', metres: number, count: number, space = ' '): string {
  return `${heightLead(kind, count)} ${heightText(metres, space)}: ${comparisonText(compareHeight(metres), space)}.`
}

// ---- 🎧 listening time (T-0023, D-0030) --------------------------------------------------------

/** "86 h 20 min" (formatDuration); pass a non-breaking space as `space` for the screen. */
export function timeText(minutes: number, space = ' '): string {
  return formatDuration(minutes).replace(/ /g, space)
}

/** What a screen reader hears: "86 hours 20 minutes", "1 hour", "45 minutes" (as formatDuration rounds). */
export function timeSpoken(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  const unit = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`
  if (!h) return unit(m, 'minute')
  return m ? `${unit(h, 'hour')} ${unit(m, 'minute')}` : unit(h, 'hour')
}

export interface DurationThing {
  name: string
  minutes: number
}

/** Everyday durations to compare the audiobooks with, in order of length. */
export const DURATION_THINGS: DurationThing[] = [
  { name: 'a football match', minutes: 90 },
  { name: 'the film Titanic', minutes: 194 },
  { name: 'a working day', minutes: 8 * 60 },
  { name: 'the nonstop flight from Perth to London', minutes: 17 * 60 + 20 },
  { name: 'all eight Harry Potter films back to back', minutes: 1179 },
  { name: 'a whole day and night', minutes: 24 * 60 },
  { name: 'a work week', minutes: 40 * 60 },
]

/** From 48 hours on, "listening nonstop for N days". */
const NONSTOP_FROM_MINUTES = 48 * 60

export type DurationComparison =
  | { kind: 'about'; thing: DurationThing }
  | { kind: 'days'; days: number }
  | { kind: 'longer'; thing: DurationThing }
  | { kind: 'shorter'; thing: DurationThing }

/**
 * "About as long as" the closest thing within 10% (by ratio, unrounded), else
 * nonstop days from 48 h, else "longer than" the longest thing it beats, else
 * "not as long as a football match yet".
 */
export function compareDuration(minutes: number): DurationComparison {
  let about: DurationThing | undefined
  let best = Infinity
  for (const thing of DURATION_THINGS) {
    const ratio = minutes / thing.minutes
    if (ratio < 0.9 || ratio > 1.1) continue
    const distance = Math.abs(Math.log(ratio))
    if (distance < best) {
      best = distance
      about = thing
    }
  }
  if (about) return { kind: 'about', thing: about }
  if (minutes >= NONSTOP_FROM_MINUTES) return { kind: 'days', days: Math.round((minutes / (24 * 60)) * 2) / 2 }
  const beaten = DURATION_THINGS.filter((t) => minutes > t.minutes)
  if (beaten.length) return { kind: 'longer', thing: beaten[beaten.length - 1] }
  return { kind: 'shorter', thing: DURATION_THINGS[0] }
}

/** "3½", "2", "10½" */
export function daysText(days: number): string {
  const whole = Math.floor(days)
  return days === whole ? String(whole) : `${whole}½`
}

/** "3 and a half days", "2 days" */
export function daysSpoken(days: number): string {
  const whole = Math.floor(days)
  return days === whole ? `${whole} days` : `${whole} and a half days`
}

/** The words around the thing's duration: "about as long as a working day (" … ")". */
export function durationWords(c: Exclude<DurationComparison, { kind: 'days' }>): { before: string; after: string } {
  if (c.kind === 'about') return { before: `about as long as ${c.thing.name} (`, after: ')' }
  if (c.kind === 'longer') return { before: `longer than ${c.thing.name} (`, after: ')' }
  return { before: `not as long as ${c.thing.name} (`, after: ') yet' }
}

/** "about as long as listening nonstop for 3½ days", "longer than a working day (8 h)" */
export function durationComparisonText(c: DurationComparison, space = ' '): string {
  if (c.kind === 'days') return `about as long as listening nonstop for ${daysText(c.days)}${space}days`
  const { before, after } = durationWords(c)
  return `${before}${timeText(c.thing.minutes, space)}${after}`
}

/** "Your audiobooks are" / "Your audiobook is" */
export function audioLead(count: number): string {
  return count === 1 ? 'Your audiobook is' : 'Your audiobooks are'
}

/** "Your audiobooks are 86 h 20 min: about as long as listening nonstop for 3½ days." */
export function audioLine(minutes: number, count: number, space = ' '): string {
  return `${audioLead(count)} ${timeText(minutes, space)}: ${durationComparisonText(compareDuration(minutes), space)}.`
}
