import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import {
  BOOKCASES,
  NO_LANGUAGE,
  START_VIEW,
  applyView,
  clearFilters,
  cleanFilters,
  filterOptions,
  inBookcase,
  isFiltered,
  passesFilters,
  viewSummary,
  yearsFinished,
} from './shelfFilter'
import { NO_GENRE } from './genreFilter'

const book = (over: Partial<Book> = {}): Book => ({
  id: over.id ?? 'b',
  title: 'A Book',
  authors: ['A. Author'],
  color: '#334455',
  status: 'want',
  addedAt: 1,
  ...over,
})

const filters = (over: Partial<(typeof START_VIEW)['filters']> = {}) => ({ ...START_VIEW.filters, ...over })

describe('the bookcases (D-0046 §2, D-0074)', () => {
  it('is All, Read, To read, Digital, Wishlist, in that order, with her words', () => {
    expect(BOOKCASES.map((b) => b.id)).toEqual(['all', 'read', 'want', 'digital', 'wish'])
    expect(BOOKCASES.map((b) => b.label)).toEqual(['All', 'Read', 'To read', 'Digital', 'Wishlist'])
  })

  it('puts a finished book in All and Read, and a want-to-read book in All and To read', () => {
    const read = book({ status: 'read' })
    expect(inBookcase(read, 'all')).toBe(true)
    expect(inBookcase(read, 'read')).toBe(true)
    expect(inBookcase(read, 'want')).toBe(false)
    const want = book({ status: 'want' })
    expect(inBookcase(want, 'want')).toBe(true)
    expect(inBookcase(want, 'read')).toBe(false)
  })

  it('leaves reading, paused and did-not-finish books to All alone', () => {
    for (const status of ['reading', 'paused', 'dnf'] as const) {
      const b = book({ status })
      expect(inBookcase(b, 'all')).toBe(true)
      expect(inBookcase(b, 'read')).toBe(false)
      expect(inBookcase(b, 'want')).toBe(false)
      expect(inBookcase(b, 'digital')).toBe(false)
    }
  })

  it('counts an e-book, an audiobook and Storytel as Digital, whatever the status', () => {
    for (const f of ['ebook', 'audiobook', 'storytel'] as const)
      for (const status of ['read', 'want', 'reading', 'dnf'] as const) expect(inBookcase(book({ formats: [f], status }), 'digital')).toBe(true)
  })

  it('does not count paper, and reads the old single format field too', () => {
    expect(inBookcase(book({ formats: ['paperback'] }), 'digital')).toBe(false)
    expect(inBookcase(book({ formats: ['hardcover'] }), 'digital')).toBe(false)
    expect(inBookcase(book(), 'digital')).toBe(false)
    expect(inBookcase(book({ format: 'ebook' }), 'digital')).toBe(true)
    expect(inBookcase(book({ format: 'paperback' }), 'digital')).toBe(false)
  })

  it('puts a digital finished book in two bookcases', () => {
    const b = book({ status: 'read', formats: ['storytel'] })
    expect(inBookcase(b, 'read')).toBe(true)
    expect(inBookcase(b, 'digital')).toBe(true)
  })
})

describe('the minimums', () => {
  it('passes a rating of exactly the minimum and above, and never a book without one', () => {
    expect(passesFilters(book({ rating: 3.5 }), filters({ rating: 3.5 }))).toBe(true)
    expect(passesFilters(book({ rating: 4 }), filters({ rating: 3.5 }))).toBe(true)
    expect(passesFilters(book({ rating: 3 }), filters({ rating: 3.5 }))).toBe(false)
    expect(passesFilters(book(), filters({ rating: 3.5 }))).toBe(false)
    expect(passesFilters(book({ rating: 0 }), filters({ rating: 3 }))).toBe(false)
  })

  it('passes spice from the minimum up, and never No spice or a book without spice', () => {
    expect(passesFilters(book({ spice: 1 }), filters({ spice: 1 }))).toBe(true)
    expect(passesFilters(book({ spice: 5 }), filters({ spice: 1 }))).toBe(true)
    expect(passesFilters(book({ spice: 0 }), filters({ spice: 1 }))).toBe(false)
    expect(passesFilters(book(), filters({ spice: 1 }))).toBe(false)
  })
})

describe('year read, language, genre and trope', () => {
  it('reads the years out of the finish days', () => {
    expect(yearsFinished(book({ finished: ['2026-01-02'] }))).toEqual([2026])
    expect(yearsFinished(book({ finished: ['2025-12-31', '2026-01-02'] }))).toEqual([2025, 2026])
    expect(yearsFinished(book())).toEqual([])
  })

  it('passes a year only when the book was finished in it', () => {
    const b = book({ status: 'read', finished: ['2026-01-02'] })
    expect(passesFilters(b, filters({ year: 2026 }))).toBe(true)
    expect(passesFilters(b, filters({ year: 2025 }))).toBe(false)
    expect(passesFilters(book({ status: 'read' }), filters({ year: 2026 }))).toBe(false)
    const twice = book({ status: 'read', finished: ['2025-03-01', '2026-03-01'] })
    expect(passesFilters(twice, filters({ year: 2025 }))).toBe(true)
    expect(passesFilters(twice, filters({ year: 2026 }))).toBe(true)
  })

  it('matches a language, and No language only a book without one', () => {
    expect(passesFilters(book({ language: 'en' }), filters({ language: 'en' }))).toBe(true)
    expect(passesFilters(book({ language: 'nl' }), filters({ language: 'en' }))).toBe(false)
    expect(passesFilters(book(), filters({ language: NO_LANGUAGE }))).toBe(true)
    expect(passesFilters(book({ language: 'en' }), filters({ language: NO_LANGUAGE }))).toBe(false)
  })

  it('matches a genre, and No genre only a book without one', () => {
    expect(passesFilters(book({ genres: ['Fantasy'] }), filters({ genre: 'Fantasy' }))).toBe(true)
    expect(passesFilters(book({ genres: ['Romance'] }), filters({ genre: 'Fantasy' }))).toBe(false)
    expect(passesFilters(book({ genres: [] }), filters({ genre: NO_GENRE }))).toBe(true)
    expect(passesFilters(book(), filters({ genre: NO_GENRE }))).toBe(true)
  })

  it('matches a trope however it is spelled (D-0042 §3)', () => {
    const b = book({ tropes: ['Enemies to Lovers'] })
    expect(passesFilters(b, filters({ trope: 'enemies to lovers' }))).toBe(true)
    expect(passesFilters(b, filters({ trope: 'ENEMIES  TO LOVERS' }))).toBe(true)
    expect(passesFilters(b, filters({ trope: 'Found family' }))).toBe(false)
  })

  it('treats a book with no tropes and one with an empty list the same', () => {
    expect(passesFilters(book(), filters({ trope: 'Slow burn' }))).toBe(false)
    expect(passesFilters(book({ tropes: [] }), filters({ trope: 'Slow burn' }))).toBe(false)
  })
})

describe('the options the row offers', () => {
  const shelf = [
    book({ id: '1', status: 'read', rating: 4, spice: 3, language: 'en', genres: ['Fantasy'], finished: ['2026-02-01'], tropes: ['Slow burn'] }),
    book({ id: '2', status: 'want', language: 'nl', genres: ['Fantasy'] }),
    book({ id: '3', status: 'read', rating: 5, language: 'en', finished: ['2025-07-07'], tropes: ['slow burn'] }),
  ]

  it('leaves out a filter the whole shelf has nothing for', () => {
    const plain = filterOptions([book({ id: 'x' })])
    expect(plain.rating).toEqual([])
    expect(plain.spice).toEqual([])
    expect(plain.year).toEqual([])
    expect(plain.language).toEqual([])
    expect(plain.trope).toEqual([])
  })

  it('offers "any" first and each filter her words', () => {
    const o = filterOptions(shelf)
    expect(o.genre[0]).toEqual({ value: '', label: 'All genres' })
    expect(o.rating.map((r) => r.label)).toEqual(['Any rating', '★3 and up', '★3½ and up', '★4 and up', '★4½ and up', '★5'])
    expect(o.spice.map((r) => r.label)).toEqual(['Any spice', '🌶1 and up', '🌶2 and up', '🌶3 and up', '🌶4 and up', '🌶5'])
    expect(o.year.map((y) => y.label)).toEqual(['Any year', '2026 (1)', '2025 (1)'])
    expect(o.language[0].label).toBe('Any language')
    expect(o.language[1]).toEqual({ value: 'en', label: 'English (2)' })
    expect(o.trope[1]).toEqual({ value: 'Slow burn', label: 'Slow burn (2)' })
  })

  it('offers No language when a book has none', () => {
    const o = filterOptions([...shelf, book({ id: '4' })])
    expect(o.language[o.language.length - 1]).toEqual({ value: NO_LANGUAGE, label: 'No language (1)' })
  })

  it('works out the options from the whole shelf, never from the chosen bookcase', () => {
    // every rating on the shelf is on a finished book; the To read bookcase must still offer Rating
    expect(filterOptions(shelf).rating.length).toBe(6)
  })

  it('gives sensible options for an empty shelf and for a shelf of only audiobooks', () => {
    const empty = filterOptions([])
    expect(Object.values(empty).every((list) => list.length === 0)).toBe(true)
    const audio = [book({ id: 'a', formats: ['audiobook'], minutes: 600 }), book({ id: 'b', formats: ['storytel'] })]
    expect(() => filterOptions(audio)).not.toThrow()
    expect(applyView(audio, { bookcase: 'digital', filters: START_VIEW.filters })).toHaveLength(2)
  })
})

describe('combining, clearing and the summary', () => {
  const shelf = [
    book({ id: '1', status: 'read', rating: 5, spice: 4, language: 'en', genres: ['Fantasy'], finished: ['2026-02-01'], tropes: ['Slow burn'], formats: ['storytel'] }),
    book({ id: '2', status: 'read', rating: 3, language: 'en', finished: ['2026-05-05'] }),
    book({ id: '3', status: 'want', language: 'nl' }),
  ]

  it('narrows with every filter at once, in shelf order', () => {
    const view = { bookcase: 'read' as const, filters: filters({ rating: 4, spice: 1, year: 2026, language: 'en', genre: 'Fantasy', trope: 'slow burn' }) }
    expect(applyView(shelf, view).map((b) => b.id)).toEqual(['1'])
  })

  it('combines the bookcase with the filters', () => {
    expect(applyView(shelf, { bookcase: 'digital', filters: START_VIEW.filters }).map((b) => b.id)).toEqual(['1'])
    expect(applyView(shelf, { bookcase: 'read', filters: filters({ rating: 4 }) }).map((b) => b.id)).toEqual(['1'])
    expect(applyView(shelf, { bookcase: 'want', filters: filters({ rating: 4 }) })).toEqual([])
  })

  it('knows when a filter is set, and Clear keeps the bookcase', () => {
    expect(isFiltered(START_VIEW.filters)).toBe(false)
    expect(isFiltered(filters({ year: 2026 }))).toBe(true)
    expect(clearFilters({ bookcase: 'digital', filters: filters({ year: 2026 }) })).toEqual({ bookcase: 'digital', filters: START_VIEW.filters })
  })

  it('lets a filter whose value has left the shelf count as "any"', () => {
    const options = filterOptions(shelf)
    expect(cleanFilters(filters({ genre: 'Horror', year: 1999, trope: 'Time loop' }), options)).toEqual(START_VIEW.filters)
    expect(cleanFilters(filters({ year: 2026 }), options).year).toBe(2026)
  })

  it('says what is on, bookcase first and counts stripped', () => {
    const options = filterOptions(shelf)
    expect(viewSummary(START_VIEW, options)).toEqual([])
    expect(viewSummary({ bookcase: 'read', filters: filters({ rating: 4, trope: 'slow burn' }) }, options)).toEqual(['Read', '★4 and up', 'Slow burn'])
    expect(viewSummary({ bookcase: 'all', filters: filters({ year: 2026 }) }, options)).toEqual(['2026'])
  })
})

/** The Wishlist bookcase (D-0074): the one gate between her wishes and her shelf. */
describe('the Wishlist bookcase', () => {
  const wish = book({ id: 'w', wish: true, status: 'want', formats: ['ebook'] })
  const owned = book({ id: 'o', status: 'read', formats: ['ebook'] })

  it('is the last bookcase on the switch', () => {
    expect(BOOKCASES.map((b) => b.id)).toEqual(['all', 'read', 'want', 'digital', 'wish'])
    expect(BOOKCASES.at(-1)!.label).toBe('Wishlist')
  })

  it('holds her wishes and nothing else', () => {
    expect(inBookcase(wish, 'wish')).toBe(true)
    expect(inBookcase(owned, 'wish')).toBe(false)
  })

  it('keeps a wish out of every other bookcase, whatever its status or format', () => {
    for (const bookcase of ['all', 'read', 'want', 'digital'] as const) {
      expect(inBookcase(wish, bookcase)).toBe(false)
      expect(inBookcase({ ...wish, status: 'read' }, bookcase)).toBe(false)
    }
  })

  it('narrows the whole library down to the right books, All included', () => {
    const library = [owned, wish]
    expect(applyView(library, START_VIEW).map((b) => b.id)).toEqual(['o'])
    expect(applyView(library, { ...START_VIEW, bookcase: 'wish' }).map((b) => b.id)).toEqual(['w'])
    // the short cut for All with nothing set still holds for a library with no wish in it
    const shelfOnly = [owned]
    expect(applyView(shelfOnly, START_VIEW)).toBe(shelfOnly)
  })

  it('still lets the filters narrow the wishlist', () => {
    const cheap = book({ id: 'c', wish: true, genres: ['Fantasy'] })
    const list = [wish, cheap]
    const view = { bookcase: 'wish' as const, filters: filters({ genre: 'Fantasy' }) }
    expect(applyView(list, view).map((b) => b.id)).toEqual(['c'])
  })
})
