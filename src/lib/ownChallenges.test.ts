import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { PILE_CHALLENGE, challengeBooks, cleanChallenges, ruleOptions, ruleText } from './ownChallenges'
import type { OwnChallenge } from './ownChallenges'

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A. Writer'],
  color: '#335577',
  status: 'read',
  addedAt: new Date(2027, 2, 1).getTime(),
  finished: ['2027-05-01'],
  ...extra,
})

const challenge = (extra: Partial<OwnChallenge>): OwnChallenge => ({
  id: 'c1',
  name: 'Mine',
  target: 3,
  year: 2027,
  rule: 'any',
  ...extra,
})

describe('her own challenges', () => {
  it('counts books finished in its year, never sleep reads', () => {
    const books = [
      book('a'),
      book('b', { finished: ['2026-12-31'] }),
      book('c', { sleepRead: true }),
      book('d', { status: 'reading', finished: undefined }),
    ]
    expect(challengeBooks(challenge({}), books).map((b) => b.id)).toEqual(['a'])
  })

  it('from my pile: only books on the shelf before the year began', () => {
    const books = [book('old', { addedAt: new Date(2026, 5, 1).getTime() }), book('new')]
    expect(challengeBooks(challenge({ rule: 'pile' }), books).map((b) => b.id)).toEqual(['old'])
  })

  it('by genre, language and format', () => {
    const books = [
      book('f', { genres: ['Fantasy'], language: 'nl', formats: ['hardcover'] }),
      book('r', { genres: ['Romance'], language: 'en', formats: ['audiobook'] }),
    ]
    expect(challengeBooks(challenge({ rule: 'genre', value: 'Fantasy' }), books).map((b) => b.id)).toEqual(['f'])
    expect(challengeBooks(challenge({ rule: 'language', value: 'en' }), books).map((b) => b.id)).toEqual(['r'])
    expect(challengeBooks(challenge({ rule: 'format', value: 'hardcover' }), books).map((b) => b.id)).toEqual(['f'])
    expect(ruleOptions('genre', books).map((o) => o.value)).toEqual(['Fantasy', 'Romance'])
    expect(ruleText(challenge({ rule: 'genre', value: 'Fantasy' }), books)).toBe('Fantasy books')
  })

  it('cleans a saved list: bad entries dropped, values only where needed', () => {
    const list = cleanChallenges([
      { id: 'ok', name: '  Fantasy ', target: 5, year: 2027, rule: 'genre', value: 'Fantasy' },
      { id: 'ok', name: 'twice', target: 5, year: 2027, rule: 'any' },
      { id: 'n', name: 'no value', target: 5, year: 2027, rule: 'genre' },
      { id: 'z', name: 'zero', target: 0, year: 2027, rule: 'any' },
      { id: 'p', name: 'Pile', target: 2, year: 2027, rule: 'pile', value: 'ignored' },
      'junk',
    ])
    expect(list).toEqual([
      { id: 'ok', name: 'Fantasy', target: 5, year: 2027, rule: 'genre', value: 'Fantasy' },
      { id: 'p', name: 'Pile', target: 2, year: 2027, rule: 'pile' },
    ])
    expect(cleanChallenges(null)).toEqual([])
  })
})

describe('the Pile challenge button (T-0014)', () => {
  it('fills in "Pile challenge", From my pile, 12 books until reached, which saves as a valid challenge', () => {
    // until she reaches the goal since T-0131 (D-0099)
    expect(PILE_CHALLENGE).toEqual({ name: 'Pile challenge', target: 12, rule: 'pile', untilDone: true })
    const saved = { id: 'pile1', year: 2026, ...PILE_CHALLENGE }
    expect(cleanChallenges([saved])).toEqual([saved])
  })
})

describe('the saved shape after D-0066: new fields are optional and left out when they are the default', () => {
  const old = { id: 'old1', name: 'Fantasy year', target: 5, year: 2026, rule: 'genre' as const, value: 'Fantasy' }

  it('keeps a challenge saved before the new rules byte for byte', () => {
    expect(cleanChallenges([old])).toEqual([old])
    expect(Object.keys(cleanChallenges([old])[0])).toEqual(['id', 'name', 'target', 'year', 'rule', 'value'])
  })

  it('keeps a pages or hours unit and never writes "books"', () => {
    expect(cleanChallenges([{ ...old, unit: 'pages' }])[0]).toMatchObject({ unit: 'pages' })
    expect(cleanChallenges([{ ...old, unit: 'hours' }])[0]).toMatchObject({ unit: 'hours' })
    expect(cleanChallenges([{ ...old, unit: 'books' }])[0]).not.toHaveProperty('unit')
    expect(cleanChallenges([{ ...old, unit: 'nonsense' }])[0]).not.toHaveProperty('unit')
  })

  it('keeps a good second rule and drops a bad one without dropping the challenge', () => {
    expect(cleanChallenges([{ ...old, and: 'author', andValue: 'Sarah J. Maas' }])[0]).toMatchObject({
      and: 'author',
      andValue: 'Sarah J. Maas',
    })
    expect(cleanChallenges([{ ...old, and: 'rating4' }])[0]).toMatchObject({ and: 'rating4' })
    for (const bad of [
      { and: 'any' },
      { and: 'finishseries', andValue: 'x' },
      { and: 'genre', andValue: 'Fantasy' }, // the same rule with the same value
      { and: 'author' }, // needs a value
      { and: 'nonsense', andValue: 'x' },
    ]) {
      const got = cleanChallenges([{ ...old, ...bad }])
      expect(got).toHaveLength(1)
      expect(got[0]).not.toHaveProperty('and')
      expect(got[0]).not.toHaveProperty('andValue')
    }
  })

  it('a challenge whose own rule it does not know is dropped, as it always was', () => {
    expect(cleanChallenges([{ ...old, rule: 'from-the-future' }])).toEqual([])
  })

  it('allows 500 books but 100000 pages and hours, and refuses the rest', () => {
    expect(cleanChallenges([{ ...old, target: 500 }])).toHaveLength(1)
    expect(cleanChallenges([{ ...old, target: 501 }])).toHaveLength(0)
    expect(cleanChallenges([{ ...old, target: 100_000, unit: 'pages' }])).toHaveLength(1)
    expect(cleanChallenges([{ ...old, target: 100_001, unit: 'pages' }])).toHaveLength(0)
    expect(cleanChallenges([{ ...old, target: 2000, unit: 'hours' }])).toHaveLength(1)
    for (const target of [0, -1, 1.5]) expect(cleanChallenges([{ ...old, target }])).toHaveLength(0)
  })

  it('round-trips through JSON unchanged', () => {
    const list = cleanChallenges([{ ...old, unit: 'pages', target: 2000, and: 'rating4' }])
    expect(JSON.parse(JSON.stringify(list))).toEqual(list)
    expect(cleanChallenges(JSON.parse(JSON.stringify(list)))).toEqual(list)
  })

  it('keeps a finishseries challenge and drops one with no series', () => {
    const pick = { id: 'p1', name: 'Throne of Glass', target: 8, year: 2026, rule: 'finishseries' as const, value: 'throne of glass' }
    expect(cleanChallenges([pick])).toEqual([pick])
    expect(cleanChallenges([{ ...pick, value: '' }])).toEqual([])
  })
})
