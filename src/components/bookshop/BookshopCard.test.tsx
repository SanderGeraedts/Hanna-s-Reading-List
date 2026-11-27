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
    expect(screen.getAllByText(/Babel/).length).toBeGreaterThan(0)
  })

  it('shows the newest customer note and the book of the week (T-0123); what she saves for is in the shop', () => {
    show()
    expect(document.querySelector('.bookshop-note')!.textContent).toMatch(/^📌 “.+” — [A-Z][a-z]+$/)
    expect(screen.getByText('Book of the week:')).toBeTruthy()
    expect(screen.queryByText(/A sign over the door costs/)).toBeNull()
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

  it('offers the things coins buy, each with what it does', () => {
    open()
    expect(screen.getByText('A sign over the door')).toBeTruthy()
    expect(screen.getByText('A shop cat')).toBeTruthy()
    expect(screen.getAllByText('+2 customers a day').length).toBeGreaterThan(0)
    expect(screen.getAllByText('+1 coin a copy').length).toBeGreaterThan(0)
    expect(screen.getByText('+3 customers a day, +1 coin a copy')).toBeTruthy()
  })

  it('saves a purchase in the choice log as a place with its own key, never as a buy', () => {
    const { record } = open()
    const sign = screen.getByRole('button', { name: '30 coins' })
    expect((sign as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(sign)
    expect(record).toHaveBeenCalledWith({ kind: 'place', key: 's:up:sign', item: 'sign', price: 30 })
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

describe('the second edition of the shop (T-0123, D-0091)', () => {
  const open = (log: ChoiceEvent[] = [], record = vi.fn()) => {
    const r = render(<BookshopCard books={BOOKS} log={log} record={record} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open Bookshop' }))
    return { ...r, record }
  }

  it('offers all sixteen things, the new ones after the tea counter', () => {
    open()
    for (const name of ['A tea counter', 'Fairy lights', 'A rolling ladder', "A children's corner", 'A record player', 'A window seat', 'A fireplace', 'A shop dog', 'A bookbinding table'])
      expect(screen.getByText(name)).toBeTruthy()
  })

  it('picks a book for the window as a place event in the choice log, never a buy', () => {
    const { record } = open()
    fireEvent.click(screen.getByRole('button', { name: 'Pick Babel for the window' }))
    const e = record.mock.calls[0][0]
    expect(e).toMatchObject({ kind: 'place', item: 'on', book: 'babel', since: '2026-12-01' })
    expect(e.key).toMatch(/^s:pick:/)
  })

  it('shows a picked book in the window with Take out, which saves it as off', () => {
    const on = { id: 'p1', at: new Date(2026, 10, 30).getTime(), kind: 'place', key: '', item: 'on', book: 'babel', since: '2026-11-30' }
    // the key is the book's hash: take it from a real pick
    const first = open()
    fireEvent.click(screen.getByRole('button', { name: 'Pick Babel for the window' }))
    on.key = first.record.mock.calls[0][0].key
    cleanup()
    const { record } = open([on as unknown as ChoiceEvent])
    expect(screen.queryByRole('button', { name: 'Pick Babel for the window' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Take Babel out of the window' }))
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ item: 'off', book: 'babel', since: '2026-11-30', until: '2026-12-01' }))
  })

  it('names her best sellers and keeps every customer note on the board', () => {
    open()
    expect(screen.getByRole('heading', { name: 'Best sellers' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Notes from customers' })).toBeTruthy()
    expect(document.querySelectorAll('.shop-board .shop-magnet').length).toBeGreaterThan(0)
  })

  it('a tap on the top shelf shows its titles big enough to tap, and how many copies are left', () => {
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Look at the top shelf' }))
    fireEvent.click(screen.getByRole('button', { name: 'Babel' }))
    expect(screen.getByText(/^Babel: \d+ cop(y|ies) left\.$/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to the shop' }))
    expect(screen.queryByRole('button', { name: 'Back to the shop' })).toBeNull()
  })
})
