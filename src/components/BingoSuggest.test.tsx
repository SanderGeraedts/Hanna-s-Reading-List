import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({ searchBooks: async () => [], getWorkDetails: async () => null }))

const { BingoCard } = await import('./DashboardMore')
const { cardSquares } = await import('#/lib/bingo')

/**
 * The tester's check of the bingo suggestion card's keyboard and screen-reader
 * part (T-0017 *Done when*), on the accessibility tree happy-dom builds.
 */

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: [`Writer ${id}`],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

const shelf = [book('thick1', { pages: 600 }), book('thick2', { pages: 650 }), book('one', { pages: 150 })]

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-22T12:00:00'))
})
afterAll(() => vi.useRealTimers())
afterEach(cleanup)

describe('bingo suggestion card: keyboard and screen reader (tester, T-0017)', () => {
  it('empty squares of this year are buttons; "3 books in one month" is not', () => {
    render(<BingoCard books={shelf} onUpdate={() => {}} onShowBook={() => {}} />)
    const squares = screen.getAllByRole('button', { name: /, suggest a book$/ })
    // card 1: 16 squares, all empty; "3 books in one month" (and "5 books in one month" when drawn) aren't buttons
    const noReaction = cardSquares(2026, 1).squares.filter((id) => id === 'three' || id === 'fivemonth').length
    expect(noReaction).toBeGreaterThanOrEqual(1)
    expect(squares).toHaveLength(16 - noReaction)
    expect(screen.queryByRole('button', { name: '3 books in one month, suggest a book' })).toBeNull()
    expect(screen.getByRole('img', { name: /^3 books in one month/ })).toBeTruthy()
    for (const s of squares) {
      expect(s.getAttribute('aria-expanded')).toBe('false')
      expect(s.getAttribute('type')).toBe('button')
    }
  })

  it('opens under the grid, focus on its heading; Open, Another one, ×; Escape back to the square', () => {
    const onShowBook = vi.fn()
    const onUpdate = vi.fn()
    render(<BingoCard books={shelf} onUpdate={onUpdate} onShowBook={onShowBook} />)
    const square = screen.getByRole('button', { name: 'Over 500 pages, suggest a book' })
    fireEvent.click(square)
    expect(square.getAttribute('aria-expanded')).toBe('true')
    const card = screen.getByRole('region', { name: 'Over 500 pages' })
    expect(square.getAttribute('aria-controls')).toBe(card.id)
    expect(document.activeElement).toBe(within(card).getByRole('heading', { name: 'Over 500 pages' }))
    // tab order inside the card: Open, Another one, ×
    const buttons = within(card).getAllByRole('button')
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      expect.stringMatching(/^Open Book thick[12]$/),
      'Another book for Over 500 pages',
      'Close',
    ])
    // Another one shows the other 500+ page book
    const first = buttons[0].getAttribute('aria-label')
    fireEvent.click(buttons[1])
    expect(within(card).getAllByRole('button')[0].getAttribute('aria-label')).not.toBe(first)
    // Open opens the book panel on that book
    fireEvent.click(within(card).getAllByRole('button')[0])
    expect(onShowBook).toHaveBeenCalledWith(expect.stringMatching(/^thick[12]$/))
    // Escape closes, focus back on the square
    fireEvent.keyDown(card, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Over 500 pages' })).toBeNull()
    expect(document.activeElement).toBe(square)
    expect(square.getAttribute('aria-expanded')).toBe('false')
    // nothing about her books is saved by looking at suggestions
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('× closes and returns focus; tapping the chosen square again closes; another square switches', () => {
    render(<BingoCard books={shelf} onUpdate={() => {}} onShowBook={() => {}} />)
    const long = screen.getByRole('button', { name: 'Over 500 pages, suggest a book' })
    const short = screen.getByRole('button', { name: 'Under 200 pages, suggest a book' })
    fireEvent.click(long)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('region', { name: 'Over 500 pages' })).toBeNull()
    expect(document.activeElement).toBe(long)
    fireEvent.click(long)
    fireEvent.click(short)
    expect(long.getAttribute('aria-expanded')).toBe('false')
    expect(short.getAttribute('aria-expanded')).toBe('true')
    const card = screen.getByRole('region', { name: 'Under 200 pages' })
    // one fitting book: no Another one
    expect(within(card).queryByRole('button', { name: /^Another book/ })).toBeNull()
    expect(within(card).getByRole('button', { name: 'Open Book one' })).toBeTruthy()
    // a real tap or Enter focuses the square first; fireEvent.click doesn't
    short.focus()
    fireEvent.click(short)
    expect(screen.queryByRole('region', { name: 'Under 200 pages' })).toBeNull()
    expect(document.activeElement).toBe(short)
  })

  it('nothing fitting: only the heading, × and the no-fit line', () => {
    render(<BingoCard books={shelf} onUpdate={() => {}} onShowBook={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'A book in Dutch, suggest a book' }))
    const card = screen.getByRole('region', { name: 'A book in Dutch' })
    expect(within(card).getByText('No book on your shelf fits this one yet.')).toBeTruthy()
    expect(within(card).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Close'])
  })

  it("another year's card has no suggestion buttons", () => {
    render(<BingoCard books={shelf} onUpdate={() => {}} onShowBook={() => {}} year={2025} />)
    expect(screen.queryAllByRole('button', { name: /, suggest a book$/ })).toHaveLength(0)
  })
})
