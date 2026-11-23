import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({ searchBooks: async () => [], getWorkDetails: async () => null }))

const { BingoCard } = await import('./DashboardMore')
const { SQUARES, SQUARE_IDS, cardSquares } = await import('#/lib/bingo')

/** Swapping a bingo square (T-0093, D-0063). */

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: [`Writer ${id}`],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

const shelf = [book('thick', { pages: 600 }), book('thin', { pages: 150 })]
const card1 = cardSquares(2026, 1).squares
const labelOf = (id: string) => SQUARES[id].label
const notOnCard = SQUARE_IDS.filter((id) => !card1.includes(id))

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-22T12:00:00'))
})
afterAll(() => vi.useRealTimers())
afterEach(cleanup)

const openSquare = (slot = 0) => {
  const button = screen.getByRole('button', { name: new RegExp(`^${labelOf(card1[slot]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},`) })
  fireEvent.click(button)
  return button
}

describe('when Swap is offered', () => {
  it('is on every open square of an untouched card', () => {
    render(<BingoCard books={shelf} onUpdate={() => {}} onShowBook={() => {}} onSwap={() => {}} />)
    for (const slot of [0, 5, 15]) {
      openSquare(slot)
      expect(screen.getByRole('button', { name: 'Swap this square' })).toBeTruthy()
    }
  })

  it('is nowhere once one square is ticked', () => {
    const read = [book('thick', { pages: 600, status: 'read', readCount: 1, finished: ['2026-01-05'] })]
    render(<BingoCard books={read} onUpdate={() => {}} onShowBook={() => {}} onSwap={() => {}} />)
    const open = screen.getAllByRole('button', { name: /, suggest a book$/ })
    expect(open.length).toBeGreaterThan(0)
    for (const b of open) {
      fireEvent.click(b)
      expect(screen.queryByRole('button', { name: 'Swap this square' })).toBeNull()
      fireEvent.click(b)
    }
  })

  it('is nowhere on a past year', () => {
    render(<BingoCard books={shelf} onUpdate={() => {}} onShowBook={() => {}} onSwap={() => {}} year={2025} />)
    const open = screen.queryAllByRole('button', { name: /, (suggest a book|swap this square)$/ })
    expect(open).toHaveLength(0)
  })

  it('is nowhere when the card is only shown (the dashboard passes no onSwap)', () => {
    render(<BingoCard books={shelf} onUpdate={() => {}} onShowBook={() => {}} compact />)
    openSquare(0)
    expect(screen.queryByRole('button', { name: 'Swap this square' })).toBeNull()
  })
})

describe('the picker', () => {
  const open = () => {
    render(<BingoCard books={shelf} onUpdate={() => {}} onShowBook={() => {}} onSwap={() => {}} />)
    const square = openSquare(0)
    fireEvent.click(screen.getByRole('button', { name: 'Swap this square' }))
    return square
  }

  it('lists every square the card has not got, and none it has', () => {
    open()
    const group = screen.getByRole('group', { name: 'Pick another square' })
    const options = within(group).getAllByRole('button').map((b) => b.textContent)
    expect(options).toEqual(notOnCard.map(labelOf))
    for (const id of card1) expect(options).not.toContain(labelOf(id))
    expect(screen.getByText('Pick another square')).toBeTruthy()
  })

  it('swaps on a pick, closes, and puts the focus back on the square', () => {
    const onSwap = vi.fn()
    render(<BingoCard books={shelf} onUpdate={() => {}} onShowBook={() => {}} onSwap={onSwap} />)
    const square = openSquare(3)
    fireEvent.click(screen.getByRole('button', { name: 'Swap this square' }))
    const group = screen.getByRole('group', { name: 'Pick another square' })
    fireEvent.click(within(group).getByRole('button', { name: labelOf(notOnCard[0]) }))
    expect(onSwap).toHaveBeenCalledWith(3, notOnCard[0])
    expect(screen.queryByRole('group', { name: 'Pick another square' })).toBeNull()
    expect(document.activeElement).toBe(square)
  })

  it('closes on Cancel and on Escape, back to the square', () => {
    const square = open()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('group', { name: 'Pick another square' })).toBeNull()
    // the suggestion panel is still open, with Swap back
    expect(screen.getByRole('button', { name: 'Swap this square' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Swap this square' }))
    fireEvent.keyDown(screen.getByRole('group', { name: 'Pick another square' }), { key: 'Escape' })
    expect(screen.queryByRole('group', { name: 'Pick another square' })).toBeNull()
    expect(document.activeElement).toBe(square)
  })

  it('keeps the suggestion alongside, with Swap last in tab order', () => {
    render(<BingoCard books={shelf} onUpdate={() => {}} onShowBook={() => {}} onSwap={() => {}} />)
    // a square that suggests a book: the thick book fits "Over 500 pages"
    const slot = card1.indexOf('long')
    expect(slot).toBeGreaterThanOrEqual(0)
    openSquare(slot)
    const panel = document.querySelector('.bingo-suggest') as HTMLElement
    const actions = within(panel).getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)
    expect(actions.some((a) => a?.includes('Open'))).toBe(true)
    expect(actions.indexOf('Swap this square')).toBeGreaterThan(actions.findIndex((a) => a?.includes('Open')))
    expect(actions.at(-1)).toBe('Close')
  })
})
