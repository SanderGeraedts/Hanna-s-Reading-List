import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import { cleanLayout, MERGED_INTO, type BlockId } from '#/lib/dashboardLayout'
import { cleanFavourites, unstarIds } from '#/lib/favourites'

vi.mock('#/server/shelf', () => ({
  loadShelf: async () => null,
  saveShelf: async () => ({ updated: 't' }),
  loadGoals: async () => ({}),
  saveGoal: async () => ({}),
  loadChallenges: async () => [],
  saveChallenges: async () => [],
}))
vi.mock('#/server/openLibrary', () => ({
  searchBooks: async () => [],
  getWorkDetails: async () => null,
  browseBooks: async () => [],
  lookupIsbn: async () => null,
  getPublishDate: async () => null,
  getCoverChoices: async () => [],
}))
vi.mock('#/server/favourites', () => ({ loadFavourites: async () => ({ kept: false }), saveFavourites: async () => ({ kept: false }) }))

const { StatsPage } = await import('./StatsPage')

/**
 * Trying to break the Stats page and the layout migration (T-0080): an empty
 * shelf, finishes with no date, nonsense in a saved layout, and switching the
 * pickers about.
 */

const book = (b: Partial<Book> & { id: string }): Book =>
  ({ title: b.id, authors: [], status: 'read', color: '#000', addedAt: 0, readCount: 1, ...b }) as Book

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-23T12:00:00'))
})
afterAll(() => vi.useRealTimers())
afterEach(cleanup)

const show = (books: Book[]) => render(<StatsPage books={books} accountId={null} onShowBook={() => {}} />)
const year = () => document.querySelectorAll<HTMLSelectElement>('.stats-field select')[0]
const compare = () => document.querySelectorAll<HTMLSelectElement>('.stats-field select')[1]
const numbers = () => document.querySelector<HTMLElement>('.stats-numbers')!

describe('the Stats page under pressure', () => {
  it('opens on a shelf with no books at all', () => {
    show([])
    expect([...year().options].map((o) => o.value)).toEqual(['2026', 'all'])
    expect(numbers().textContent).toContain('Nothing finished in 2026 yet.')
    expect(compare().disabled).toBe(true)
    fireEvent.change(year(), { target: { value: 'all' } })
    expect(numbers().textContent).toContain('Nothing finished yet.')
  })

  it('copes with books finished before she noted dates', () => {
    show([book({ id: 'a', title: 'A', pages: 200 }), book({ id: 'b', title: 'B', pages: 100, readCount: 2 })])
    // no dates: nothing lands in a year, everything in All time
    expect(numbers().textContent).toContain('Nothing finished in 2026 yet.')
    fireEvent.change(year(), { target: { value: 'all' } })
    expect(numbers().textContent).toContain('2books')
    expect(numbers().textContent).toContain('400pages')
  })

  it('survives the pickers being thrown about', () => {
    show([
      book({ id: 'a', title: 'A', pages: 100, finished: ['2026-01-01'] }),
      book({ id: 'b', title: 'B', pages: 100, finished: ['2025-01-01'] }),
      book({ id: 'c', title: 'C', pages: 100, finished: ['2024-01-01'] }),
    ])
    for (const [y, c] of [
      ['2024', '2026'],
      ['all', ''],
      ['2026', '2025'],
      ['2025', '2025'],
      ['all', ''],
      ['2026', ''],
    ] as const) {
      fireEvent.change(year(), { target: { value: y } })
      if (!compare().disabled) fireEvent.change(compare(), { target: { value: c } })
      expect(document.querySelector('.stats-numbers')).toBeTruthy()
    }
    expect(numbers().textContent).toContain('1book')
  })

  it('a year with one reading day reads "reading day", not "reading days"', () => {
    show([book({ id: 'a', title: 'A', pages: 100, finished: ['2026-01-01'], readingLog: { '2026-01-01': 1 } })])
    expect(numbers().textContent).toContain('1reading day')
    expect(numbers().textContent).not.toContain('1reading days')
  })
})

describe('a layout and a star saved before the blocks moved', () => {
  it('nonsense and repeats in a saved layout still load', () => {
    const l = cleanLayout({
      sections: { stats: [['count', 'count', 'goal', 42, null, 'nonsense'], ['records']] },
      hidden: ['heatmap', 'heatmap'],
      favourites: ['goal', 'goal', 'flower', 7],
    })
    // My year itself left the dashboard for the Stats page (T-0121): the old ids load as nothing
    const all = [...l.sections.stats.flat(), ...l.hidden]
    expect(all).not.toContain('myyear')
    expect(l.favourites).toEqual([])
  })

  it('an unstar clears the old ids too, so a star on the account cannot come back', () => {
    expect(unstarIds(['myyear'])).toEqual([
      'myyear',
      ...(Object.keys(MERGED_INTO) as BlockId[]),
    ])
    expect(unstarIds(['bingo'])).toEqual(['bingo'])
    // and the account's own list still reads as the block it became
    expect(cleanFavourites(['goal', 'count', 'bingo'])).toEqual(['myyear', 'bingo'])
  })
})
