import type { Book } from './library'
import { seriesFromTitle, seriesGroups } from './series'
import { authorKey } from './sleepSeries'

/**
 * Guessing a new book's series from rules alone (T-0060, AD1). **No AI**
 * (D-0017) and no second book API (D-0018): everything here is read from the
 * title she already has and from the series already standing on her shelf.
 *
 * Three rules, best first:
 *
 * 1. **The title says so.** "Dune Messiah (Dune Chronicles, #2)",
 *    "Percy Jackson, Teil 4: …" — `seriesFromTitle` reads the name and the
 *    number out of the title itself. The strongest signal there is, because it
 *    comes with a position.
 * 2. **The title starts with (or contains) a series she already has.** A new
 *    "Percy Jackson and the Titan's Curse" next to her *Percy Jackson* shelf
 *    group. A number anywhere in the title is taken along as the position.
 * 3. **Her author already has a series.** The weakest of the three: it says
 *    the book *might* belong, which is exactly what the dashboard's
 *    "Is this part of …?" has always asked (`seriesQuestions`).
 *
 * The same series is never offered twice, however many rules find it, and at
 * most three are offered. No candidates at all is a normal answer: the step
 * then shows only the text field.
 */

export interface SeriesGuess {
  name: string
  /** position in the series, when a number in the title gave one */
  index?: number
  /** which rule found it, for the tests and for ordering */
  from: 'title' | 'shelf' | 'author'
}

/** How many guesses the step offers as chips. */
export const MAX_GUESSES = 3

/** Filler that is left dangling when "Harry Potter and the …" loses its ellipsis. */
const TRAILING_FILLER = /\s+(and|the|of|vs\.?|versus|und|der|die|das|en|de|het|a|an)$/i

/**
 * A name she can confirm with one tap. `detectSeries` names a shared title
 * opening "Harry Potter and the …"; as a series name that reads wrong, so the
 * ellipsis and whatever filler it leaves behind come off.
 */
function tidyName(name: string): string {
  let out = name.replace(/\s*…\s*$/, '').trim()
  while (TRAILING_FILLER.test(out)) out = out.replace(TRAILING_FILLER, '')
  return out.trim()
}

/** A series name made comparable: no capitals, no punctuation, single spaces. */
const nameKey = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/** The first standalone number in a title, 1–99, for "… 4" and "Book 4" shapes. */
function numberInTitle(title: string): number | undefined {
  const m = title.match(/(?:^|[^\p{L}\p{N}])(\d{1,2})(?:[^\p{L}\p{N}]|$)/u)
  const n = m ? Number(m[1]) : NaN
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** The series standing on her shelf: every group with at least two books (seriesGroups' rule). */
export function shelfSeries(shelf: Book[]): Array<{ name: string; authors: Set<string> }> {
  const groups = seriesGroups(shelf)
  const out = new Map<string, { name: string; authors: Set<string> }>()
  for (const b of shelf) {
    const g = groups.get(b.id)
    if (!g?.key) continue
    const found = out.get(g.key) ?? { name: g.name, authors: new Set<string>() }
    for (const a of b.authors) {
      const k = authorKey(a)
      if (k) found.authors.add(k)
    }
    out.set(g.key, found)
  }
  return [...out.values()]
}

/**
 * The series this new book might be part of, best first. `book` is the book as
 * it is about to be (or has just been) added; `shelf` is her shelf **without**
 * the wishlist (D-0044).
 */
export function seriesGuesses(
  book: Pick<Book, 'title' | 'authors'> & { series?: string },
  shelf: Book[],
): SeriesGuess[] {
  if (book.series?.trim()) return []
  const out: SeriesGuess[] = []
  const seen = new Set<string>()
  const add = (guess: SeriesGuess) => {
    const name = tidyName(guess.name)
    const key = nameKey(name)
    if (!key || key.length < 2 || seen.has(key)) return
    seen.add(key)
    out.push({ ...guess, name })
  }

  // 1. the title says so
  const fromTitle = seriesFromTitle(book.title)
  if (fromTitle) add({ name: fromTitle.name, index: fromTitle.index, from: 'title' })

  const series = shelfSeries(shelf)
  const title = nameKey(book.title)
  const mine = new Set(book.authors.map(authorKey).filter(Boolean))

  // 2. the title carries a series she already has
  for (const s of series) {
    const key = nameKey(s.name)
    if (!key || key.length < 3) continue
    if (title === key || title.startsWith(`${key} `) || title.includes(` ${key} `) || title.endsWith(` ${key}`)) {
      add({ name: s.name, index: numberInTitle(book.title), from: 'shelf' })
    }
  }

  // 3. her author already has a series
  for (const s of series) {
    if ([...mine].some((a) => s.authors.has(a))) add({ name: s.name, from: 'author' })
  }

  return out.slice(0, MAX_GUESSES)
}

/** What confirming a guess saves on the book; `seriesAsked` so nothing asks again. */
export const guessPatch = (guess: SeriesGuess): Partial<Book> => ({
  series: guess.name,
  ...(guess.index !== undefined && { seriesIndex: guess.index }),
  seriesAsked: true,
})

/** What a name she typed herself saves; an empty name is "not in a series". */
export function typedSeriesPatch(name: string): Partial<Book> {
  const series = name.trim()
  return series ? { series, seriesAsked: true } : { seriesAsked: true }
}
