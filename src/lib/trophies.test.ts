import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }), loadGoals: async () => null, saveGoal: async () => ({}) }))

const { challengeYears, yearTrophies } = await import('./trophies')

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

describe('trophy row on the Challenges page', () => {
  it('shows the goal, the A–Z progress and the monthly challenge of a year', () => {
    const shelf = [
      read('a', 'Alpha', '2025-02-01'),
      read('b', 'Beta', '2025-03-01', { challengeMonth: '2025-03' }),
      read('old', 'Gamma', '2024-05-01'),
    ]
    const t = yearTrophies(shelf, 2025, 2, '2026-06-01')
    expect(t.find((x) => x.id === 'goal')).toEqual({ id: 'goal', label: 'Goal reached · 2 of 2', done: true })
    expect(t.find((x) => x.id === 'alphabet')?.label).toBe('A–Z titles · 2/26')
    expect(t.find((x) => x.id === 'monthly')).toMatchObject({ label: 'Monthly · 1 of 1 months', done: true })
    // no goal set, no full bingo card: those are left out
    expect(yearTrophies(shelf, 2025, null, '2026-06-01').some((x) => x.id === 'goal' || x.id === 'bingo')).toBe(false)
  })

  it('offers every year from the first finish to this one', () => {
    expect(challengeYears([read('x', 'X', '2024-07-01')], '2026-11-19')).toEqual([2024, 2025, 2026])
    expect(challengeYears([], '2026-11-19')).toEqual([2026])
  })
})
