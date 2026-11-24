import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

vi.mock('#/server/shelf', () => ({
  loadShelf: async () => null,
  saveShelf: async () => ({ updated: 't' }),
  loadGoals: async () => null,
  saveGoal: async () => true,
  loadChallenges: async () => null,
  saveChallenges: async () => true,
}))
vi.mock('#/server/openLibrary', () => ({ searchBooks: async () => [], getWorkDetails: async () => null }))
vi.mock('#/server/creatures', () => ({
  loadCreatures: async () => ({ kept: false, events: [] }),
  saveCreatures: async () => ({ kept: false, events: [] }),
}))

const bursts: number[] = []
vi.mock('./Confetti', async () => {
  const real = await vi.importActual<typeof import('./Confetti')>('./Confetti')
  return { ...real, confetti: () => bursts.push(Date.now()) }
})

const { ChallengesPage } = await import('./ChallengesPage')

/**
 * The tester's attempt to break the Challenges page (T-0090 … T-0093): no
 * challenges at all, one finished, two finished at once, the year switch, and
 * a browser that refuses to remember anything.
 */

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A. Writer'],
  color: '#888888',
  status: 'read',
  readCount: 1,
  addedAt: 0,
  finished: ['2026-03-01'],
  ...extra,
})

const DONE_KEY = 'hannas-reading-list:challenges-done:local'
const OWN_KEY = 'hannas-reading-list:own-challenges:local'

const page = (books: Book[]) => <ChallengesPage books={books} accountId={null} onShowBook={() => {}} onUpdate={() => {}} />

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
  vi.setSystemTime(new Date('2026-11-23T12:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => {
  bursts.length = 0
  localStorage.clear()
})
afterEach(cleanup)

const settle = () => vi.advanceTimersByTime(400)

describe('no challenges at all', () => {
  it('shows no ring row, the page empty line, and never fires confetti', () => {
    render(page([]))
    settle()
    expect(document.querySelector('.challenge-rings')).toBe(null)
    expect(screen.getByText('No challenges in 2026 yet.')).toBeTruthy()
    expect(bursts).toHaveLength(0)
  })

  it('does not fall over on a shelf of books with nothing finished', () => {
    const want = [book('w', { status: 'want', readCount: 0, finished: [] })]
    expect(() => {
      render(page(want))
      settle()
    }).not.toThrow()
  })
})

describe('the confetti, which must never fire twice', () => {
  const finished = [
    book('one', { genres: ['Fantasy'] }),
    ...Array.from({ length: 3 }, (_, i) => book(`a${i}`, { finished: [`2026-10-0${i + 1}`], genres: ['Horror'] })),
  ]
  // two of her own, both already done: two challenges complete at the same moment
  const two = JSON.stringify([
    { id: 'c1', name: 'One book', target: 1, year: 2026, rule: 'any' },
    { id: 'c2', name: 'One fantasy', target: 1, year: 2026, rule: 'genre', value: 'Fantasy' },
  ])

  it('records everything and stays quiet on the very first visit', () => {
    localStorage.setItem(OWN_KEY, two)
    render(page(finished))
    settle()
    expect(bursts).toHaveLength(0)
    const seen = JSON.parse(localStorage.getItem(DONE_KEY)!) as string[]
    expect(seen).toContain('2026:own:c1')
    expect(seen).toContain('2026:own:c2')
  })

  it('fires once — not twice — when two challenges are new since the last visit', () => {
    localStorage.setItem(OWN_KEY, two)
    localStorage.setItem(DONE_KEY, JSON.stringify([]))
    render(page(finished))
    settle()
    expect(bursts).toHaveLength(1)
  })

  it('stays quiet on the next visit', () => {
    localStorage.setItem(OWN_KEY, two)
    localStorage.setItem(DONE_KEY, JSON.stringify([]))
    const first = render(page(finished))
    settle()
    expect(bursts).toHaveLength(1)
    first.unmount()
    bursts.length = 0
    render(page(finished))
    settle()
    expect(bursts).toHaveLength(0)
  })

  it('keeps quiet, rather than bursting every visit, when the browser refuses to remember', () => {
    localStorage.setItem(OWN_KEY, two)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    render(page(finished))
    settle()
    expect(bursts).toHaveLength(0)
    setItem.mockRestore()
  })

  it('survives nonsense in the memory', () => {
    localStorage.setItem(OWN_KEY, two)
    localStorage.setItem(DONE_KEY, '{"not":"a list"}')
    expect(() => {
      render(page(finished))
      settle()
    }).not.toThrow()
    // a memory that is not a list counts as no memory at all: record, stay quiet
    expect(bursts).toHaveLength(0)
  })
})

describe('the year switch', () => {
  const shelf = [book('this', { finished: ['2026-03-01'] }), book('last', { finished: ['2025-03-01'] })]

  it('changes the whole row and hides the ways to change an earlier year', () => {
    localStorage.setItem(DONE_KEY, JSON.stringify([]))
    render(page(shelf))
    settle()
    expect(screen.getByRole('group', { name: 'Your challenges in 2026' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Previous year' }))
    settle()
    expect(screen.getByRole('group', { name: 'Your challenges in 2025' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '＋ New challenge' })).toBeNull()
    expect(screen.queryByRole('button', { name: '＋ Add a series' })).toBeNull()
  })
})

describe('a ring jumps to its challenge', () => {
  it('scrolls the block into view', () => {
    localStorage.setItem(DONE_KEY, JSON.stringify([]))
    render(page([book('a', { finished: ['2026-03-01'] })]))
    settle()
    const row = screen.getByRole('group', { name: 'Your challenges in 2026' })
    const ring = within(row).getAllByRole('button')[0]
    const id = ring.getAttribute('data-ring')!
    const block = document.getElementById(`challenge-${id}`)
    expect(block).toBeTruthy()
    const scroll = vi.fn()
    block!.scrollIntoView = scroll
    fireEvent.click(ring)
    expect(scroll).toHaveBeenCalled()
  })
})
