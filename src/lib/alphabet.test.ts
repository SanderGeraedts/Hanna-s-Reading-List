import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { alphabetYear, authorLetters, letterOf, pickLetter } = await import('./alphabet')

const book = (id: string, title: string, extra: Partial<Book> = {}): Book => ({
  id,
  title,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})
const read = (id: string, title: string, day: string, extra: Partial<Book> = {}) =>
  book(id, title, { status: 'read', finished: [day], readCount: 1, ...extra })

describe('A–Z challenge (#143)', () => {
  it('uses the exact title: "The Adventures of Gulliver" is T', () => {
    expect(letterOf('The Adventures of Gulliver')).toBe('T')
    expect(letterOf('A Court of Thorns and Roses')).toBe('A')
    expect(letterOf('De avonden')).toBe('D')
  })

  it('skips only what is not a letter, and reads accents as the plain letter', () => {
    expect(letterOf('‘Salem’s Lot')).toBe('S')
    expect(letterOf('"Quiet"')).toBe('Q')
    expect(letterOf('Ärger im Bus')).toBe('A')
    expect(letterOf('Één dag')).toBe('E')
    expect(letterOf('1984')).toBeUndefined()
    expect(letterOf('')).toBeUndefined()
  })

  it('counts the first book finished that year for each letter', () => {
    const y = alphabetYear(
      [
        read('t1', 'The Hobbit', '2026-02-01'),
        read('t2', 'Twilight', '2026-01-10'),
        read('old', 'Anna Karenina', '2025-05-01'),
        read('g', 'The Adventures of Gulliver', '2026-03-01'),
      ],
      2026,
      '2026-06-01',
    )
    expect([...y.done.keys()]).toEqual(['T'])
    expect(y.done.get('T')!.book.id).toBe('t2')
  })

  it("doesn't count sleep reads, not even their first read", () => {
    const y = alphabetYear([read('s', 'Sleepy Stories', '2026-02-01', { sleepRead: true })], 2026, '2026-06-01')
    expect(y.done.size).toBe(0)
  })

  it('says whether she is on track for the year', () => {
    const letters = 'ABCDEFGHIJKLM'.split('').map((l, i) => read(l, `${l} book`, `2026-0${1 + (i % 6)}-01`))
    // 13 letters by 1 July: halfway through the year, halfway through the alphabet
    expect(alphabetYear(letters, 2026, '2026-07-01')).toMatchObject({ onTrack: true, pace: '13 of 26 · on track' })
    // 13 letters in November: 13 to go in 2 months
    const late = alphabetYear(letters, 2026, '2026-11-16')
    expect(late.onTrack).toBe(false)
    expect(late.pace).toBe('13 of 26 · behind: 6.5 letters a month to go')
  })

  it('suggests a book from her pile for missing letters, by its exact title', () => {
    const y = alphabetYear(
      [
        book('q', 'Quicksilver', { status: 'want' }),
        book('t', 'The Queen of Nothing', { status: 'want' }),
        book('z', 'Zodiac', { status: 'want', sleepRead: true }),
        book('soon', 'Xenia', { status: 'want', published: '2099-01-01' }),
      ],
      2026,
      '2026-06-01',
    )
    expect(y.tips.map((t) => `${t.letter}:${t.book.id}`)).toEqual(['Q:q', 'T:t'])
  })

  it('lists every book that counts for a letter, first finished first (#152)', () => {
    const y = alphabetYear(
      [read('t1', 'The Hobbit', '2026-02-01'), read('t2', 'Twilight', '2026-01-10'), read('t3', 'Tress', '2026-02-01')],
      2026,
      '2026-06-01',
    )
    expect(y.options.get('T')!.map((b) => b.id)).toEqual(['t2', 't1', 't3'])
    expect(y.done.get('T')).toMatchObject({ picked: false, day: '2026-01-10' })
  })

  it('shows the book Hanna picked for a letter, for that year and challenge only (#152)', () => {
    const books = [read('t1', 'The Hobbit', '2026-02-01'), read('t2', 'Twilight', '2026-01-10')]
    const patches = pickLetter(books, 'title', 2026, 'T', 't1')
    expect([...patches]).toEqual([['t1', { alphabetPicks: ['title:2026:T'] }]])
    const picked = books.map((b) => ({ ...b, ...patches.get(b.id) }))
    expect(alphabetYear(picked, 2026, '2026-06-01').done.get('T')).toMatchObject({ picked: true, day: '2026-02-01' })
    expect(alphabetYear(picked, 2026, '2026-06-01').done.get('T')!.book.id).toBe('t1')
    // another pick for T lets go of the first; other picks on the book stay
    const twice = picked.map((b) => (b.id === 't1' ? { ...b, alphabetPicks: ['title:2026:T', 'author:2026:J'] } : b))
    expect([...pickLetter(twice, 'title', 2026, 'T', 't2')]).toEqual([
      ['t1', { alphabetPicks: ['author:2026:J'] }],
      ['t2', { alphabetPicks: ['title:2026:T'] }],
    ])
  })

  it('ignores a pick on a book that no longer counts for that letter', () => {
    const y = alphabetYear(
      [read('t1', 'The Hobbit', '2026-02-01', { alphabetPicks: ['title:2026:A'] }), read('a', 'Atlas', '2026-03-01')],
      2026,
      '2026-06-01',
    )
    expect(y.done.get('A')!.book.id).toBe('a')
  })
})

describe('A–Z authors (#151)', () => {
  it('counts the first name and the surname', () => {
    expect(authorLetters('Sarah J. Maas')).toEqual(['S', 'M'])
    expect(authorLetters('Rebecca Yarros')).toEqual(['R', 'Y'])
    expect(authorLetters('Stephen King')).toEqual(['S', 'K'])
    expect(authorLetters('Sally Rooney')).toEqual(['S', 'R'])
    expect(authorLetters('Homer')).toEqual(['H'])
    expect(authorLetters('Émile Zola')).toEqual(['E', 'Z'])
    expect(authorLetters('')).toEqual([])
  })

  it('lights up both letters of every author of a finished book', () => {
    const y = alphabetYear(
      [
        read('acotar', 'A Court of Thorns and Roses', '2026-02-01', { authors: ['Sarah J. Maas'] }),
        read('duo', 'Good Omens', '2026-03-01', { authors: ['Terry Pratchett', 'Neil Gaiman'] }),
        read('sleep', 'Sleepy', '2026-03-01', { authors: ['Xavier Quinn'], sleepRead: true }),
      ],
      2026,
      '2026-06-01',
      'author',
    )
    expect([...y.done.keys()]).toEqual(['G', 'M', 'N', 'P', 'S', 'T'])
    expect(y.done.get('M')!.book.id).toBe('acotar')
  })

  it("keeps an author pick apart from a title pick", () => {
    const b = read('a', 'Maybe Someday', '2026-02-01', { authors: ['Colleen Hoover'], alphabetPicks: ['title:2026:M'] })
    const other = read('b', 'Middlemarch', '2026-01-01', { authors: ['George Eliot'] })
    expect(alphabetYear([b, other], 2026, '2026-06-01').done.get('M')!.book.id).toBe('a')
    expect(alphabetYear([b, other], 2026, '2026-06-01', 'author').done.has('M')).toBe(false)
  })

  it('suggests a book from her pile by its author', () => {
    const y = alphabetYear([book('w', 'Iron Flame', { authors: ['Rebecca Yarros'] })], 2026, '2026-06-01', 'author')
    expect(y.tips.map((t) => `${t.letter}:${t.book.id}`)).toEqual(['R:w', 'Y:w'])
  })
})

describe('A–Z tips follow the series order (D-0025, T-0017)', () => {
  const s = (n: number, title: string, extra: Partial<Book> = {}) =>
    book(`s${n}`, title, { series: 'Saga', seriesIndex: n, authors: ['Saga Writer'], ...extra })
  const tipFor = (books: Book[], letter: string) =>
    alphabetYear(books, 2026, '2026-11-21').tips.find((t) => t.letter === letter)?.book.id

  it('never tips book 3 while book 2 is unread or missing', () => {
    expect(tipFor([s(1, 'Alpha', { status: 'read' }), s(2, 'Beta'), s(3, 'Xenon')], 'X')).toBeUndefined()
    expect(tipFor([s(1, 'Alpha', { status: 'read' }), s(3, 'Xenon')], 'X')).toBeUndefined()
  })

  it('tips book 3 once book 2 is read', () => {
    expect(tipFor([s(1, 'Alpha', { status: 'read' }), s(2, 'Beta', { status: 'read' }), s(3, 'Xenon')], 'X')).toBe('s3')
  })

  it('still tips a book she is reading or has paused, ahead of want books', () => {
    const shelf = [book('w', 'Zebra'), book('r', 'Zed', { status: 'reading' }), book('p', 'Quiet', { status: 'paused' })]
    expect(tipFor(shelf, 'Z')).toBe('r')
    expect(tipFor(shelf, 'Q')).toBe('p')
    // a paused book 3 of a series is still a tip: she is already at it
    expect(tipFor([s(1, 'Alpha', { status: 'read' }), s(3, 'Xenon', { status: 'paused' })], 'X')).toBe('s3')
  })
})
