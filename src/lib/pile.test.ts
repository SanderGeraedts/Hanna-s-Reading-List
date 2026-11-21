import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { cleanDustOff, dustOffDismiss, dustOffPick, dustOffSeen, pileJars, pileMonths, pileSentence, signed, waitedText, weekOf } =
  await import('./pile')

/** a local moment on yyyy-mm-dd, as addedAt is kept */
const at = (day: string) => new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10), 12).getTime()

const book = (id: string, added: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Title ${id}`,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: at(added),
  ...extra,
})

const TODAY = '2026-11-21'

describe('pile in vs. out per month', () => {
  it('counts a finish as out only after 14 days on the shelf', () => {
    const shelf = [
      book('13', '2026-11-01', { status: 'read', finished: ['2026-11-14'] }),
      book('14', '2026-10-31', { status: 'read', finished: ['2026-11-14'] }),
    ]
    const now = pileMonths(shelf, TODAY).at(-1)!
    expect(now).toMatchObject({ year: 2026, month: 11, added: 1, read: 1, net: 0 })
  })

  it('counts a re-read again by the same rule, and skips books with no finish day', () => {
    const shelf = [
      book('again', '2025-01-01', { status: 'read', finished: ['2026-11-02', '2026-11-20'] }),
      book('noday', '2025-01-01', { status: 'read', readCount: 1 }),
    ]
    expect(pileMonths(shelf, TODAY).at(-1)).toMatchObject({ added: 0, read: 2, net: -2 })
  })

  it('says shrank, grew, stayed the same or nothing', () => {
    expect(pileSentence({ added: 3, read: 5 })).toBe('This month you added 3 and read 5 from your pile: your pile shrank by 2 🎉')
    expect(pileSentence({ added: 5, read: 3 })).toBe('This month you added 5 and read 3 from your pile: your pile grew by 2.')
    expect(pileSentence({ added: 2, read: 2 })).toBe('This month you added 2 and read 2 from your pile: your pile stayed the same.')
    expect(pileSentence({ added: 0, read: 1 })).toBe('This month you added 0 and read 1 from your pile: your pile shrank by 1 🎉')
    expect(pileSentence({ added: 0, read: 0 })).toBe('Nothing added or read from your pile yet this month.')
  })

  it('gives the net change for the last 6 months, this month last, across a new year', () => {
    const shelf = [
      book('a', '2025-08-10'),
      book('b', '2025-08-11'),
      book('c', '2025-06-01', { status: 'read', finished: ['2025-09-02'] }),
      book('d', '2026-01-05'),
    ]
    const months = pileMonths(shelf, '2026-01-15')
    expect(months.map((m) => `${m.year}-${m.month}`)).toEqual(['2025-8', '2025-9', '2025-10', '2025-11', '2025-12', '2026-1'])
    expect(months.map((m) => m.net)).toEqual([2, -1, 0, 0, 0, 1])
    expect(pileMonths([], TODAY).map((m) => m.net)).toEqual([0, 0, 0, 0, 0, 0])
  })

  it('writes a change with its sign', () => {
    expect([signed(2), signed(0), signed(-3)]).toEqual(['+2', '0', '−3'])
  })
})

describe('the buying jar', () => {
  const read = (id: string, formats: Book['formats'], day: string) =>
    book(id, '2026-01-01', { status: 'read', formats, finished: [day] })

  it('earns a coin for paperback, hardcover and e-book finishes from the pile', () => {
    const shelf = [read('p', ['paperback'], '2026-11-02'), read('h', ['hardcover'], '2026-11-03'), read('e', ['ebook'], '2026-11-04')]
    expect(pileJars(shelf, TODAY).buying).toBe(3)
  })

  it('does not earn for a finish within 14 days of adding', () => {
    expect(pileJars([book('new', '2026-11-05', { status: 'read', formats: ['paperback'], finished: ['2026-11-10'] })], TODAY).buying).toBe(0)
  })

  it('spends 3 when an owned book is added, only when there are 3', () => {
    const three = [read('p', ['paperback'], '2026-11-02'), read('h', ['hardcover'], '2026-11-03'), read('e', ['ebook'], '2026-11-04')]
    expect(pileJars([...three, book('buy', '2026-11-10', { formats: ['hardcover'] })], TODAY).buying).toBe(0)
    // with 2 coins, adding a book does nothing (never below 0)
    expect(pileJars([...three.slice(0, 2), book('buy', '2026-11-10', { formats: ['ebook'] })], TODAY).buying).toBe(2)
    // a coin earned on a day can be spent that same day: finishes count first
    expect(pileJars([...three.slice(0, 2), read('x', ['paperback'], '2026-11-10'), book('buy', '2026-11-10', { formats: ['paperback'] })], TODAY).buying).toBe(0)
  })

  it('library and borrowed books never earn or spend', () => {
    const three = [read('p', ['paperback'], '2026-11-02'), read('h', ['hardcover'], '2026-11-03'), read('e', ['ebook'], '2026-11-04')]
    const shelf = [
      ...three,
      read('l', ['library'], '2026-11-05'),
      read('b', ['borrowed'], '2026-11-06'),
      book('lib', '2026-11-07', { formats: ['library'] }),
      book('bor', '2026-11-08', { formats: ['borrowed'] }),
    ]
    expect(pileJars(shelf, TODAY)).toEqual({ buying: 3, storytel: 0 })
  })

  it('counts nothing before 2026-11-01', () => {
    const shelf = [read('old', ['paperback'], '2026-10-31'), read('new', ['paperback'], '2026-11-01')]
    expect(pileJars(shelf, TODAY).buying).toBe(1)
    // an owned book added in October doesn't spend November's coins
    const three = [read('p', ['paperback'], '2026-11-02'), read('h', ['hardcover'], '2026-11-03'), read('e', ['ebook'], '2026-11-04')]
    expect(pileJars([...three, book('oct', '2026-10-20', { formats: ['paperback'] })], TODAY).buying).toBe(3)
  })
})

describe('the Storytel jar', () => {
  it('earns for listen-only Storytel finishes from the pile, and never spends', () => {
    const shelf = [
      book('s1', '2026-01-01', { status: 'read', formats: ['storytel'], finished: ['2026-11-02'] }),
      book('s2', '2026-01-01', { status: 'read', storytelId: '123', finished: ['2026-11-03'] }),
      book('s3', '2026-01-01', { status: 'read', formats: ['storytel'], finished: ['2026-11-04'] }),
      book('a', '2026-01-01', { status: 'read', formats: ['audiobook'], finished: ['2026-11-05'] }),
      book('buy', '2026-11-10', { formats: ['paperback'] }),
      book('buy2', '2026-11-11', { formats: ['hardcover'] }),
    ]
    expect(pileJars(shelf, TODAY)).toEqual({ buying: 0, storytel: 3 })
  })

  it('a book with paper and Storytel counts for the buying jar only', () => {
    const shelf = [book('both', '2026-01-01', { status: 'read', formats: ['paperback', 'storytel'], finished: ['2026-11-02'] })]
    expect(pileJars(shelf, TODAY)).toEqual({ buying: 1, storytel: 0 })
  })
})

describe('dust off the oldest, once a week', () => {
  const shelf = [
    book('old', '2024-03-01'),
    book('older-but-read', '2023-01-01', { status: 'read' }),
    book('mid', '2025-06-01'),
    book('young', '2026-10-01'),
  ]
  const empty = { dismissed: [] }

  it('weeks run Monday to Sunday', () => {
    expect(weekOf('2026-11-21')).toBe('2026-11-16') // a Saturday
    expect(weekOf('2026-11-16')).toBe('2026-11-16') // a Monday
    expect(weekOf('2026-11-22')).toBe('2026-11-16') // a Sunday
    expect(weekOf('2026-11-23')).toBe('2026-11-23')
  })

  it('picks the oldest choice, skipping a blocked series book and one not out yet', () => {
    const blocked = [
      book('s3', '2020-01-01', { title: 'Saga, Book 3: Three', authors: ['A'] }),
      book('s1', '2020-02-01', { title: 'Saga, Book 1: One', authors: ['A'], status: 'read' }),
      book('soon', '2019-01-01', { releaseDate: '2027-01-01' }),
    ]
    expect(dustOffPick([...shelf, ...blocked], empty, TODAY)?.id).toBe('old')
  })

  it('keeps the same book all week, and nothing once she starts it', () => {
    const state = dustOffSeen(empty, shelf[0], TODAY)
    // an older book becomes a choice mid-week: the week's pick stays
    const later = [...shelf, book('oldest', '2020-01-01')]
    expect(dustOffPick(later, state, '2026-11-22')?.id).toBe('old')
    // she starts it: gone until next Monday
    const started = shelf.map((b) => (b.id === 'old' ? { ...b, status: 'reading' as const } : b))
    expect(dustOffPick(started, state, '2026-11-22')).toBeUndefined()
    expect(dustOffPick(started, state, '2026-11-23')?.id).toBe('mid')
  })

  it('after Not now nothing shows that week, and next week the oldest not dismissed', () => {
    const state = dustOffDismiss(dustOffSeen(empty, shelf[0], TODAY), shelf[0], TODAY)
    expect(dustOffPick(shelf, state, TODAY)).toBeUndefined()
    expect(dustOffPick(shelf, state, '2026-11-22')).toBeUndefined()
    expect(dustOffPick(shelf, state, '2026-11-23')?.id).toBe('mid')
    const twice = dustOffDismiss(state, shelf[2], '2026-11-24')
    expect(dustOffPick(shelf, twice, '2026-11-30')?.id).toBe('young')
  })

  it('shows nothing while the oldest has been on the shelf less than 14 days', () => {
    expect(dustOffPick([book('n', '2026-11-08')], empty, TODAY)).toBeUndefined()
    expect(dustOffPick([book('n', '2026-11-07')], empty, TODAY)?.id).toBe('n')
    expect(dustOffPick([], empty, TODAY)).toBeUndefined()
  })

  it('says how long it waited in weeks, months or years, rounded down', () => {
    expect(waitedText(book('w', '2026-11-07'), TODAY)).toBe('2 weeks')
    expect(waitedText(book('w', '2026-10-25'), TODAY)).toBe('3 weeks')
    expect(waitedText(book('m', '2026-10-21'), TODAY)).toBe('1 month')
    expect(waitedText(book('m', '2026-06-01'), TODAY)).toBe('5 months')
    expect(waitedText(book('y', '2025-11-21'), TODAY)).toBe('1 year')
    expect(waitedText(book('y', '2024-04-01'), TODAY)).toBe('2 years')
  })

  it('reads a saved state safely', () => {
    expect(cleanDustOff(null)).toEqual({ dismissed: [] })
    expect(cleanDustOff({ week: '2026-11-16', pick: 'a', dismissed: ['a', 3] })).toEqual({ week: '2026-11-16', pick: 'a', dismissed: ['a'] })
    expect(cleanDustOff({ week: 'nope', dismissed: 'x' })).toEqual({ dismissed: [] })
  })
})
