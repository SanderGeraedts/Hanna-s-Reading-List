import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const {
  breakdown,
  goalProgress,
  lentOut,
  monthlyCounts,
  onThisDay,
  readingStreak,
  records,
  seriesProgress,
  wantPile,
  kindPace,
  kindPaceText,
  kindPaceSpoken,
  noPaceLine,
  paceTime,
  paceNumber,
} = await import('./insights')

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

const NOW = new Date(2026, 10, 7) // 7 November 2026

describe('dashboard extras (#66)', () => {
  it('counts books per month', () => {
    const counts = monthlyCounts([read('a', '2026-01-05'), read('b', '2026-01-20'), read('c', '2025-03-01')], 2026)
    expect(counts[0]).toBe(2)
    expect(counts.reduce((a, b) => a + b)).toBe(2)
  })

  it('groups what she read, folding the smallest groups into Other', () => {
    const shelf = [
      read('a', '2026-01-01', { genres: ['Fantasy'], language: 'de', formats: ['paperback'] }),
      read('b', '2026-02-01', { genres: ['Fantasy', 'Romance'], language: 'en', formats: ['storytel'] }),
      read('c', '2026-03-01', { language: 'de' }),
    ]
    const year = { kind: 'year', year: 2026 } as const
    expect(breakdown(shelf, year, 'genre')).toEqual([
      { label: 'Fantasy', count: 2 },
      { label: 'Romance', count: 1 },
      { label: 'No genre', count: 1 },
    ])
    expect(breakdown(shelf, year, 'language')[0]).toEqual({ label: 'German', count: 2 })
    expect(breakdown(shelf, year, 'genre', 2)).toEqual([
      { label: 'Fantasy', count: 2 },
      { label: 'Other', count: 2 },
    ])
  })

  it('works out how long the pile would take', () => {
    const shelf = [
      ...Array.from({ length: 12 }, (_, i) => read(`r${i}`, `2026-${String((i % 10) + 1).padStart(2, '0')}-01`)),
      book('w1', { pages: 300 }),
      book('w2', { formats: ['storytel'], minutes: 600, pages: 600 }),
    ]
    const pile = wantPile(shelf, NOW)
    expect(pile).toMatchObject({ books: 2, pages: 300, minutes: 600, perMonth: 1, months: 2 })
    expect(wantPile([book('w')], NOW).months).toBeUndefined()
  })

  it('lists lent books, longest away first', () => {
    const shelf = [
      book('a', { lent: { to: 'Lisa', since: '2026-11-01' } }),
      book('b', { lent: { to: 'Tom', since: '2026-10-01' } }),
      book('c', { lent: { to: '' } }),
    ]
    expect(lentOut(shelf, NOW).map((l) => [l.to, l.days])).toEqual([
      ['Tom', 37],
      ['Lisa', 6],
      ['someone', undefined],
    ])
  })

  it('shows progress for series she has started', () => {
    const pj = (n: number, extra: Partial<Book> = {}) =>
      book(`p${n}`, { title: `Percy Jackson, Teil ${n}: T${n}`, authors: ['Rick Riordan'], ...extra })
    const kc = (n: number) => book(`k${n}`, { title: `Die Kane-Chroniken ${n}: T${n}`, authors: ['Rick Riordan'] })
    const progress = seriesProgress([pj(2, { status: 'reading' }), pj(1, { status: 'read' }), pj(3), kc(1), kc(2)])
    expect(progress).toHaveLength(1)
    expect(progress[0]).toMatchObject({ name: 'Percy Jackson', read: 1, total: 3 })
    expect(progress[0].books.map((b) => b.id)).toEqual(['p1', 'p2', 'p3'])
  })

  it('finds the records', () => {
    const shelf = [
      read('long', '2026-01-01', { pages: 800, authors: ['A'] }),
      read('short', '2026-02-01', { pages: 90, authors: ['A'] }),
      read('again', '2026-03-01', { pages: 200, readCount: 3, authors: ['B'] }),
      read('audio', '2026-03-01', { formats: ['storytel'], minutes: 900, pages: 900 }),
    ]
    const rec = records(shelf, { kind: 'all' })
    expect(rec.longest?.id).toBe('long')
    expect(rec.shortest?.id).toBe('short')
    expect(rec.longestListen?.id).toBe('audio')
    expect(rec.topAuthor).toEqual({ name: 'A', books: 2 })
    expect(rec.mostReread).toMatchObject({ times: 3 })
    expect(rec.mostReread?.book.id).toBe('again')
  })

  it('tells whether the goal is ahead or behind', () => {
    // 1 July is about half way through the year
    const mid = new Date(2026, 6, 2)
    expect(goalProgress(30, 50, 2026, mid).ahead).toBe(5)
    expect(goalProgress(20, 50, 2026, mid).ahead).toBe(-5)
  })

  it('counts the days in a row with reading (#75)', () => {
    const log = (id: string, ...days: string[]) =>
      book(id, { status: 'reading', readingLog: Object.fromEntries(days.map((d) => [d, 0.01])) })
    // NOW is 7 November: nothing yet today, so the streak runs up to the 6th, across the month end
    const shelf = [log('a', '2026-11-06', '2026-11-05'), log('b', '2026-11-04', '2026-10-01', '2026-09-30', '2026-09-29', '2026-09-28')]
    expect(readingStreak(shelf, NOW)).toEqual({ current: 3, best: 4, today: false })
    expect(readingStreak([...shelf, log('c', '2026-11-07')], NOW)).toEqual({ current: 4, best: 4, today: true })
    // a day missed ends it
    expect(readingStreak([log('a', '2026-11-05')], NOW).current).toBe(0)
    // finishing without moving the progress isn't a reading day
    expect(readingStreak([read('r', '2026-11-06')], NOW).current).toBe(0)
  })

  it('finds books finished on this day in earlier years', () => {
    const shelf = [read('a', '2024-11-07'), read('b', '2026-11-07'), read('c', '2025-11-08')]
    expect(onThisDay(shelf, NOW).map((f) => [f.book.id, f.year])).toEqual([['a', 2024]])
  })
})

describe('reading goals on the server (#66)', async () => {
  vi.doUnmock('#/server/shelf')
  const { cleanGoals } = await vi.importActual<typeof import('#/server/shelf')>('#/server/shelf')

  it('keeps only sensible year goals', () => {
    expect(cleanGoals({ '2026': 50, '2025': 0, x: 3, '2024': 2.5, '2023': 12 })).toEqual({ '2026': 50, '2023': 12 })
    expect(cleanGoals(null)).toEqual({})
    expect(cleanGoals('50')).toEqual({})
  })
})

describe('the pile’s pace per kind (T-0024, D-0031)', () => {
  const paper = (id: string, day: string, extra: Partial<Book> = {}) => read(id, day, { formats: ['paperback'], pages: 300, ...extra })
  /** The pace shelf of T-0024's Done when, NOW = 7 November 2026. */
  const paceShelf = (extra: { withoutZ?: boolean } = {}) => [
    ...[1, 2, 3, 4, 5, 6].map((n) => paper(`P${n}`, `2026-0${n}-10`)),
    ...[1, 2, 3].map((n) => read(`E${n}`, `2026-0${n}-15`, { formats: ['ebook'], pages: 300 })),
    book('S1', { status: 'read', formats: ['storytel'], minutes: 600, finished: ['2026-02-01', '2026-08-01'] }),
    read('S2', '2026-03-03', { formats: ['storytel'] }),
    read('X', '2026-04-04', { formats: ['paperback', 'storytel'], pages: 300, minutes: 720 }),
    ...(extra.withoutZ ? [] : [read('Z', '2026-05-05', { formats: ['storytel'], sleepRead: true, minutes: 1200 })]),
    read('O', '2026-06-06', { formats: ['other'], pages: 200 }),
    paper('Old', '2025-11-07'),
    book('N', { status: 'read', readCount: 1, formats: ['paperback'], pages: 300 }),
    ...Array.from({ length: 11 }, (_, i) => book(`W${i + 1}`, { formats: ['paperback'], pages: 300 })),
    book('WE', { formats: ['ebook'], pages: 300 }),
    book('WS1', { formats: ['storytel'], minutes: 600 }),
    book('WS2', { formats: ['storytel'], minutes: 600 }),
    book('WX', { formats: ['paperback', 'storytel'], pages: 300, minutes: 720 }),
  ]

  it('All is unchanged on the pace shelf: 15 finishes, 1.25 a month, 12 months', () => {
    const pile = wantPile(paceShelf(), NOW)
    expect(pile).toMatchObject({ books: 15, perMonth: 1.25, months: 12 })
    expect(paceNumber(pile.perMonth)).toBe('1.3')
    expect(paceTime(pile.months!)).toBe('about 1 year')
  })

  it('gives each kind its pace and months', () => {
    const shelf = paceShelf()
    const p = kindPace(shelf, 'paper', NOW)
    expect(p.waiting).toBe(12)
    expect(p.perMonth).toBeCloseTo(7 / 12)
    expect(p.months).toBe(21)
    expect(paceTime(p.months!)).toBe('about 2 years')

    const e = kindPace(shelf, 'ebook', NOW)
    expect(e).toEqual({ kind: 'ebook', waiting: 1, perMonth: 0.25, months: 4 })

    const a = kindPace(shelf, 'audio', NOW)
    expect(a.waiting).toBe(1920)
    expect(a.perMonth).toBeCloseTo(3680 / 12)
    expect(a.months).toBe(7)
  })

  it('counts a sleep read: without Z the listening pace is 2,480 min, 3.4 h and 10 months', () => {
    const a = kindPace(paceShelf({ withoutZ: true }), 'audio', NOW)
    expect(a.perMonth).toBeCloseTo(2480 / 12)
    expect(a.months).toBe(10)
    expect(kindPaceText({ ...a, months: a.months! })).toBe("At your pace of 3.4 h a month, that's 10 months of listening.")
  })

  it('counts a re-read twice, leaves out Old and N, O only in All, X in Paper and Audiobook', () => {
    const only = (ids: string[]) => paceShelf().filter((b) => ids.includes(b.id) || b.status === 'want')
    expect(kindPace(only(['S1']), 'audio', NOW).perMonth).toBe(1200 / 12)
    expect(wantPile(only(['S1']), NOW).perMonth).toBe(2 / 12)
    expect(kindPace(only(['Old', 'N']), 'paper', NOW).months).toBeUndefined()
    expect(wantPile(only(['Old', 'N']), NOW).months).toBeUndefined()
    expect(wantPile(only(['O']), NOW).perMonth).toBe(1 / 12)
    for (const kind of ['paper', 'ebook', 'audio'] as const) expect(kindPace(only(['O']), kind, NOW).perMonth).toBe(0)
    expect(kindPace(only(['X']), 'paper', NOW).perMonth).toBe(1 / 12)
    expect(kindPace(only(['X']), 'audio', NOW).perMonth).toBe(720 / 12)
    expect(kindPace(only(['X']), 'ebook', NOW).perMonth).toBe(0)
  })

  it('counts an old Storytel import (only storytelId) in Audiobook', () => {
    const shelf = [
      read('imp', '2026-10-01', { storytelId: '123', minutes: 600 }),
      book('w', { formats: ['storytel'], minutes: 600 }),
      book('p', { formats: ['paperback'], pages: 300 }),
    ]
    expect(kindPace(shelf, 'audio', NOW)).toMatchObject({ perMonth: 50, months: 12 })
    expect(kindPace(shelf, 'paper', NOW).perMonth).toBe(0)
  })

  it('a kind with no finish in the period has no pace and no months', () => {
    const shelf = [paper('p', '2026-10-01'), book('we', { formats: ['ebook'], pages: 300 }), book('wa', { formats: ['storytel'] })]
    for (const kind of ['ebook', 'audio'] as const) {
      const pace = kindPace(shelf, kind, NOW)
      expect(pace.perMonth).toBe(0)
      expect(pace.months).toBeUndefined()
      expect(Object.values(pace).some((v) => typeof v === 'number' && !Number.isFinite(v))).toBe(false)
    }
  })

  it('writes the lines', () => {
    const shelf = paceShelf()
    const line = (kind: 'paper' | 'ebook' | 'audio', books = shelf) => {
      const p = kindPace(books, kind, NOW)
      return { ...p, months: p.months! }
    }
    expect(kindPaceText(line('paper'))).toBe("At your pace of 0.6 paper books a month, that's about 2 years of reading.")
    expect(kindPaceText(line('ebook'))).toBe("At your pace of 0.3 e-books a month, that's 4 months of reading.")
    expect(kindPaceText(line('audio'))).toBe("At your pace of 5.1 h a month, that's 7 months of listening.")
    expect(kindPaceText(line('audio'), ' ')).toBe("At your pace of 5.1 h a month, that's 7 months of listening.")
    expect(kindPaceSpoken(line('audio'))).toBe("At your pace of 5.1 hours a month, that's 7 months of listening.")

    const twelve = [...Array.from({ length: 12 }, (_, i) => paper(`p${i}`, '2026-10-01')), book('w', { formats: ['paperback'] })]
    expect(kindPaceText(line('paper', twelve))).toBe("At your pace of 1 paper book a month, that's 1 month of reading.")
    const twelveE = [...Array.from({ length: 12 }, (_, i) => read(`e${i}`, '2026-10-01', { formats: ['ebook'] })), book('w', { formats: ['ebook'] })]
    expect(kindPaceText(line('ebook', twelveE))).toBe("At your pace of 1 e-book a month, that's 1 month of reading.")

    const hour = [read('a', '2026-10-01', { formats: ['storytel'], minutes: 720 }), book('w', { formats: ['storytel'], minutes: 60 })]
    expect(kindPaceText(line('audio', hour))).toBe("At your pace of 1 h a month, that's 1 month of listening.")
    expect(kindPaceSpoken(line('audio', hour))).toBe("At your pace of 1 hour a month, that's 1 month of listening.")

    // 30 minutes in a year: 2.5 min a month, 0.04 h
    const tiny = [read('a', '2026-10-01', { formats: ['storytel'], minutes: 30 }), book('w', { formats: ['storytel'], minutes: 60 })]
    expect(kindPaceText(line('audio', tiny))).toBe("At your pace of 0.1 h a month, that's about 2 years of listening.")
    expect(kindPaceSpoken(line('audio', tiny))).toMatch(/^At your pace of 0\.1 hours a month/)

    expect(noPaceLine('paper')).toBe("You haven't finished a paper book in the last year, so there's no pace yet.")
    expect(noPaceLine('ebook')).toBe("You haven't finished an e-book in the last year, so there's no pace yet.")
    expect(noPaceLine('audio')).toBe("You haven't finished an audiobook in the last year, so there's no pace yet.")
  })
})
