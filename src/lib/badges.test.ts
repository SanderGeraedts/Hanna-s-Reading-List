import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { badges, newBadges } = await import('./badges')
const { rhythm } = await import('./rhythm')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'read',
  addedAt: 0,
  ...extra,
})
const read = (id: string, day: string, extra: Partial<Book> = {}) => book(id, { finished: [day], readCount: 1, ...extra })
const find = (all: ReturnType<typeof badges>, id: string) => all.find((b) => b.id === id)!

describe('milestones & badges', () => {
  it('earns book badges on the day the count is reached', () => {
    const shelf = Array.from({ length: 10 }, (_, i) => read(`b${i}`, `2026-0${1 + (i % 9)}-1${i % 9}`))
    const all = badges(shelf, '2026-11-20')
    expect(find(all, 'books-1')).toMatchObject({ earned: true, on: '2026-01-10' })
    expect(find(all, 'books-10').earned).toBe(true)
    expect(find(all, 'books-50').earned).toBe(false)
  })

  it('counts a finished series, a streak and an old favourite', () => {
    const shelf = [
      read('s1', '2026-03-01', { series: 'Saga', seriesIndex: 1 }),
      read('s2', '2026-04-02', { series: 'Saga', seriesIndex: 2 }),
      book('fav', { readCount: 5, finished: ['2021-01-01', '2022-01-01', '2023-01-01', '2024-01-01', '2025-06-01'] }),
      book('log', {
        status: 'reading',
        pages: 300,
        readingLog: Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`2026-11-0${i + 1}`, 0.05])),
      }),
    ]
    const all = badges(shelf, '2026-11-20')
    expect(find(all, 'series-1')).toMatchObject({ earned: true, on: '2026-04-02' })
    expect(find(all, 'streak-7')).toMatchObject({ earned: true, on: '2026-11-07' })
    expect(find(all, 'streak-30').earned).toBe(false)
    expect(find(all, 'reread-5')).toMatchObject({ earned: true, on: '2025-06-01' })
  })

  it('shows badges earned in the last week as new', () => {
    const all = badges([read('a', '2026-11-18')], '2026-11-20')
    expect(newBadges(all, '2026-11-20').map((b) => b.id)).toEqual(['books-1'])
    expect(newBadges(all, '2026-12-01')).toEqual([])
  })
})

describe('more badges, progress and secrets', () => {
  it('shows progress on locked visible badges, never on secret ones', () => {
    const all = badges([read('a', '2026-01-02'), read('b', '2026-01-03')], '2026-11-20')
    expect(find(all, 'books-10').progress).toEqual({ done: 2, goal: 10 })
    expect(find(all, 'books-1').progress).toBeUndefined()
    expect(find(all, 'author-5')).toMatchObject({ earned: false, secret: true })
    expect(find(all, 'author-5').progress).toBeUndefined()
  })

  it('unlocks secret badges: loyal fan, binge, doorstopper, same day', () => {
    const shelf = [
      ...['2026-02-01', '2026-02-03', '2026-02-05', '2026-03-01', '2026-04-01'].map((d, i) => read(`f${i}`, d, { authors: ['Fan Author'] })),
      read('big', '2026-05-01', { pages: 900 }),
      read('fast', '2026-06-10', { started: ['2026-06-10'] }),
    ]
    const all = badges(shelf, '2026-11-20')
    expect(find(all, 'author-5')).toMatchObject({ earned: true, on: '2026-04-01' })
    expect(find(all, 'binge')).toMatchObject({ earned: true, on: '2026-02-05' })
    expect(find(all, 'doorstopper')).toMatchObject({ earned: true, on: '2026-05-01' })
    expect(find(all, 'same-day')).toMatchObject({ earned: true, on: '2026-06-10' })
    expect(find(all, 'new-year').earned).toBe(false)
  })

  it('finds a rainbow of spines', () => {
    const colours = ['#e5484d', '#f2843a', '#f5c842', '#4fb365', '#3d8fe0', '#5b5bd6', '#a35bd0']
    const all = badges(colours.map((c, i) => read(`r${i}`, `2026-0${i + 1}-01`, { color: c })), '2026-11-20')
    expect(find(all, 'rainbow')).toMatchObject({ earned: true, on: '2026-07-01' })
  })
})

describe('when I read most', () => {
  it('finds the weekday with the most reading days', () => {
    // 2026-11-01 and 2026-11-08 are Sundays, 2026-11-03 a Tuesday
    const r = rhythm([book('x', { readingLog: { '2026-11-01': 0.1, '2026-11-08': 0.1, '2026-11-03': 0.1 } })], 2026, '2026-11-20')
    expect(r.weekdays[6]).toBe(2)
    expect(r.line).toBe('You read most on Sundays.')
    expect(r.months[10]).toBe(3)
    expect(rhythm([], 2026, '2026-11-20').line).toBeUndefined()
  })
})
