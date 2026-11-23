import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }), loadGoals: async () => null, saveGoal: async () => ({}) }))

const { challengeYears, fullCardsLine } = await import('./trophies')

const read = (id: string, title: string, day: string, extra: Partial<Book> = {}): Book => ({
  id,
  title,
  authors: ['Someone Else'],
  color: '#888888',
  status: 'read',
  finished: [day],
  readCount: 1,
  addedAt: 0,
  ...extra,
})

describe('what the Challenges page says about a year (D-0060: the rings replaced the trophy lines)', () => {
  it('says nothing about full bingo cards when there are none', () => {
    const shelf = [
      read('a', 'Alpha', '2025-02-01'),
      read('b', 'Beta', '2025-03-01', { challengeMonth: '2025-03' }),
      read('old', 'Gamma', '2024-05-01'),
    ]
    expect(fullCardsLine(shelf, 2025, '2026-06-01')).toBe(null)
  })

  it('counts the cards remembered on her books', () => {
    const card = (n: number) => ({ year: 2025, card: n, endsAt: `2025-0${n}-01|a|0`, squares: [], ticks: {} })
    const shelf = [read('a', 'Alpha', '2025-02-01', { bingoCards: [card(1)] })]
    expect(fullCardsLine(shelf, 2025, '2026-06-01')).toBe('1 full bingo card')
    const two = [read('a', 'Alpha', '2025-02-01', { bingoCards: [card(1), card(2)] })]
    expect(fullCardsLine(two, 2025, '2026-06-01')).toBe('2 full bingo cards')
  })

  it('offers every year from the first finish to this one', () => {
    expect(challengeYears([read('x', 'X', '2024-07-01')], '2026-11-19')).toEqual([2024, 2025, 2026])
    expect(challengeYears([], '2026-11-19')).toEqual([2026])
  })
})
