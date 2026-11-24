import type { Book } from './library'
import { formatsOf } from './library'
import { languageName } from './languages'
import { allFinishes } from './stats'
import { foldTrope, hasTrope, tropeCounts } from './tropes'
import { NO_GENRE, filterByGenre, genreOptions } from './genreFilter'

/**
 * The five bookcases and the filter row above the shelf (D-0046, D-0074).
 *
 * One pure module owns which books the shelf shows: the bookcase switch
 * (All · Read · To read · Digital · Wishlist), the six filters (genre, a minimum rating, a
 * minimum spice, the year read, the language and a trope), which options each
 * filter offers for a shelf, and the line that says what is on. Nothing here is
 * saved: the page holds the state and a reload starts fresh.
 */

export type BookcaseId = 'all' | 'read' | 'want' | 'digital' | 'wish'

export const BOOKCASES: Array<{ id: BookcaseId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'read', label: 'Read' },
  { id: 'want', label: 'To read' },
  { id: 'digital', label: 'Digital' },
  { id: 'wish', label: 'Wishlist' },
]

/** The formats that make a book digital: an e-book or an audiobook, however she has it. */
const DIGITAL_FORMATS = ['ebook', 'audiobook', 'storytel'] as const

/**
 * Is this book in that bookcase? A book can be in two (Digital and one of the others).
 *
 * This is also the **only** gate between her wishlist and her shelf (D-0074 §2): a wish is
 * in the Wishlist bookcase and in no other, and nothing she owns is ever in Wishlist. So
 * even a page that hands the whole library to the shelf cannot put a wish among her books.
 */
export function inBookcase(book: Book, bookcase: BookcaseId): boolean {
  if (bookcase === 'wish') return !!book.wish
  if (book.wish) return false
  switch (bookcase) {
    case 'all':
      return true
    case 'read':
      return book.status === 'read'
    case 'want':
      return book.status === 'want'
    case 'digital': {
      const formats = formatsOf(book)
      return DIGITAL_FORMATS.some((f) => formats.includes(f))
    }
  }
}

/** The filter value for books with no language set. */
export const NO_LANGUAGE = '\u0000none'

export interface ShelfFilters {
  /** a genre, `NO_GENRE` for books without one, or null for all */
  genre: string | null
  /** a minimum: only books rated this or higher */
  rating: number | null
  /** a minimum: only books with this much spice or more (a book set to No spice never passes) */
  spice: number | null
  /** only books with a finish day in this year */
  year: number | null
  /** a language code, `NO_LANGUAGE`, or null for all */
  language: string | null
  /** a trope, compared folded (D-0042) */
  trope: string | null
}

export const NO_FILTERS: ShelfFilters = {
  genre: null,
  rating: null,
  spice: null,
  year: null,
  language: null,
  trope: null,
}

export interface ShelfView {
  bookcase: BookcaseId
  filters: ShelfFilters
}

export const START_VIEW: ShelfView = { bookcase: 'all', filters: NO_FILTERS }

/** The minimums the Rating filter offers, lowest first. */
export const RATING_STEPS = [3, 3.5, 4, 4.5, 5]
/** The minimums the Spice filter offers, lowest first. */
export const SPICE_STEPS = [1, 2, 3, 4, 5]

/** The years a book was finished in (from its finish days), each once. */
export function yearsFinished(book: Book): number[] {
  const years = new Set<number>()
  for (const day of book.finished ?? []) if (day) years.add(Number(day.slice(0, 4)))
  return [...years]
}

/** One filter's choices in the row. */
export interface FilterOption {
  value: string
  label: string
}

export interface FilterOptions {
  genre: FilterOption[]
  rating: FilterOption[]
  spice: FilterOption[]
  year: FilterOption[]
  language: FilterOption[]
  trope: FilterOption[]
}

const stars = (n: number) => (Number.isInteger(n) ? `★${n}` : `★${Math.floor(n)}½`)

/**
 * What each filter offers for this shelf. A filter the **whole shelf** has
 * nothing for comes back empty and is not shown; the options never depend on
 * the chosen bookcase, so picking one never makes a chosen filter vanish.
 */
export function filterOptions(books: Book[]): FilterOptions {
  // a shelf where no book has a genre offers only "No genre", which narrows nothing: no filter
  const allGenres = genreOptions(books)
  const genres = allGenres.some((g) => g.value !== NO_GENRE) ? allGenres : []
  const genre = genres.length ? [{ value: '', label: 'All genres' }, ...genres.map((g) => ({ value: g.value, label: `${g.label} (${g.count})` }))] : []

  const anyRating = books.some((b) => typeof b.rating === 'number' && b.rating > 0)
  const rating = anyRating
    ? [{ value: '', label: 'Any rating' }, ...RATING_STEPS.map((n) => ({ value: String(n), label: n === 5 ? stars(5) : `${stars(n)} and up` }))]
    : []

  const anySpice = books.some((b) => typeof b.spice === 'number' && b.spice > 0)
  const spice = anySpice
    ? [{ value: '', label: 'Any spice' }, ...SPICE_STEPS.map((n) => ({ value: String(n), label: n === 5 ? '🌶5' : `🌶${n} and up` }))]
    : []

  const yearCounts = new Map<number, number>()
  for (const f of allFinishes(books)) {
    if (!f.day) continue
    const y = Number(f.day.slice(0, 4))
    yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1)
  }
  const year = yearCounts.size
    ? [
        { value: '', label: 'Any year' },
        ...[...yearCounts.keys()].sort((a, b) => b - a).map((y) => ({ value: String(y), label: `${y} (${yearCounts.get(y)})` })),
      ]
    : []

  const langCounts = new Map<string, number>()
  let noLang = 0
  for (const b of books) {
    if (b.language) langCounts.set(b.language, (langCounts.get(b.language) ?? 0) + 1)
    else noLang++
  }
  const language = langCounts.size
    ? [
        { value: '', label: 'Any language' },
        ...[...langCounts]
          .sort(([a, ca], [b, cb]) => cb - ca || languageName(a).localeCompare(languageName(b)))
          .map(([code, count]) => ({ value: code, label: `${languageName(code)} (${count})` })),
        ...(noLang ? [{ value: NO_LANGUAGE, label: `No language (${noLang})` }] : []),
      ]
    : []

  const tropes = tropeCounts(books)
  const trope = tropes.length ? [{ value: '', label: 'Any trope' }, ...tropes.map((t) => ({ value: t.name, label: `${t.name} (${t.count})` }))] : []

  return { genre, rating, spice, year, language, trope }
}

/** A filter whose value the shelf no longer offers counts as "any" (D-0046 §9). */
export function cleanFilters(filters: ShelfFilters, options: FilterOptions): ShelfFilters {
  const keep = <T extends string | number>(value: T | null, list: FilterOption[]): T | null =>
    value !== null && list.some((o) => o.value !== '' && o.value === String(value)) ? value : null
  return {
    genre: keep(filters.genre, options.genre),
    rating: keep(filters.rating, options.rating),
    spice: keep(filters.spice, options.spice),
    year: keep(filters.year, options.year),
    language: keep(filters.language, options.language),
    trope: keep(filters.trope, options.trope),
  }
}

/** Does this book pass every filter that is set? A minimum never passes a book with no value. */
export function passesFilters(book: Book, filters: ShelfFilters): boolean {
  if (filters.genre) {
    if (filters.genre === NO_GENRE) {
      if (book.genres?.length) return false
    } else if (!book.genres?.includes(filters.genre)) return false
  }
  if (filters.rating !== null && !(typeof book.rating === 'number' && book.rating >= filters.rating)) return false
  if (filters.spice !== null && !(typeof book.spice === 'number' && book.spice >= filters.spice)) return false
  if (filters.year !== null && !yearsFinished(book).includes(filters.year)) return false
  if (filters.language) {
    if (filters.language === NO_LANGUAGE) {
      if (book.language) return false
    } else if (book.language !== filters.language) return false
  }
  if (filters.trope && !hasTrope(book, filters.trope)) return false
  return true
}

/**
 * The books the shelf shows, in shelf order. It may be given the whole library:
 * `inBookcase` is what keeps the wishes out of the other four bookcases (D-0074 §2),
 * so the short cut below only holds while there is no wish to keep out.
 */
export function applyView(books: Book[], view: ShelfView): Book[] {
  if (view.bookcase === 'all' && !isFiltered(view.filters) && !books.some((b) => b.wish)) return books
  return books.filter((b) => inBookcase(b, view.bookcase) && passesFilters(b, view.filters))
}

/** Is at least one filter set? (The bookcase is not a filter: Clear leaves it alone.) */
export const isFiltered = (filters: ShelfFilters): boolean => Object.values(filters).some((v) => v !== null)

/** Clears the filters and keeps the bookcase (D-0046 §5). */
export const clearFilters = (view: ShelfView): ShelfView => ({ bookcase: view.bookcase, filters: NO_FILTERS })

/**
 * What is on, for the count line: the bookcase (left out when it is All), then
 * each set filter's chosen option, in the row's order. Empty when nothing is on.
 */
export function viewSummary(view: ShelfView, options: FilterOptions): string[] {
  const out: string[] = []
  if (view.bookcase !== 'all') out.push(BOOKCASES.find((b) => b.id === view.bookcase)!.label)
  const pick = (value: string | number | null, list: FilterOption[]) => {
    if (value === null) return
    const found = list.find((o) => o.value === String(value))
    if (found) out.push(found.label.replace(/ \(\d+\)$/, ''))
  }
  pick(view.filters.genre, options.genre)
  pick(view.filters.rating, options.rating)
  pick(view.filters.spice, options.spice)
  pick(view.filters.year, options.year)
  pick(view.filters.language, options.language)
  // a trope is stored in its shelf spelling, which is the option's own value
  if (view.filters.trope) {
    const want = foldTrope(view.filters.trope)
    const found = options.trope.find((o) => o.value && foldTrope(o.value) === want)
    out.push((found?.label ?? view.filters.trope).replace(/ \(\d+\)$/, ''))
  }
  return out
}

// re-exported so everything that narrows the shelf comes from one module
export { NO_GENRE, filterByGenre }
