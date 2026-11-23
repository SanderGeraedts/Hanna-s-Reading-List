import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { challengeBooks, challengeDone, cleanChallenges, doneText, ruleOptions, ruleText } from './ownChallenges'
import type { OwnChallenge } from './ownChallenges'

/** The rules, the units and the AND of her own challenges (T-0092, D-0062). */

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A. Writer'],
  color: '#888888',
  status: 'read',
  readCount: 1,
  addedAt: 0,
  finished: ['2026-03-01'],
  ...extra,
})

const challenge = (extra: Partial<OwnChallenge>): OwnChallenge => ({
  id: 'c1',
  name: 'Test',
  target: 5,
  year: 2026,
  rule: 'any',
  ...extra,
})

const idsOf = (c: OwnChallenge, books: Book[]) => challengeBooks(c, books).map((b) => b.id).sort()

describe('by author', () => {
  const shelf = [
    book('maas1', { authors: ['Sarah J. Maas'] }),
    book('maas2', { authors: [' sarah j. maas '] }),
    book('other', { authors: ['Someone Else', 'Sarah J. Maas'] }),
    book('none', { authors: [] }),
  ]

  it('is one author however it is spelled, and only the first author counts', () => {
    expect(idsOf(challenge({ rule: 'author', value: 'Sarah J. Maas' }), shelf)).toEqual(['maas1', 'maas2'])
  })

  it('offers each author once, in the spelling most of her books use', () => {
    expect(ruleOptions('author', shelf).map((o) => o.value)).toEqual(['Sarah J. Maas', 'Someone Else'])
  })
})

describe('from a decade', () => {
  const shelf = [
    book('a', { year: 1990 }),
    book('b', { year: 1999 }),
    book('c', { year: 1989 }),
    book('d', { year: 2000 }),
    book('e'),
    book('f', { published: '1995-06-01' }),
    book('g', { year: 1991, published: '2005-01-01' }),
  ]

  it('is the ten years from the decade, and a book with no year counts for none', () => {
    expect(idsOf(challenge({ rule: 'decade', value: '1990' }), shelf)).toEqual(['a', 'b', 'f', 'g'])
    expect(idsOf(challenge({ rule: 'decade', value: '1980' }), shelf)).toEqual(['c'])
    expect(idsOf(challenge({ rule: 'decade', value: '2000' }), shelf)).toEqual(['d'])
  })

  it('offers the decades her shelf has, newest first, labelled "1990s"', () => {
    expect(ruleOptions('decade', shelf)).toEqual([
      { value: '2000', label: '2000s' },
      { value: '1990', label: '1990s' },
      { value: '1980', label: '1980s' },
    ])
  })
})

describe('rated 4+', () => {
  it('takes 4 and 5, not 3, not none, and cleans a broken rating to 5 first', () => {
    const shelf = [book('four', { rating: 4 }), book('five', { rating: 5 }), book('three', { rating: 3 }), book('none'), book('broken', { rating: 6 })]
    // a 6 from a broken shelf is cleaned to 5 stars, so it counts; a 3 and no rating do not
    expect(idsOf(challenge({ rule: 'rating4' }), shelf)).toEqual(['broken', 'five', 'four'])
    expect(cleanChallenges([challenge({ rule: 'rating4' })])).toEqual([challenge({ rule: 'rating4' })])
  })
})

describe('a trope', () => {
  it('counts folded, so a trope she renamed the capitals of still counts', () => {
    const shelf = [book('a', { tropes: ['Enemies to Lovers'] }), book('b', { tropes: ['other'] })]
    expect(idsOf(challenge({ rule: 'trope', value: 'enemies to lovers' }), shelf)).toEqual(['a'])
  })

  it('counts nothing when she renames a trope to something genuinely different', () => {
    const shelf = [book('a', { tropes: ['Rivals to lovers'] })]
    const c = challenge({ rule: 'trope', value: 'Enemies to lovers' })
    expect(idsOf(c, shelf)).toEqual([])
    expect(challengeDone(c, challengeBooks(c, shelf))).toBe(0)
  })
})

describe('two rules with AND', () => {
  const shelf = [
    book('both', { genres: ['Fantasy'], authors: ['Sarah J. Maas'] }),
    book('genre', { genres: ['Fantasy'], authors: ['Someone Else'] }),
    book('author', { genres: ['Romance'], authors: ['Sarah J. Maas'] }),
  ]

  it('counts only the books both rules fit', () => {
    expect(idsOf(challenge({ rule: 'genre', value: 'Fantasy', and: 'author', andValue: 'Sarah J. Maas' }), shelf)).toEqual(['both'])
  })

  it('an AND that nothing matches is 0 of 5 with an empty list', () => {
    const c = challenge({ rule: 'genre', value: 'Fantasy', and: 'language', andValue: 'nl' })
    expect(challengeBooks(c, shelf)).toEqual([])
    expect(doneText(c, 0)).toBe('0 of 5')
  })

  it('reads as one sentence', () => {
    const books = shelf
    expect(ruleText(challenge({ rule: 'genre', value: 'Fantasy', and: 'author', andValue: 'Sarah J. Maas' }), books)).toBe(
      'Fantasy books by Sarah J. Maas',
    )
    expect(ruleText(challenge({ rule: 'genre', value: 'Fantasy', and: 'rating4' }), books)).toBe('Fantasy books you rated 4+')
    expect(ruleText(challenge({ rule: 'rating4' }), books)).toBe('Books you rated 4+')
    expect(ruleText(challenge({ rule: 'decade', value: '1990' }), books)).toBe('Books from the 1990s')
    expect(ruleText(challenge({ rule: 'author', value: 'Sarah J. Maas' }), books)).toBe('Books by Sarah J. Maas')
    // two halves that cannot share one "books" fall back to a dot
    expect(ruleText(challenge({ rule: 'pile', and: 'genre', andValue: 'Fantasy' }), books)).toBe(
      'Books on your shelf before 2026 · and fantasy books',
    )
  })
})

describe('the goal unit', () => {
  const listenOnly = (id: string, minutes: number) =>
    book(id, { minutes, pages: minutes, format: 'audiobook', formats: ['audiobook'] })

  it('adds up pages, a listen-only book bringing its minutes (D-0008)', () => {
    const shelf = [book('p', { pages: 300 }), listenOnly('l', 600)]
    const c = challenge({ rule: 'any', unit: 'pages', target: 2000 })
    expect(challengeDone(c, challengeBooks(c, shelf))).toBe(900)
    expect(doneText(c, 1250)).toBe('1,250 of 2,000 pages')
  })

  it('adds up hours from minutes only, and ignores a book with none', () => {
    const shelf = [listenOnly('l', 600), book('p', { pages: 300 })]
    const c = challenge({ rule: 'any', unit: 'hours', target: 20 })
    expect(challengeDone(c, challengeBooks(c, shelf))).toBe(10)
    expect(doneText(c, 9)).toBe('9 of 20 hours')
  })

  it('a pages goal of 1 is met by one book and never shows more than full', () => {
    const shelf = [book('p', { pages: 300 })]
    const c = challenge({ rule: 'any', unit: 'pages', target: 1 })
    const done = challengeDone(c, challengeBooks(c, shelf))
    expect(done).toBe(300)
    expect(Math.min(1, done / c.target)).toBe(1)
  })
})

describe('sleep reads never count, in any unit, with or without an AND', () => {
  it('leaves them out', () => {
    const shelf = [book('sleep', { pages: 300, genres: ['Fantasy'], sleepRead: true }), book('awake', { pages: 100, genres: ['Fantasy'] })]
    for (const unit of [undefined, 'pages', 'hours'] as const) {
      const c = challenge({ rule: 'genre', value: 'Fantasy', ...(unit && { unit }) })
      expect(idsOf(c, shelf)).toEqual(['awake'])
      const withAnd = challenge({ rule: 'genre', value: 'Fantasy', and: 'rating4', ...(unit && { unit }) })
      expect(challengeBooks(withAnd, shelf)).toEqual([])
    }
  })
})
