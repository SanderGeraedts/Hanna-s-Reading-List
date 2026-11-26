import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'
import type { ChoiceEvent } from '#/lib/creatures/choices'
import { deriveShop } from '#/lib/creatures/shop'
import { BookshopCard } from './BookshopCard'

/**
 * The bookshop block and the shop behind "Open ›" (T-0113, D-0084 §8). The
 * block is handed her books, the choice log and a way to save a choice, and
 * works out the rest itself — so it is rendered here on its own, exactly as
 * the dashboard will render it.
 */

const book = (b: Partial<Book> & { id: string }): Book =>
  ({ title: b.id, authors: [], status: 'read', color: '#884422', addedAt: 0, ...b }) as Book

const BOOKS: Book[] = [
  // finished on opening day with a long week's reading behind it: a well-stocked shop
  book({ id: 'babel', title: 'Babel', pages: 400, finished: ['2026-11-26'], readingLog: { '2026-11-26': 1 } }),
  book({ id: 'circe', title: 'Circe', finished: ['2021-02-02'] }),
]

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 11, 1, 12, 0, 0))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => localStorage.clear())
afterEach(cleanup)

const show = (log: ChoiceEvent[] = [], record = vi.fn()) => {
  const r = render(<BookshopCard books={BOOKS} log={log} record={record} />)
  return { ...r, record }
}

describe('the block on the dashboard', () => {
  it('shows the shop, what sold while she was away and what is in the till', () => {
    show()
    expect(screen.getByRole('heading', { name: 'Bookshop' })).toBeTruthy()
    expect(screen.getByText(/sold while you were away|Nobody came in/)).toBeTruthy()
    expect(screen.getByText(/🪙 \d+ coins?/)).toBeTruthy()
    expect(screen.getByText(/copies on the shelves/)).toBeTruthy()
  })

  it('names the book that sold, by name', () => {
    show()
    expect(screen.getByText(/Babel/)).toBeTruthy()
  })

  it('says what she is saving up for', () => {
    show()
    expect(screen.getByText(/A sign over the door costs 40 coins|You can afford/)).toBeTruthy()
  })

  it('has nothing to collect: the only way in is Open ›', () => {
    show()
    const buttons = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)
    expect(buttons).toEqual(['Open Bookshop'])
  })
})

describe('the shop behind Open ›', () => {
  const open = (log: ChoiceEvent[] = [], record = vi.fn()) => {
    const r = show(log, record)
    fireEvent.click(screen.getByRole('button', { name: 'Open Bookshop' }))
    return r
  }

  it('opens over the dashboard, not as a new tab', () => {
    open()
    expect(screen.getByRole('heading', { name: 'Your bookshop' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'On the shelves' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'While you were away' })).toBeTruthy()
  })

  it('lists what is on the shelves, by name and by the copy', () => {
    open()
    expect(screen.getAllByText(/× Babel/).length).toBeGreaterThan(0)
  })

  it('offers the eight things coins buy, each with what it does', () => {
    open()
    expect(screen.getByText('A sign over the door')).toBeTruthy()
    expect(screen.getByText('A shop cat')).toBeTruthy()
    expect(screen.getAllByText('+2 customers a day').length).toBeGreaterThan(0)
    expect(screen.getAllByText('+1 coin a copy').length).toBeGreaterThan(0)
    expect(screen.getByText('+3 customers a day, +1 coin a copy')).toBeTruthy()
  })

  it('saves a purchase in the choice log as a place with its own key, never as a buy', () => {
    const { record } = open()
    const sign = screen.getByRole('button', { name: '40 coins' })
    expect((sign as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(sign)
    expect(record).toHaveBeenCalledWith({ kind: 'place', key: 's:up:sign', item: 'sign', price: 40 })
    // the creature shop sees nothing of it: no cookie is spent (D-0084 §5)
    const saved = [{ id: 'e1', at: Date.now(), ...record.mock.calls[0][0] }] as unknown as ChoiceEvent[]
    expect(deriveShop(saved).spent).toBe(0)
  })

  it('will not let her buy what she cannot afford', () => {
    open()
    const cat = screen.getByRole('button', { name: '600 coins' })
    expect((cat as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows a thing she has already bought as bought, with no second Buy', () => {
    open([{ id: 'e0', at: new Date(2026, 10, 27).getTime(), kind: 'place', key: 's:up:sign', item: 'sign', price: 40 } as unknown as ChoiceEvent])
    expect(screen.getByText('✓ in the shop')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '40 coins' })).toBeNull()
  })
})
