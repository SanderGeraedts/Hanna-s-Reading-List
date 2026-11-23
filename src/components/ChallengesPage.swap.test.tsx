import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Book } from '#/lib/library'

const saved: Array<Record<string, unknown>> = []

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
  saveCreatures: async (input: { data: { events: Array<Record<string, unknown>> } }) => {
    saved.push(...input.data.events)
    return { kept: false, events: [] }
  },
}))

const { ChallengesPage } = await import('./ChallengesPage')
const { SQUARES, SQUARE_IDS, cardSquares } = await import('#/lib/bingo')
const { bingoSwaps } = await import('#/lib/bingoSwap')
const { cleanLog } = await import('#/lib/creatures/choices')

/** A swap written to the choice log from the page (T-0093, D-0063). */

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
const notOnCard = SQUARE_IDS.filter((id) => !card1.includes(id))
const key = 'hannas-reading-list:creatures:local'

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-22T12:00:00'))
})
afterAll(() => vi.useRealTimers())
beforeEach(() => {
  saved.length = 0
  localStorage.clear()
})
afterEach(cleanup)

const log = () => cleanLog(JSON.parse(localStorage.getItem(key) ?? '[]'))

const swapFirstSquare = (to = notOnCard[0], slot = 0, from = card1[slot]) => {
  const square = screen.getByRole('button', {
    name: new RegExp(`^${SQUARES[from].label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},`),
  })
  fireEvent.click(square)
  fireEvent.click(screen.getByRole('button', { name: 'Swap this square' }))
  const group = screen.getByRole('group', { name: 'Pick another square' })
  fireEvent.click(within(group).getByRole('button', { name: SQUARES[to].label }))
}

const page = () => <ChallengesPage books={shelf} accountId={null} onShowBook={() => {}} onUpdate={() => {}} />

describe('a swap from the Challenges page', () => {
  it('writes one place event with a b: key and redraws the card', () => {
    render(page())
    swapFirstSquare()
    const events = log()
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'place', key: 'b:2026:1:0', sq: notOnCard[0] })
    expect(bingoSwaps(events).get('2026:1:0')).toBe(notOnCard[0])
    expect(screen.getByRole('button', { name: new RegExp(`^${SQUARES[notOnCard[0]].label}`) })).toBeTruthy()
  })

  it('swapping the same slot twice keeps the newest, nothing is removed by hand', () => {
    render(page())
    swapFirstSquare(notOnCard[0])
    vi.setSystemTime(new Date('2026-11-22T12:00:05'))
    // slot 0 now holds the square she swapped in; swap it again
    swapFirstSquare(notOnCard[1], 0, notOnCard[0])
    // a place event is a setting: the log keeps one per key, the newest (D-0034 §1)
    const events = log()
    expect(events).toHaveLength(1)
    expect(bingoSwaps(events).get('2026:1:0')).toBe(notOnCard[1])
    vi.setSystemTime(new Date('2026-11-22T12:00:00'))
  })

  it('works with no account and stays in this browser', () => {
    render(page())
    swapFirstSquare()
    expect(log()).toHaveLength(1)
    expect(saved).toHaveLength(0)
  })

  it('survives a fresh render from the stored log', () => {
    const { unmount } = render(page())
    swapFirstSquare()
    unmount()
    cleanup()
    render(page())
    expect(screen.getByRole('button', { name: new RegExp(`^${SQUARES[notOnCard[0]].label}`) })).toBeTruthy()
  })
})
