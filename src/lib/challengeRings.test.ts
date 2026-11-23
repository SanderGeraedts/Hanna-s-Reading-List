import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { challengeRings, completedChallenges, ringLabel } from './challengeRings'
import type { OwnChallenge } from './ownChallenges'

/** One summary per challenge (T-0090, D-0060). */

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A. Writer'],
  color: '#888888',
  status: 'read',
  readCount: 1,
  addedAt: 0,
  ...extra,
})

const read = (id: string, day: string, extra: Partial<Book> = {}) => book(id, { finished: [day], ...extra })

const TODAY = '2026-11-23'
const ringsOf = (books: Book[], goal: number | null = null, own: OwnChallenge[] = []) =>
  challengeRings({ books, year: 2026, goal, own, today: TODAY })
const byId = (books: Book[], id: string, goal: number | null = null, own: OwnChallenge[] = []) =>
  ringsOf(books, goal, own).find((r) => r.id === id)

describe('a shelf with no challenges at all', () => {
  it('gives no rings and no crash', () => {
    expect(challengeRings({ books: [], year: 2026, goal: null, today: TODAY })).toEqual([])
  })

  it('gives no rings for a shelf of books with no goal, no picks and no log', () => {
    // bingo ticks and an A–Z letter start by themselves from one finished book
    expect(ringsOf([read('a', '2026-01-02')]).map((r) => r.id)).toEqual(['bingo', 'alphabet'])
  })
})

describe('the reading goal', () => {
  it('counts the books of the year against the goal', () => {
    const shelf = [read('a', '2026-01-02'), read('b', '2026-02-02'), read('c', '2026-03-02')]
    expect(byId(shelf, 'goal', 12)).toMatchObject({ done: 3, goal: 12, complete: false, name: 'Reading goal', short: 'Goal' })
    expect(byId(shelf, 'goal', 3)).toMatchObject({ complete: true })
    expect(byId(shelf, 'goal', 2)).toMatchObject({ done: 3, goal: 2, complete: true })
  })

  it('has no ring at all when no goal is set', () => {
    expect(byId([read('a', '2026-01-02')], 'goal', null)).toBeUndefined()
    expect(byId([read('a', '2026-01-02')], 'goal', 0)).toBeUndefined()
  })
})

describe('the other ready-made challenges', () => {
  it('gives bingo and A–Z a ring at once, and the world and the seasons only once they have started', () => {
    const shelf = [read('a', '2026-01-02')]
    expect(byId(shelf, 'bingo')).toMatchObject({ goal: 16, name: 'Book bingo', counts: 'squares' })
    expect(byId(shelf, 'alphabet')).toMatchObject({ goal: 26, counts: 'letters' })
    expect(byId(shelf, 'world')).toBeUndefined()
    expect(byId(shelf, 'season')).toBeUndefined()
  })

  it('gives the monthly challenge a ring only once she has picked a book', () => {
    expect(byId([read('a', '2026-01-02')], 'monthly')).toBeUndefined()
    const picked = [read('a', '2026-03-02', { challengeMonth: '2026-03' })]
    expect(byId(picked, 'monthly')).toMatchObject({ done: 1, goal: 1, complete: true, counts: 'months' })
  })

  it('gives minutes a day a ring only once a day of the year has happened with reading', () => {
    const log = { '2026-01-01': 0.5 }
    const shelf = [book('r', { status: 'reading', pages: 300, readingLog: log })]
    expect(byId(shelf, 'minutes')).toMatchObject({ counts: 'days' })
    expect(byId([], 'minutes')).toBeUndefined()
  })

  it('gives read the series a ring only once she has picked a series', () => {
    expect(byId([read('a', '2026-01-02')], 'series')).toBeUndefined()
    const shelf = [
      read('s1', '2026-01-02', { series: 'Throne of Glass', seriesIndex: 1 }),
      book('s2', { series: 'Throne of Glass', seriesIndex: 2, status: 'want' }),
    ]
    const pick: OwnChallenge = { id: 'p', name: 'Throne of Glass', target: 2, year: 2026, rule: 'finishseries', value: 'throne of glass' }
    expect(byId(shelf, 'series', null, [pick])).toMatchObject({ goal: 1, counts: 'series' })
  })
})

describe('her own challenges', () => {
  const own: OwnChallenge[] = [
    { id: 'c1', name: 'Fantasy year', target: 5, year: 2026, rule: 'genre', value: 'Fantasy' },
    { id: 'c2', name: 'Pages', target: 1000, year: 2026, rule: 'any', unit: 'pages' },
    { id: 'c3', name: 'Last year', target: 5, year: 2025, rule: 'any' },
    { id: 'p', name: 'Throne of Glass', target: 2, year: 2026, rule: 'finishseries', value: 'throne of glass' },
  ]
  const shelf = [read('a', '2026-01-02', { genres: ['Fantasy'], pages: 400 })]

  it('gives one ring each, named by her name, this year only, the series picks aside', () => {
    const ids = ringsOf(shelf, null, own).map((r) => r.id)
    expect(ids).toContain('own:c1')
    expect(ids).toContain('own:c2')
    expect(ids).not.toContain('own:c3')
    expect(ids).not.toContain('own:p')
    expect(byId(shelf, 'own:c1', null, own)).toMatchObject({ name: 'Fantasy year', short: 'Fantasy', done: 1, goal: 5 })
    expect(byId(shelf, 'own:c2', null, own)).toMatchObject({ done: 400, goal: 1000, counts: 'pages' })
  })

  it('keeps the page order: the ready-made ones first, then hers', () => {
    const ids = ringsOf(shelf, 10, own).map((r) => r.id)
    expect(ids.indexOf('goal')).toBeLessThan(ids.indexOf('own:c1'))
    expect(ids.indexOf('own:c1')).toBeLessThan(ids.indexOf('own:c2'))
  })

  it('gives the same answer twice in a row', () => {
    expect(ringsOf(shelf, 10, own)).toEqual(ringsOf(shelf, 10, own))
  })
})

describe('completed challenges, over every year', () => {
  it('counts a challenge complete in two years twice', () => {
    const shelf = [read('a', '2025-01-02'), read('b', '2026-01-02')]
    const done = completedChallenges({ books: shelf, goals: { 2025: 1, 2026: 1 }, today: TODAY })
    expect(done).toContain('2025:goal')
    expect(done).toContain('2026:goal')
  })

  it('counts nothing on an empty shelf', () => {
    expect(completedChallenges({ books: [], today: TODAY })).toEqual([])
  })

  it('counts a finished own challenge', () => {
    const own: OwnChallenge[] = [{ id: 'c1', name: 'One book', target: 1, year: 2026, rule: 'any' }]
    expect(completedChallenges({ books: [read('a', '2026-01-02')], own, today: TODAY })).toContain('2026:own:c1')
  })
})

describe('what a ring is called', () => {
  it('reads as a sentence, with "done" when it is', () => {
    expect(ringLabel({ id: 'goal', name: 'Reading goal', short: 'Goal', done: 3, goal: 12, complete: false, counts: 'books' })).toBe(
      'Reading goal: 3 of 12 books',
    )
    expect(ringLabel({ id: 'goal', name: 'Reading goal', short: 'Goal', done: 12, goal: 12, complete: true })).toBe(
      'Reading goal: done, 12 of 12',
    )
    expect(ringLabel({ id: 'minutes', name: 'Minutes a day', short: 'Minutes', done: 12, goal: 23, complete: false, counts: 'days' })).toBe(
      'Minutes a day: 12 of 23 days',
    )
  })
})
