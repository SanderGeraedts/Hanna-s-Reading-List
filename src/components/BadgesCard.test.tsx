import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
const { BadgesCard } = await import('./NewBlocks')
const { badges } = await import('#/lib/badges')

const books: Book[] = [
  { id: 'a', title: 'Circe', authors: ['M'], color: '#c99a45', status: 'read', addedAt: 1, finished: ['2026-03-01'], readCount: 1 },
]

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('the Badges block can be folded', () => {
  it('folds the list away, keeps the count, and remembers it on this device', () => {
    render(<BadgesCard books={books} />)
    const fold = screen.getByRole('button', { name: /^Badges/ })
    expect(fold.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById('badges-list')!.hidden).toBe(false)
    fireEvent.click(fold)
    expect(fold.getAttribute('aria-expanded')).toBe('false')
    expect(document.getElementById('badges-list')!.hidden).toBe(true)
    expect(screen.getByText(/unlocked/)).toBeTruthy()
    cleanup()
    render(<BadgesCard books={books} />)
    expect(document.getElementById('badges-list')!.hidden).toBe(true)
  })
})

// T-0042: a demo shelf with an earned secret (Dusty pile, 1 May), Explorer (5 genres, 20 Mar),
// First book (3 Jan), and 5 books locked at 4 of 5; the other 11 secrets are hidden
const read = (id: string, day: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: [`Author ${id}`],
  color: '#888888',
  status: 'read',
  addedAt: 0,
  finished: [day],
  readCount: 1,
  ...extra,
})
const shelf: Book[] = [
  read('a', '2026-01-03', { genres: ['Fantasy', 'Romance'] }),
  read('b', '2026-02-10', { genres: ['Mystery'] }),
  read('c', '2026-03-20', { genres: ['History', 'Horror'] }),
  read('d', '2026-05-01', { addedAt: 1 }),
]
const grid = () => screen.getByRole('list', { name: 'Badges' })
const medals = () => within(grid()).getAllByRole('button')
const medal = (name: string) => within(grid()).getByRole('button', { name })
const card = () => document.getElementById('badges-card')!

describe('the medal grid (T-0042)', () => {
  it('shows one medal per badge, earned newest first, then locked closest first, then hidden', () => {
    render(<BadgesCard books={shelf} />)
    const all = badges(shelf)
    const m = medals()
    expect(m).toHaveLength(all.length)
    expect(screen.getByText(`3 of ${all.length} unlocked (5%)`)).toBeTruthy()
    const names = m.map((b) => b.getAttribute('aria-label'))
    expect(names.slice(0, 4)).toEqual([
      'Dusty pile, gold, unlocked, secret badge',
      'Explorer, bronze, unlocked',
      'First book, bronze, unlocked',
      '5 books, locked, 4 of 5',
    ])
    const hiddenCount = all.filter((b) => b.secret && !b.earned).length
    expect(hiddenCount).toBe(11)
    expect(names.slice(-hiddenCount)).toEqual(Array(hiddenCount).fill('Hidden badge'))
    expect(names.slice(0, -hiddenCount)).not.toContain('Hidden badge')
    // a locked one-off says just "locked"
    expect(medal('Postcard from Oceania, locked')).toBeTruthy()
  })

  it('carries the tier on earned medals only, and never shows a hidden badge’s name or emoji', () => {
    render(<BadgesCard books={shelf} />)
    expect(medal('Dusty pile, gold, unlocked, secret badge').dataset.tier).toBe('gold')
    expect(medal('Explorer, bronze, unlocked').dataset.tier).toBe('bronze')
    const locked = medal('5 books, locked, 4 of 5')
    expect(locked.dataset.state).toBe('locked')
    expect(locked.dataset.tier).toBeUndefined()
    expect(locked.className).not.toMatch(/gold|silver|bronze/)
    const hidden = medals().at(-1)!
    expect(hidden.dataset.state).toBe('hidden')
    expect(hidden.dataset.tier).toBeUndefined()
    expect(hidden.textContent).toBe('?')
    expect(hidden.title).toBe('Hidden badge')
    expect(grid().textContent).not.toContain('🌷')
    expect(document.body.textContent).not.toMatch(/Home sweet home|Loyal fan/)
  })

  it('opens one card under the grid on a tap, switches on another, closes on the same', () => {
    render(<BadgesCard books={shelf} />)
    // the live region is in the page before any card opens
    const live = card().querySelector('[aria-live="polite"]')!
    expect(live).toBeTruthy()
    expect(live.textContent).toBe('')

    const first = medal('First book, bronze, unlocked')
    expect(first.getAttribute('aria-controls')).toBe('badges-card')
    expect(first.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(first)
    expect(first.getAttribute('aria-expanded')).toBe('true')
    expect(within(card()).getByRole('heading', { name: 'First book' })).toBeTruthy()
    expect(live.textContent).toContain('Finish a book')
    expect(live.textContent).toContain('Bronze · Unlocked 3 Jan 2026')
    expect(card().getAttribute('aria-labelledby')).toBe('badges-card-title')

    fireEvent.click(medal('Dusty pile, gold, unlocked, secret badge'))
    expect(live.textContent).toMatch(/Gold · secret · Unlocked 1 May 2026/)

    const five = medal('5 books, locked, 4 of 5')
    fireEvent.click(five)
    expect(first.getAttribute('aria-expanded')).toBe('false')
    expect(five.getAttribute('aria-expanded')).toBe('true')
    expect(live.textContent).toContain('4 / 5')
    expect(within(card()).getAllByRole('heading')).toHaveLength(1)

    fireEvent.click(medal('Postcard from Oceania, locked'))
    expect(live.textContent).toContain('Locked')

    const hidden = medals().at(-1)!
    fireEvent.click(hidden)
    expect(live.textContent).toContain('Hidden badge')
    expect(live.textContent).toContain('No passport needed')
    expect(live.textContent).not.toMatch(/Home sweet home|🌷|Netherlands/)

    fireEvent.click(hidden)
    expect(hidden.getAttribute('aria-expanded')).toBe('false')
    expect(live.textContent).toBe('')
    expect(within(card()).queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('works with the keyboard: Enter and Space, one Tab stop, arrows, Home and End', () => {
    render(<BadgesCard books={shelf} />)
    const m = medals()
    // one Tab stop: the first medal
    expect(m.filter((b) => b.tabIndex === 0)).toEqual([m[0]])
    m[0].focus()
    fireEvent.keyDown(m[0], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(m[1])
    expect(m.filter((b) => b.tabIndex === 0)).toEqual([m[1]])
    fireEvent.keyDown(m[1], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(m[0])
    fireEvent.keyDown(m[0], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(m[0])
    fireEvent.keyDown(m[0], { key: 'End' })
    expect(document.activeElement).toBe(m.at(-1))
    fireEvent.keyDown(m.at(-1)!, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(m.at(-1))
    fireEvent.keyDown(m.at(-1)!, { key: 'Home' })
    expect(document.activeElement).toBe(m[0])

    // Enter opens, focus stays on the medal; Space on the same closes
    fireEvent.keyDown(m[2], { key: 'Enter' })
    expect(m[2].getAttribute('aria-expanded')).toBe('true')
    expect(card().textContent).toContain('First book')
    m[2].focus()
    fireEvent.keyDown(m[2], { key: ' ' })
    expect(m[2].getAttribute('aria-expanded')).toBe('false')
    fireEvent.keyDown(m[3], { key: ' ' })
    expect(m[3].getAttribute('aria-expanded')).toBe('true')
    expect(m.filter((b) => b.tabIndex === 0)).toEqual([m[3]])
  })

  it('closes with × or Escape and puts focus back on its medal; folding closes it too', () => {
    render(<BadgesCard books={shelf} />)
    const first = medal('First book, bronze, unlocked')
    first.focus()
    fireEvent.click(first)
    expect(document.activeElement).toBe(first)
    const close = within(card()).getByRole('button', { name: 'Close' })
    close.focus()
    fireEvent.click(close)
    expect(first.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(first)

    fireEvent.click(first)
    within(card()).getByRole('button', { name: 'Close' }).focus()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(first.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(first)

    fireEvent.click(first)
    const fold = screen.getByRole('button', { name: /^Badges/ })
    fireEvent.click(fold)
    fireEvent.click(fold)
    expect(first.getAttribute('aria-expanded')).toBe('false')
    expect(card().textContent).toBe('')
  })

  it('keeps the head row, count and bar, folded or not', () => {
    render(<BadgesCard books={shelf} />)
    const total = badges(shelf).length
    const bar = screen.getByRole('progressbar', { name: 'Badges unlocked' })
    expect(bar.getAttribute('aria-valuenow')).toBe('3')
    expect(bar.getAttribute('aria-valuemax')).toBe(String(total))
    fireEvent.click(screen.getByRole('button', { name: /^Badges/ }))
    expect(screen.getByText(`3 of ${total} unlocked (5%)`)).toBeTruthy()
    expect(screen.getByRole('progressbar', { name: 'Badges unlocked' })).toBeTruthy()
  })

  it('follows the badge when the shelf changes under an open card', () => {
    const { rerender } = render(<BadgesCard books={shelf} />)
    fireEvent.click(medal('5 books, locked, 4 of 5'))
    rerender(<BadgesCard books={[...shelf, read('e', '2026-06-01')]} />)
    const earned = medal('5 books, silver, unlocked')
    expect(earned.getAttribute('aria-expanded')).toBe('true')
    expect(medals()[0]).toBe(earned)
    expect(card().textContent).toContain('Silver · Unlocked 1 Jun 2026')
  })
})
