import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { SQUARE_IDS, bingoYear } = await import('./bingo')
const { NO_SUGGESTION, drawSuggestion, suggestionPool } = await import('./bingoSuggest')

const TODAY = '2026-11-21'
const YEAR = 2026

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: [`Writer ${id}`],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})
const read = (id: string, day: string, extra: Partial<Book> = {}) => book(id, { status: 'read', finished: [day], ...extra })

const pool = (id: string, books: Book[]) => suggestionPool(id, books, YEAR, TODAY)
const ids = (id: string, books: Book[]) => (pool(id, books) ?? []).map((c) => c.book.id).sort()

/** The square suggests `fit` (each of them) and never `miss`. */
function expectFit(id: string, fit: Book[], miss: Book[], others: Book[] = []) {
  const got = ids(id, [...fit, ...miss, ...others])
  for (const b of fit) expect(got, `${id} suggests ${b.id}`).toContain(b.id)
  for (const b of miss) expect(got, `${id} leaves out ${b.id}`).not.toContain(b.id)
}

describe('bingo suggestions: clear fits (T-0017)', () => {
  it('page squares use the tick page count, a minute of listening a page', () => {
    const listenLong = book('listenLong', { formats: ['storytel'], minutes: 660 })
    const listenShort = book('listenShort', { formats: ['audiobook'], minutes: 150 })
    const unknown = book('unknown', { formats: ['storytel'] })
    expectFit('long', [book('p600', { pages: 600 }), listenLong], [book('p400', { pages: 400 }), unknown])
    expectFit('huge', [book('p800', { pages: 800 })], [book('p650', { pages: 650 }), listenLong])
    expectFit('short', [book('p150', { pages: 150 }), listenShort], [book('p250', { pages: 250 }), unknown])
  })

  it('Dutch, audio, a listen over 15 hours', () => {
    expectFit('dutch', [book('nl', { language: 'nl' })], [book('en', { language: 'en' }), book('none')])
    expectFit('audio', [book('a', { formats: ['audiobook'] }), book('st', { formats: ['storytel'] })], [book('paper', { formats: ['paperback'] })])
    expectFit('longlisten', [book('l16', { formats: ['audiobook'], minutes: 1000 })], [
      book('l10', { formats: ['audiobook'], minutes: 600 }),
      book('pages', { pages: 1000 }),
    ])
  })

  it('library, borrowed, hardcover', () => {
    expectFit('library', [book('lib', { formats: ['library'] })], [book('own', { formats: ['paperback'] })])
    expectFit('borrowed', [book('bor', { formats: ['borrowed'] })], [book('own', { formats: ['paperback'] })])
    expectFit('hardcover', [book('hc', { formats: ['hardcover'] })], [book('pb', { formats: ['paperback'] })])
  })

  it('before 1950 and out this year', () => {
    expectFit('classic', [book('old', { year: 1900 }), book('pub', { published: '1925-04-10' })], [book('new', { year: 2000 }), book('none')])
    expectFit('brandnew', [book('now', { year: 2026 })], [book('last', { year: 2025 }), book('none')])
  })

  it('each genre, and not fantasy', () => {
    expectFit('romance', [book('rom', { genres: ['Romance'] })], [book('fan', { genres: ['Fantasy'] })])
    expectFit('mystery', [book('thr', { genres: ['Thriller'] }), book('cr', { genres: ['Crime'] })], [book('fan', { genres: ['Fantasy'] })])
    expectFit('scifi', [book('dys', { genres: ['Dystopian'] }), book('sf', { genres: ['Science Fiction'] })], [book('fan', { genres: ['Fantasy'] })])
    expectFit('nonfiction', [book('mem', { genres: ['Memoir'] }), book('nf', { genres: ['Nonfiction'] })], [book('fan', { genres: ['Fantasy'] })])
    expectFit('genre', [book('rom', { genres: ['Romance'] })], [book('rf', { genres: ['Fantasy', 'Romance'] }), book('none')])
  })

  it('a new author: one she never finished a book by, per author', () => {
    const friend = read('friend', '2024-01-01', { authors: ['Old Friend'] })
    expectFit(
      'author',
      [book('fresh', { authors: ['Fresh Writer'] }), book('duo', { authors: ['Old Friend', 'Fresh Writer'] })],
      [book('again', { authors: ['Old Friend'] })],
      [friend],
    )
  })

  it('start a new series: book 1 of an unstarted series, not of a started one', () => {
    const a = (n: number, extra: Partial<Book> = {}) => book(`a${n}`, { series: 'Alpha', seriesIndex: n, ...extra })
    const b = (n: number, extra: Partial<Book> = {}) => book(`b${n}`, { series: 'Beta', seriesIndex: n, ...extra })
    const c = (n: number, extra: Partial<Book> = {}) => book(`c${n}`, { series: 'Gamma', seriesIndex: n, ...extra })
    expectFit('firstinseries', [a(1)], [b(1), c(1), book('alone')], [a(2), b(2, { status: 'reading' }), c(2, { status: 'read' })])
  })

  it('finish a series: the last unread book of its series on the shelf', () => {
    const c = (n: number, extra: Partial<Book> = {}) => book(`c${n}`, { series: 'Cee', seriesIndex: n, ...extra })
    const d = (n: number, extra: Partial<Book> = {}) => book(`d${n}`, { series: 'Dee', seriesIndex: n, ...extra })
    expectFit('series', [c(3)], [d(2), book('alone')], [c(1, { status: 'read' }), c(2, { status: 'read' }), d(1, { status: 'read' }), d(3)])
  })

  it('a series of 5+', () => {
    const e = (n: number) => book(`e${n}`, { series: 'Eee', seriesIndex: n })
    const f = (n: number) => book(`f${n}`, { series: 'Eff', seriesIndex: n })
    expectFit('longseries', [e(1)], [f(1), book('alone')], [e(2), e(3), e(4), e(5), f(2)])
  })

  it('same author twice: an author finished this year on any card, not only last year', () => {
    expectFit(
      'sameauthor',
      [book('again', { authors: ['Yearly Writer'] })],
      [book('last', { authors: ['Last Year Writer'] }), book('never')],
      [read('y', '2026-03-01', { authors: ['Yearly Writer'] }), read('ly', '2025-05-01', { authors: ['Last Year Writer'] })],
    )
  })

  it('same author twice: also an author finished only on an earlier, full card of this year', () => {
    // twelve finishes in February fill card 1 of 2026 (the bingo test's shelf, trimmed)
    const d = (n: number) => `2026-02-${String(n).padStart(2, '0')}`
    const card1: Book[] = [
      ...[1, 2, 3, 4, 5].map((i) => read(`saga${i}`, d(i), { series: 'Saga', seriesIndex: i, authors: ['Saga Writer'] })),
      read('big', d(10), {
        pages: 800,
        language: 'nl',
        genres: ['Romance'],
        rating: 5,
        spice: 4,
        year: 2026,
        formats: ['hardcover', 'library'],
        started: [d(9)],
        authors: ['New Writer'],
      }),
      read('small', d(11), { pages: 150, formats: ['borrowed'], genres: ['Mystery'], authors: ['New Writer'] }),
      read('listen', d(12), { formats: ['audiobook'], minutes: 1000, genres: ['Biography'], authors: ['Listen Writer'] }),
      read('space', d(13), { genres: ['Science fiction'], year: 1900, authors: ['Space Writer'] }),
      book('again', { status: 'read', readCount: 2, finished: ['2020-01-01', d(14)], authors: ['Again Writer'] }),
    ]
    const shelf = [...card1, book('more', { authors: ['Listen Writer'] })]
    const b = bingoYear(shelf, YEAR, '2026-04-30')
    expect(b.card).toBe(2)
    expect(b.finished[0].endsAt.slice(0, 10) >= d(12)).toBe(true)
    expect(ids('sameauthor', shelf)).toEqual(['more'])
  })
})

describe('bingo suggestions: best guesses (T-0017)', () => {
  it('week: under 300 pages or 8 hours', () => {
    expectFit('week', [book('p250', { pages: 250 }), book('l400', { formats: ['storytel'], minutes: 400 })], [
      book('p350', { pages: 350 }),
      book('l600', { formats: ['storytel'], minutes: 600 }),
      book('none'),
    ])
  })

  it('fast: under 200 pages', () => {
    expectFit('fast', [book('p150', { pages: 150 })], [book('p250', { pages: 250 }), book('none')])
  })

  it('five: an author with a 5-star book', () => {
    expectFit(
      'five',
      [book('next', { authors: ['Star Writer'] }), book('duo', { authors: ['Other', 'Star Writer'] })],
      [book('meh', { authors: ['Fine Writer'] })],
      [read('loved', '2025-01-01', { authors: ['Star Writer'], rating: 5 }), read('ok', '2025-01-01', { authors: ['Fine Writer'], rating: 4 })],
    )
  })

  it('spicy: an author or series with 4+ spice, or the book itself', () => {
    const s = (n: number, extra: Partial<Book> = {}) => book(`s${n}`, { series: 'Heat', seriesIndex: n, ...extra })
    expectFit(
      'spicy',
      [book('byAuthor', { authors: ['Hot Writer'] }), s(2), book('itself', { spice: 4 })],
      [book('mild', { authors: ['Mild Writer'] })],
      [
        read('hot', '2025-01-01', { authors: ['Hot Writer'], spice: 5 }),
        s(1, { status: 'read', spice: 4, authors: ['Someone Else'] }),
        read('cool', '2025-01-01', { authors: ['Mild Writer'], spice: 2 }),
      ],
    )
  })

  it('re-read: only finished books, 4–5 stars first, never a sleep read or a want book', () => {
    const shelf = [
      read('loved', '2025-01-01', { rating: 5 }),
      read('liked', '2025-01-01', { rating: 4 }),
      read('meh', '2025-01-01', { rating: 3 }),
      read('sleepy', '2025-01-01', { rating: 5, sleepRead: true }),
      book('want', { rating: 5 }),
      book('rereading', { status: 'reading', readCount: 1, rating: 5 }),
      book('dnf', { status: 'dnf', rating: 5 }),
    ]
    expect(ids('reread', shelf)).toEqual(['liked', 'loved'])
    // with none rated 4–5, any finished book that isn't a sleep read
    expect(ids('reread', shelf.map((b) => (b.id === 'sleepy' ? b : { ...b, rating: 3 })))).toEqual(['meh'].concat(['liked', 'loved']).sort())
    expect(pool('reread', shelf)!.every((c) => c.weight === 1)).toBe(true)
  })
})

describe('bingo suggestions: no reaction, no fit and the rules for every square (T-0017)', () => {
  it('3 and 5 books in one month give no reaction; nothing fitting gives no fit', () => {
    expect(pool('three', [book('a', { pages: 100 })])).toBeNull()
    expect(pool('fivemonth', [book('a', { pages: 100 })])).toBeNull()
    expect([...NO_SUGGESTION].sort()).toEqual(['fivemonth', 'three'])
    expect(pool('dutch', [book('en', { language: 'en' })])).toEqual([])
  })

  it('no square but re-read suggests a finished book, a sleep read, a book not out yet or book 3 before book 2', () => {
    // each of these fits nearly every square, but none may be offered
    const all: Partial<Book> = {
      pages: 150,
      language: 'nl',
      formats: ['audiobook', 'library', 'borrowed', 'hardcover'],
      minutes: 1000,
      year: 1900,
      genres: ['Romance', 'Thriller', 'Memoir', 'Dystopian'],
      spice: 5,
      authors: ['Shared Writer'],
    }
    const g = (n: number, extra: Partial<Book>) => book(`g${n}`, { ...all, series: 'Gee', seriesIndex: n, ...extra })
    const shelf = [
      read('done', '2026-03-01', { ...all, rating: 5 }),
      book('sleepy', { ...all, sleepRead: true }),
      book('later', { ...all, releaseDate: '2027-01-01' }),
      g(1, { status: 'read' }),
      g(2, {}),
      g(3, {}),
      g(4, {}),
      g(5, {}),
    ]
    for (const id of SQUARE_IDS) {
      if (id === 'reread' || NO_SUGGESTION.has(id)) continue
      const got = ids(id, shelf)
      for (const bad of ['done', 'sleepy', 'later', 'g1', 'g3', 'g4', 'g5']) expect(got, `${id} leaves out ${bad}`).not.toContain(bad)
    }
    // book 2 is the one she can start, and it does fit
    expect(ids('dutch', shelf)).toEqual(['g2'])
  })

  it('every square has an answer', () => {
    for (const id of SQUARE_IDS) expect(pool(id, [book('x')]), id).not.toBeUndefined()
  })
})

describe('bingo suggestions: the draw (T-0017)', () => {
  it('is weighted by wishWeight', () => {
    // waited two years: three times as likely as one just added
    const waited = book('waited', { pages: 150, addedAt: Date.parse('2024-11-21T12:00:00Z') })
    const fresh = book('fresh', { pages: 150, addedAt: Date.parse('2026-11-21T12:00:00Z') })
    const p = pool('short', [fresh, waited])!
    expect(p.find((c) => c.book.id === 'waited')!.weight).toBeCloseTo(3)
    expect(p.find((c) => c.book.id === 'fresh')!.weight).toBeCloseTo(1)
    // random 0.5 lands in the waited book's three quarters, 0.1 in the fresh book's quarter
    const order = p.map((c) => c.book.id)
    const at = (r: number) => drawSuggestion(p, [], () => r)!.book.id
    expect(at(order[0] === 'fresh' ? 0.5 : 0.9)).toBe('waited')
    expect(at(order[0] === 'fresh' ? 0.1 : 0.9)).toBe('fresh')
    // over many seeded draws, about three in four are the waited book
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    let waitedCount = 0
    for (let i = 0; i < 4000; i++) if (drawSuggestion(p, [], random)!.book.id === 'waited') waitedCount++
    expect(waitedCount / 4000).toBeGreaterThan(0.7)
    expect(waitedCount / 4000).toBeLessThan(0.8)
  })

  it('Another one does not repeat until every fitting book was shown, then starts over', () => {
    const p = pool('short', [book('a', { pages: 100 }), book('b', { pages: 120 }), book('c', { pages: 140 })])!
    const random = () => 0
    let shown: string[] = []
    const seen: string[] = []
    for (let i = 0; i < 3; i++) {
      const next = drawSuggestion(p, shown, random)!
      seen.push(next.book.id)
      shown = next.shown
    }
    expect([...seen].sort()).toEqual(['a', 'b', 'c'])
    // a fourth draw starts over, but not with the book on screen
    const fourth = drawSuggestion(p, shown, random)!
    expect(fourth.book.id).not.toBe(seen[2])
    expect(fourth.shown).toEqual([fourth.book.id])
  })

  it('with one fitting book, it is shown again; with none, nothing', () => {
    const one = pool('short', [book('a', { pages: 100 })])!
    expect(drawSuggestion(one, ['a'])!.book.id).toBe('a')
    expect(drawSuggestion([], [])).toBeUndefined()
  })
})

describe('bingo suggestions: sleep reads through their series (tester, T-0017)', () => {
  it('re-read leaves out a finished book whose series is marked as a sleep read', () => {
    const shelf = [
      read('n1', '2025-01-01', { series: 'Night', seriesIndex: 1, rating: 5, sleepSeries: 'night' }),
      read('n2', '2025-02-01', { series: 'Night', seriesIndex: 2, rating: 5 }),
      read('day', '2025-03-01', { rating: 5 }),
    ]
    expect(ids('reread', shelf)).toEqual(['day'])
  })

  it('no square offers a want book of a series marked as a sleep read', () => {
    const shelf = [
      read('n1', '2026-01-01', { series: 'Night', seriesIndex: 1, sleepSeries: 'night', authors: ['Night Writer'] }),
      book('n2', { series: 'Night', seriesIndex: 2, pages: 150, language: 'nl', authors: ['Night Writer'] }),
    ]
    for (const id of SQUARE_IDS) if (id !== 'reread') expect(ids(id, shelf), id).not.toContain('n2')
  })
})
