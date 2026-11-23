import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { Book } from '#/lib/library'
import type { Badge } from '#/lib/badges'

// T-0042 tester: trying to break the medal grid. `extra` adds badges after the real ones, to
// try a grid of 72+ (T-0043 adds 12) without waiting for them.
let extra: Badge[] = []
vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/lib/badges', async (importOriginal) => {
  const real = await importOriginal<typeof import('#/lib/badges')>()
  return { ...real, badges: (...args: Parameters<typeof real.badges>) => [...real.badges(...args), ...extra] }
})
const { BadgesCard } = await import('./NewBlocks')
const { badges } = await import('#/lib/badges')

const read = (id: string, day: string, extraFields: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: [`Author ${id}`],
  color: '#888888',
  status: 'read',
  addedAt: 0,
  finished: [day],
  readCount: 1,
  ...extraFields,
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

/** Lays the medals out `cols` a row for the grid's ↑ ↓ (jsdom has no layout): 56 px a row. */
function layOut(cols: number) {
  const spy = vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
    const all = [...document.querySelectorAll('.medals button')]
    const i = all.indexOf(this)
    return i < 0 ? 0 : Math.floor(i / cols) * 56
  })
  return spy
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  extra = []
  vi.restoreAllMocks()
})

describe('the medal grid, trying to break it (T-0042 tester)', () => {
  it('steps ↑ ↓ by the columns shown, 6 a row (390 px): straight down and up, stays in the first and last row', () => {
    layOut(6)
    render(<BadgesCard books={shelf} />)
    const m = medals()
    expect(m).toHaveLength(72)
    m[2].focus()
    fireEvent.keyDown(m[2], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(m[8])
    fireEvent.keyDown(m[8], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(m[2])
    fireEvent.keyDown(m[2], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(m[2])
    // 72 = 12 full rows of 6 (T-0043): ↓ in the last row stays
    m[69].focus()
    fireEvent.keyDown(m[69], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(m[69])
    fireEvent.keyDown(m[69], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(m[63])
  })

  it('steps ↑ ↓ by 8 a row (1280 px), and ↓ above a shorter last row goes to the last medal', () => {
    // 72 badges fill 9 rows of 8 exactly (T-0043): 4 more make a shorter last row
    extra = [1, 2, 3, 4].map((n): Badge => ({ id: `row-${n}`, icon: '🧪', name: `Row ${n}`, how: 'Test', earned: false, tier: 'gold' }))
    layOut(8)
    render(<BadgesCard books={shelf} />)
    const m = medals()
    // 76 = 9 rows of 8 + 4: the last row is 72–75
    m[66].focus()
    fireEvent.keyDown(m[66], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(m[74])
    m[71].focus()
    fireEvent.keyDown(m[71], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(m[75])
    fireEvent.keyDown(m[75], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(m[75])
    fireEvent.keyDown(m[75], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(m[67])
  })

  it('takes a grid of 87 badges: all counted, in order, End and ↓ reach the last, hidden ones stay hidden', () => {
    // 15 more than the 72 of T-0043: steps of a new family and new secrets
    extra = [
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n): Badge => ({
        id: `extra-${n}`,
        icon: '🧪',
        name: `Extra ${n}`,
        how: `Do ${n} things`,
        earned: n === 1,
        on: n === 1 ? '2026-06-02' : undefined,
        progress: n === 1 ? undefined : { done: 1, goal: n },
        tier: n === 1 ? 'bronze' : n === 11 ? 'gold' : 'silver',
      })),
      ...[1, 2, 3, 4].map((n): Badge => ({
        id: `extra-secret-${n}`,
        icon: '🎂',
        name: `Secret extra ${n}`,
        how: 'A surprise',
        earned: false,
        secret: true,
        riddle: `Riddle ${n}`,
        tier: 'gold',
      })),
    ]
    layOut(6)
    render(<BadgesCard books={shelf} />)
    const all = badges(shelf)
    expect(all).toHaveLength(87)
    const m = medals()
    expect(m).toHaveLength(87)
    const earnedCount = all.filter((b) => b.earned).length
    expect(screen.getByText(`${earnedCount} of 87 unlocked (${Math.round((earnedCount / 87) * 100)}%)`)).toBeTruthy()
    // the newest earned badge comes first, the hidden ones (12 of today's + 4 new) last
    expect(m[0].getAttribute('aria-label')).toBe('Extra 1, bronze, unlocked')
    const hiddenCount = all.filter((b) => b.secret && !b.earned).length
    expect(hiddenCount).toBe(16)
    expect(m.slice(-hiddenCount).every((b) => b.getAttribute('aria-label') === 'Hidden badge')).toBe(true)
    expect(m[87 - hiddenCount - 1].getAttribute('aria-label')).not.toBe('Hidden badge')
    expect(grid().textContent).not.toContain('🎂')
    // one Tab stop, End, and ↓ from the row above the short last row (87 = 14 × 6 + 3)
    expect(m.filter((b) => b.tabIndex === 0)).toHaveLength(1)
    m[0].focus()
    fireEvent.keyDown(m[0], { key: 'End' })
    expect(document.activeElement).toBe(m[86])
    m[83].focus()
    fireEvent.keyDown(m[83], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(m[86])
    // the last hidden medal's card: its riddle, never its name or emoji
    fireEvent.keyDown(m[86], { key: 'Enter' })
    expect(card().textContent).toContain('Riddle 4')
    expect(card().textContent).not.toContain('Secret extra')
    expect(card().textContent).not.toContain('🎂')
  })

  it('keeps focus on a medal that moves to the front when it is earned under an open card', () => {
    const { rerender } = render(<BadgesCard books={shelf} />)
    const five = medal('5 books, locked, 4 of 5')
    five.focus()
    fireEvent.keyDown(five, { key: 'Enter' })
    rerender(<BadgesCard books={[...shelf, read('e', '2026-06-01')]} />)
    const earned = medal('5 books, silver, unlocked')
    expect(medals()[0]).toBe(earned)
    expect(document.activeElement).toBe(earned)
    expect(earned.tabIndex).toBe(0)
  })

  it('turns a hidden medal’s riddle into its name when it is earned under an open card', () => {
    const { rerender } = render(<BadgesCard books={shelf} />)
    // three books finished within seven days: the secret Binge
    const hidden = within(grid()).getAllByRole('button', { name: 'Hidden badge' })
    const binge = hidden.find((b) => b.dataset.id === 'binge')!
    fireEvent.click(binge)
    expect(card().textContent).toContain('Hidden badge')
    expect(card().textContent).not.toContain('Binge')
    rerender(<BadgesCard books={[...shelf, read('e', '2026-06-01'), read('f', '2026-06-02'), read('g', '2026-06-03')]} />)
    const earned = within(grid()).getByRole('button', { name: /^Binge, gold, unlocked, secret badge$/ })
    expect(earned.getAttribute('aria-expanded')).toBe('true')
    expect(card().textContent).toContain('Binge')
    expect(card().textContent).toContain('Gold · secret · Unlocked')
  })

  it('closes the card when its badge is gone', () => {
    extra = [{ id: 'gone', icon: '👻', name: 'Gone soon', how: 'Vanish', earned: true, on: '2026-06-09', tier: 'gold' }]
    const { rerender } = render(<BadgesCard books={shelf} />)
    fireEvent.click(medal('Gone soon, gold, unlocked'))
    expect(card().textContent).toContain('Gone soon')
    extra = []
    rerender(<BadgesCard books={[...shelf]} />)
    expect(card().textContent).toBe('')
    expect(medals().filter((b) => b.getAttribute('aria-expanded') === 'true')).toHaveLength(0)
    expect(medals().filter((b) => b.tabIndex === 0)).toHaveLength(1)
  })
})
