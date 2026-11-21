import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { SQUARE_IDS, bingoLines, bingoYear, cardSquares, readStart, rememberCard } = await import('./bingo')
const { yearReview } = await import('./insightsMore')
const { mergeBooks } = await import('./merge')

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

/** Books finished in one month that tick every one of the 28 squares. */
function everything(month: string, tag: string): Book[] {
  const d = (n: number) => `${month}-${String(n).padStart(2, '0')}`
  const saga = [1, 2, 3, 4, 5].map((i) =>
    read(`${tag}saga${i}`, d(i), { series: `Saga ${tag}`, seriesIndex: i, authors: [`Saga writer ${tag}`] }),
  )
  return [
    ...saga,
    read(`${tag}big`, d(10), {
      pages: 800,
      language: 'nl',
      genres: ['Romance'],
      rating: 5,
      spice: 4,
      year: Number(month.slice(0, 4)),
      formats: ['hardcover', 'library'],
      started: [d(9)],
      authors: [`New writer ${tag}`],
    }),
    read(`${tag}small`, d(11), { pages: 150, formats: ['borrowed'], genres: ['Mystery'], authors: [`New writer ${tag}`] }),
    read(`${tag}listen`, d(12), { formats: ['audiobook'], minutes: 1000, genres: ['Biography'] }),
    read(`${tag}space`, d(13), { genres: ['Science fiction'], year: 1900 }),
    book(`${tag}again`, { status: 'read', readCount: 2, finished: ['2020-01-01', d(14)] }),
  ]
}

describe('book bingo squares', () => {
  it('counts a book read in a day without a start day, from its reading log', () => {
    const ticks = (b: Book) => bingoYear([b], 2026, '2026-11-13').squares.filter((s) => s.ticked).map((s) => s.id)
    // went straight from want-to-read to read: no start day, one day in the reading log
    const grimm = read('grimm', '2026-11-12', { readingLog: { '2026-11-12': 1 } })
    expect(grimm.started).toBeUndefined()
    expect(readStart(grimm, '2026-11-12')).toBe('2026-11-12')
    expect(ticks(grimm)).toContain('week')
    // started months ago: its log goes back that far, so it isn't a fast read
    const slow = read('slow', '2026-11-12', { readingLog: { '2026-06-01': 0.2, '2026-11-12': 0.8 } })
    expect(ticks(slow)).not.toContain('week')
    // marked read by hand without any log or start: nothing to go on
    expect(readStart(read('unknown', '2026-11-12'), '2026-11-12')).toBeUndefined()
  })

  it('only looks at the log since the previous finish, for a re-read', () => {
    const again = book('again', {
      status: 'read',
      readCount: 2,
      finished: ['2026-02-01', '2026-09-10'],
      readingLog: { '2026-01-20': 1, '2026-09-08': 0.5, '2026-09-10': 0.5 },
    })
    expect(readStart(again, '2026-09-10')).toBe('2026-09-08')
    expect(readStart(again, '2026-02-01')).toBe('2026-01-20')
  })

  it('has 28 squares, and the first card keeps the old ones in their places', () => {
    expect(SQUARE_IDS.length).toBe(28)
    const { squares } = cardSquares(2026, 1)
    expect(squares.length).toBe(16)
    expect(new Set(squares).size).toBe(16)
    expect(squares.slice(0, 3)).toEqual(['long', 'dutch', 'audio'])
    expect(squares[14]).toBe('spicy')
  })

  it('mixes later cards, the same way every time', () => {
    const a = cardSquares(2026, 2)
    expect(a).toEqual(cardSquares(2026, 2))
    expect(new Set(a.squares).size).toBe(16)
    expect(a.squares).not.toEqual(cardSquares(2026, 3).squares)
    expect([...a.squares, ...a.spare].sort()).toEqual([...SQUARE_IDS].sort())
  })

  it('ticks squares from the books finished that year', () => {
    const b = bingoYear(
      [
        read('long', '2026-02-01', { pages: 650, language: 'nl', authors: ['New Author'] }),
        read('short', '2026-02-10', { pages: 150, authors: ['Old Friend'], genres: ['Thriller'] }),
        read('old', '2024-02-10', { authors: ['Old Friend'] }),
        book('again', { status: 'read', readCount: 2, finished: ['2026-03-01'], authors: ['Old Friend'] }),
        read('quick', '2026-04-07', { started: ['2026-04-02'], rating: 5, spice: 4, authors: ['Old Friend'] }),
        read('listen', '2026-02-20', { formats: ['storytel'], minutes: 500, authors: ['Old Friend'] }),
      ],
      2026,
      '2026-11-13',
    )
    const ticked = b.squares.filter((s) => s.ticked).map((s) => s.id)
    for (const id of ['audio', 'author', 'dutch', 'five', 'genre', 'long', 'reread', 'short', 'spicy', 'three', 'week'])
      expect(ticked).toContain(id)
    expect(b.squares.find((s) => s.id === 'author')!.book!.id).toBe('long')
    expect(b.card).toBe(1)
    expect(b.finished).toEqual([])
  })

  it('counts audiobooks she only listens to by the shelf pages, a minute a page (#140)', () => {
    const ticks = (b: Book) => bingoYear([b], 2026, '2026-11-13').squares.filter((s) => s.ticked).map((s) => s.id)
    // 11 hours on Storytel, no page count: 660 pages on the shelf
    expect(ticks(read('long-listen', '2026-03-01', { formats: ['storytel'], minutes: 660 }))).toContain('long')
    // 2.5 hours: 150 pages
    expect(ticks(read('short-listen', '2026-03-01', { formats: ['audiobook'], minutes: 150 }))).toContain('short')
    // no length at all: no page square
    const none = ticks(read('unknown', '2026-03-01', { formats: ['storytel'] }))
    expect(none).not.toContain('short')
    expect(none).not.toContain('long')
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

describe('a new card when one is full (#119)', () => {
  const feb = everything('2026-02', 'a')

  it('starts a new card once all 16 squares are ticked', () => {
    const b = bingoYear(feb, 2026, '2026-02-28')
    expect(b.finished.length).toBeGreaterThanOrEqual(1)
    expect(b.finished[0].card).toBe(1)
    expect(b.card).toBe(b.finished.length + 1)
    // remembered on the book whose finish filled it
    expect(b.toRemember[0].bookId).toBe(b.finished[0].endsAt.split('|')[1])
  })

  it('a new card only counts books finished after the last one was full', () => {
    const b = bingoYear(feb, 2026, '2026-02-28')
    const end = b.finished.at(-1)!.endsAt
    const lastFinish = [...feb.flatMap((x) => x.finished ?? [])].filter((d) => d.startsWith('2026')).sort().at(-1)!
    if (end.slice(0, 10) === lastFinish) expect(b.squares.every((s) => !s.ticked)).toBe(true)
    // a whole new month of reading fills the next card too
    const more = bingoYear([...feb, ...everything('2026-03', 'b')], 2026, '2026-03-31')
    expect(more.finished.length).toBeGreaterThan(b.finished.length)
  })

  it('is the same on every device, whatever order the books come in', () => {
    const shelf = [...feb, ...everything('2026-03', 'b')]
    const one = bingoYear(shelf, 2026, '2026-04-01')
    const other = bingoYear([...shelf].reverse(), 2026, '2026-04-01')
    expect(other.finished).toEqual(one.finished)
    expect(other.card).toBe(one.card)
    expect(other.squares.map((s) => [s.id, s.ticked])).toEqual(one.squares.map((s) => [s.id, s.ticked]))
  })

  it('a remembered card stays full when an old book changes', () => {
    const b = bingoYear(feb, 2026, '2026-02-28')
    const remembered = feb.map((x) => {
      const r = b.toRemember.filter((t) => t.bookId === x.id)
      return r.reduce((acc, t) => ({ ...acc, ...rememberCard(acc, t.card) }), x)
    })
    // her stars change afterwards: the 5-star square no longer has a book
    const unrated = remembered.map((x) => ({ ...x, rating: undefined }))
    const after = bingoYear(unrated, 2026, '2026-02-28')
    expect(after.finished.map((c) => c.endsAt)).toEqual(b.finished.map((c) => c.endsAt))
    expect(after.toRemember).toEqual([])
    // without remembering it, the first card would be open again
    expect(bingoYear(feb.map((x) => ({ ...x, rating: undefined })), 2026, '2026-02-28').finished.length).toBe(0)
  })

  it('merging duplicates keeps a remembered card', () => {
    const b = bingoYear(feb, 2026, '2026-02-28')
    const host = feb.find((x) => x.id === b.toRemember[0].bookId)!
    const withCard = { ...host, ...rememberCard(host, b.toRemember[0].card) }
    expect(mergeBooks(book('copy'), withCard).bingoCards).toEqual(withCard.bingoCards)
    expect(mergeBooks(withCard, book('copy')).bingoCards).toEqual(withCard.bingoCards)
  })

  it('shows the number of full cards in the year in review', () => {
    expect(yearReview(feb, 2026, '2026-02-28').bingoCards).toBeGreaterThanOrEqual(1)
    expect(yearReview(feb, 2025, '2026-02-28').bingoCards).toBe(0)
  })
})

describe('squares that stay open swap (#119)', () => {
  // a card in 2027 with one book: most squares stay open
  const shelf = [read('x', '2027-01-05', { pages: 150 })]

  it('keeps the squares for the first month', () => {
    const b = bingoYear(shelf, 2027, '2027-01-30')
    expect(b.squares.map((s) => s.id)).toEqual(cardSquares(2027, 1).squares)
  })

  it('swaps every open square a month after the card started, and leaves ticked ones', () => {
    const before = bingoYear(shelf, 2027, '2027-01-30').squares
    const after = bingoYear(shelf, 2027, '2027-01-31').squares
    after.forEach((s, i) => {
      if (before[i].ticked) expect(s.id).toBe(before[i].id)
      else if (!s.ticked) expect(s.id).not.toBe(before[i].id)
    })
    expect(new Set(after.map((s) => s.id)).size).toBe(16)
  })

  it("doesn't swap this year's card before swapping was added", () => {
    const b = bingoYear([read('y', '2026-01-05', { pages: 150 })], 2026, '2026-11-20')
    expect(b.squares.map((s) => s.id)).toEqual(cardSquares(2026, 1).squares)
  })
})

describe('Same author twice counts the whole year (T-0017, Hanna 2026-11-21)', () => {
  // card 1 of 2026, filled in February; every author but the saga's and the new writer's appears once
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
  const sameAuthor = (shelf: Book[]) => {
    const b = bingoYear(shelf, 2026, '2026-04-30')
    expect(b.card).toBe(2)
    return b.squares.find((s) => s.id === 'sameauthor')!
  }

  it('card 1 fills, and card 2 has the square open', () => {
    expect(cardSquares(2026, 2).squares).toContain('sameauthor')
    expect(sameAuthor(card1).ticked).toBe(false)
  })

  it('ticks card 2 with another book by an author finished on card 1', () => {
    const sq = sameAuthor([...card1, read('listen2', '2026-04-01', { authors: ['Listen Writer'] })])
    expect(sq.ticked).toBe(true)
    expect(sq.book!.id).toBe('listen2')
  })

  it('does not tick for an author finished only last year', () => {
    const shelf = [
      ...card1,
      read('old', '2025-06-01', { authors: ['Old Writer'] }),
      read('old2', '2026-04-01', { authors: ['Old Writer'] }),
    ]
    expect(sameAuthor(shelf).ticked).toBe(false)
  })

  it('does not tick for the same book finished twice', () => {
    const twice = card1.map((b) =>
      b.id === 'space' ? { ...b, readCount: 2, finished: [d(13), '2026-04-01'] } : b,
    )
    expect(sameAuthor(twice).ticked).toBe(false)
  })

  it('still ticks with two books by one author on one card', () => {
    const shelf = [
      ...card1,
      read('fresh1', '2026-04-01', { authors: ['Fresh Writer'] }),
      read('fresh2', '2026-04-05', { authors: ['Fresh Writer'] }),
    ]
    const sq = sameAuthor(shelf)
    expect(sq.ticked).toBe(true)
    expect(sq.book!.id).toBe('fresh2')
  })
})
