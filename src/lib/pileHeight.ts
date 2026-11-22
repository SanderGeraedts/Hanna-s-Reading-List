import type { Book } from './library'
import { listenOnly } from './listening'
import { bookDims } from './shelfLayout'

/**
 * How tall her want-to-read pile would stand, stacked up (T-0021, D-0029): the
 * shelf thickness of every want-to-read book, without the books she only
 * listens to (no paper to stack).
 */
export interface PileHeight {
  /** the height in metres (1 shelf unit ≈ 1 metre) */
  metres: number
  /** want-to-read books that count towards the height */
  counted: number
  /** want-to-read books left out because she only listens to them */
  listenOnly: number
}

export function pileHeight(books: Book[]): PileHeight {
  const out: PileHeight = { metres: 0, counted: 0, listenOnly: 0 }
  for (const book of books) {
    if (book.status !== 'want') continue
    if (listenOnly(book)) {
      out.listenOnly += 1
      continue
    }
    out.metres += bookDims(book).t
    out.counted += 1
  }
  return out
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

/** "Stacked up, your pile would be 1.62 m: about as tall as an adult (1.75 m)." */
export function pileHeightLine(metres: number, space = ' '): string {
  return `Stacked up, your pile would be ${heightText(metres, space)}: ${comparisonText(compareHeight(metres), space)}.`
}

export const ALL_AUDIOBOOKS_LINE = 'Your pile is all audiobooks, so it takes up no room at all.'
