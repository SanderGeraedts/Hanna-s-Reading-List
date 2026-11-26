import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({
  searchBooks: async () => [],
  getWorkDetails: async () => null,
  browseBooks: async () => [],
  lookupIsbn: async () => null,
  getPublishDate: async () => null,
  getCoverChoices: async () => [],
}))

const { CalendarPage } = await import('./CalendarPage')
const { factForDay } = await import('#/lib/facts')

/** The fact a reading day gave her, in the calendar's day panel (D-0079). */

const book = (readingLog: Record<string, number>): Book => ({
  id: 'b1',
  title: 'Kerst op een Eiland',
  authors: ['A. Writer'],
  color: '#7a4f3a',
  status: 'reading',
  addedAt: 0,
  pages: 320,
  readingLog,
})

const LOG = { '2026-11-20': 0.2, '2026-11-22': 0.3, '2026-11-24': 0.1 }
const shelf = [book(LOG)]

const show = () => render(<CalendarPage books={shelf} onShowBook={() => {}} onUpdate={() => {}} startMonth="2026-11" />)
const tap = (day: number) => {
  const cell = screen.getAllByRole('button').find((b) => (b.getAttribute('aria-label') ?? '').startsWith(`${day} November`))
  if (!cell) throw new Error(`no day ${day} on the calendar`)
  fireEvent.click(cell)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 26, 10, 0))
})
afterEach(() => {
  vi.useRealTimers()
  cleanup()
})

describe('the fact on a calendar day', () => {
  it('shows the fact that reading day gave her', () => {
    show()
    tap(22)
    const fact = factForDay(shelf, '2026-11-22')!
    expect(fact).toBeTruthy()
    expect(screen.getByText('Your fact that day:')).toBeTruthy()
    expect(screen.getByText(fact, { exact: false })).toBeTruthy()
  })

  it('gives each reading day its own fact, and the newest day today’s', () => {
    show()
    tap(20)
    const first = factForDay(shelf, '2026-11-20')!
    expect(screen.getByText(first, { exact: false })).toBeTruthy()
    tap(24)
    const last = factForDay(shelf, '2026-11-24')!
    expect(last).not.toBe(first)
    expect(screen.getByText(last, { exact: false })).toBeTruthy()
    expect(screen.queryByText(first, { exact: false })).toBeNull()
  })

  it('says nothing on a day she did not read', () => {
    show()
    tap(21)
    expect(screen.queryByText('Your fact that day:')).toBeNull()
  })
})
