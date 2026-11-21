import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { challengeBooks, cleanChallenges, ruleOptions, ruleText } from './ownChallenges'
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
