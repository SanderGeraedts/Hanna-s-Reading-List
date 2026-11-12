import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const {
  addDays,
  bingo,
  bingoLines,
  favouriteAuthors,
  finishEstimate,
  goalPace,
  goalPaceText,
  heatmap,
  monthlyFormats,
  reviewYear,
  spiceStats,
  yearReview,
} = await import('./insightsMore')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})
const read = (id: string, day: string, extra: Partial<Book> = {}) =>
  book(id, { status: 'read', finished: [day], ...extra })

const NOW = new Date(2026, 10, 12, 20) // Thursday 12 November 2026, evening
const TODAY = '2026-11-12'

describe('finish-by estimate', () => {
  it('spreads the rest of the book over how much and how often she reads', () => {
    // 10% on 7 of the last 14 days: 5% a day on average; 30% left is 6 days
    const log: Record<string, number> = {}
    for (let i = 1; i <= 13; i += 2) log[addDays(TODAY, -i)] = 0.1
    const e = finishEstimate(book('a', { status: 'reading', progress: 0.7, pages: 400, readingLog: log }), NOW)
    expect(e.known).toBe(true)
    if (!e.known) return
    expect(e.readingDays).toBe(7)
    expect(e.days).toBe(14)
    expect(e.perReadingDay).toBeCloseTo(0.1)
    // not read today yet, so today is the first of the 6 days
    expect(e.daysAway).toBe(5)
    expect(e.day).toBe('2026-11-17')
  })

  it('counts from the day she started when that is recent', () => {
    const e = finishEstimate(
      book('a', {
        status: 'reading',
        progress: 0.5,
        started: ['2026-11-10'],
        readingLog: { '2026-11-10': 0.2, '2026-11-11': 0.2, [TODAY]: 0.1 },
      }),
      NOW,
    )
    // 50% in 3 days; 50% left takes 3 more, starting tomorrow
    expect(e.known && e.daysAway).toBe(3)
  })

  it('says it does not know without enough reading', () => {
    expect(finishEstimate(book('a', { status: 'reading', progress: 0.3 }), NOW).known).toBe(false)
    expect(
      finishEstimate(book('a', { status: 'reading', progress: 0.3, readingLog: { '2026-11-01': 0.3 } }), NOW).known,
    ).toBe(false)
    // old reading doesn't count
    expect(
      finishEstimate(
        book('a', { status: 'reading', progress: 0.3, readingLog: { '2026-09-01': 0.1, '2026-09-02': 0.2 } }),
        NOW,
      ).known,
    ).toBe(false)
  })
})

describe('heatmap', () => {
  it('lays out a year of weeks, Monday on top, up to today', () => {
    const h = heatmap(
      [
        book('a', { pages: 300, readingLog: { [TODAY]: 0.1, '2026-11-01': 0.5, '2024-01-01': 1 } }),
        book('b', { minutes: 600, formats: ['storytel'], readingLog: { [TODAY]: 0.1 } }),
      ],
      NOW,
    )
    expect(h.weeks.length).toBe(53)
    expect(h.weeks.every((w) => w.length === 7)).toBe(true)
    expect(h.weeks[0][0]!.day).toBe('2025-11-10') // a Monday
    const last = h.weeks.at(-1)!
    expect(last[3]!.day).toBe(TODAY) // a Thursday
    expect(last[4]).toBeNull()
    expect(last[3]).toMatchObject({ pages: 30, minutes: 60, books: 2 })
    expect(last[3]!.level).toBeGreaterThan(0)
    expect(h.readingDays).toBe(2)
    expect(h.pages).toBe(180)
    // a month label for every month, in order, not too close together
    expect(h.months.at(-1)!.month).toBe(11)
    for (let i = 1; i < h.months.length; i++) expect(h.months[i].column - h.months[i - 1].column).toBeGreaterThanOrEqual(3)
  })
})

describe('favourite authors', () => {
  it('ranks authors by books read, with their average rating', () => {
    const top = favouriteAuthors([
      read('a', '2026-01-01', { authors: ['Sarah J. Maas'], rating: 5 }),
      read('b', '2026-02-01', { authors: ['Sarah J. Maas'], rating: 4 }),
      read('c', '2026-03-01', { authors: ['Rebecca Yarros'] }),
      book('d', { authors: ['Rebecca Yarros'] }), // not read
      read('e', '2026-03-01', { authors: ['Alice', 'Bob'], rating: 3 }),
    ])
    expect(top[0]).toEqual({ name: 'Sarah J. Maas', books: 2, rated: 2, rating: 4.5 })
    expect(top.map((a) => a.name)).toEqual(['Sarah J. Maas', 'Alice', 'Bob', 'Rebecca Yarros'])
    expect(top[3].rating).toBeUndefined()
  })
})

describe('spice meter', () => {
  it('averages the spice of the books read in a period, and finds the spiciest', () => {
    const shelf = [
      read('a', '2026-01-01', { spice: 2 }),
      read('b', '2026-02-01', { spice: 5 }),
      read('c', '2026-03-01', { spice: 5, rating: 4 }),
      read('d', '2026-03-01'),
      read('e', '2025-03-01', { spice: 1 }),
    ]
    const s = spiceStats(shelf, { kind: 'year', year: 2026 })
    expect(s.average).toBe(4)
    expect(s.rated).toBe(3)
    expect(s.read).toBe(4)
    expect(s.spiciest.map((b) => b.id)).toEqual(['c', 'b', 'a'])
    expect(spiceStats([read('d', '2026-03-01')], { kind: 'all' }).average).toBeUndefined()
  })
})

describe('listening vs reading', () => {
  it('turns the reading log into pages and minutes per month', () => {
    const m = monthlyFormats(
      [
        book('a', { pages: 400, readingLog: { '2026-01-05': 0.25, '2026-02-01': 0.5, '2025-01-01': 1 } }),
        book('b', { pages: 600, minutes: 600, formats: ['storytel'], readingLog: { '2026-01-06': 0.1 } }),
        book('c', { readingLog: { '2026-01-06': 0.5 } }), // no length: left out
      ],
      2026,
    )
    expect(m[0]).toEqual({ pages: 100, minutes: 60 })
    expect(m[1]).toEqual({ pages: 200, minutes: 0 })
    expect(m[2]).toEqual({ pages: 0, minutes: 0 })
  })
})

describe('year in review', () => {
  it('looks back on last year in January', () => {
    expect(reviewYear(new Date(2027, 0, 20))).toBe(2026)
    expect(reviewYear(NOW)).toBe(2026)
  })

  it('sums up a year', () => {
    const r = yearReview(
      [
        read('a', '2026-03-02', { pages: 300, rating: 4, spice: 3, genres: ['Fantasy'] }),
        read('b', '2026-03-20', { pages: 200, rating: 5, genres: ['Fantasy', 'Romance'] }),
        read('c', '2026-07-01', { minutes: 600, formats: ['storytel'], spice: 4, genres: ['Romance'] }),
        read('d', '2025-07-01', { pages: 999, rating: 5 }),
        book('e', { readingLog: { '2026-05-01': 0.1, '2026-05-02': 0.1, '2026-05-03': 0.1, '2026-06-01': 0.1 } }),
      ],
      2026,
    )
    expect(r).toMatchObject({ books: 3, pages: 500, minutes: 600, streak: 3, busiest: { month: 3, books: 2 } })
    expect(r.topRated?.id).toBe('b')
    expect(r.spiciest?.id).toBe('c')
    expect(['Fantasy', 'Romance']).toContain(r.genre)
  })
})

describe('book bingo', () => {
  const ticked = (squares: ReturnType<typeof bingo>) => squares.filter((s) => s.auto).map((s) => s.id)

  it('ticks squares from the books finished that year', () => {
    const squares = bingo(
      [
        read('long', '2026-02-01', { pages: 650, language: 'nl', authors: ['New Author'] }),
        read('short', '2026-02-10', { pages: 150, authors: ['Old Friend'], genres: ['Thriller'] }),
        read('old', '2024-02-10', { authors: ['Old Friend'] }),
        book('again', { status: 'read', readCount: 2, finished: ['2026-03-01'], authors: ['Old Friend'] }),
        read('quick', '2026-04-07', { started: ['2026-04-02'], rating: 5, spice: 4, authors: ['Old Friend'] }),
        read('listen', '2026-02-20', { formats: ['storytel'], minutes: 500, authors: ['Old Friend'] }),
      ],
      2026,
    )
    expect(squares.length).toBe(16)
    expect(ticked(squares).sort()).toEqual(
      ['audio', 'author', 'dutch', 'five', 'genre', 'long', 'reread', 'short', 'spicy', 'three', 'week'].sort(),
    )
    expect(squares.find((s) => s.id === 'author')!.book!.id).toBe('long')
    expect(squares.filter((s) => s.manualOnly).every((s) => !s.auto)).toBe(true)
  })

  it('ticks a finished series and leaves other years alone', () => {
    const shelf = [
      read('s1', '2025-05-01', { series: 'Crowns', seriesIndex: 1 }),
      read('s2', '2026-05-01', { series: 'Crowns', seriesIndex: 2 }),
    ]
    expect(ticked(bingo(shelf, 2026))).toContain('series')
    expect(ticked(bingo([...shelf, book('s3', { series: 'Crowns', seriesIndex: 3 })], 2026))).not.toContain('series')
    expect(ticked(bingo(shelf, 2024))).toEqual([])
  })

  it('counts lines', () => {
    const t = Array(16).fill(false)
    expect(bingoLines(t)).toBe(0)
    for (const i of [0, 1, 2, 3]) t[i] = true
    expect(bingoLines(t)).toBe(1)
    for (const i of [5, 10, 15]) t[i] = true
    expect(bingoLines(t)).toBe(2)
  })
})

describe('goal pace', () => {
  it('says what it takes to reach the goal', () => {
    // 12 Nov: 50 days left in 2026, 7 weeks
    const p = goalPace(18, 20, 2026, NOW)
    expect(p).toMatchObject({ toGo: 2, daysLeft: 50 })
    expect(goalPaceText(p)).toBe('2 books to go, 7 weeks left: about one every 4 weeks')
    expect(goalPaceText(goalPace(10, 20, 2026, NOW))).toBe('10 books to go, 7 weeks left: about one every 5 days')
    expect(goalPaceText(goalPace(0, 30, 2026, NOW))).toBe('30 books to go, 7 weeks left: about 4 a week')
    expect(goalPaceText(goalPace(5, 12, 2026, NOW))).toBe('7 books to go, 7 weeks left: about one a week')
    expect(goalPaceText(goalPace(20, 20, 2026, NOW))).toBe('')
    expect(goalPaceText(goalPace(1, 3, 2026, new Date(2026, 11, 25)))).toBe('2 books to go, 7 days left: about one every 4 days')
  })
})
