import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { challengeRings, completedChallenges } from './challengeRings'
import { challengeBooks, challengeDone, cleanChallenges, doneText, ruleText } from './ownChallenges'
import type { OwnChallenge } from './ownChallenges'
import { minutesByDay, minutesMonth, minutesYear } from './minutesChallenge'
import { seasonChallenge } from './seasonChallenge'
import { worldCountries } from './worldChallenge'
import { seriesRows } from './seriesChallenge'
import { bingoSwaps } from './bingoSwap'
import { cardSquares, forCard } from './bingo'

/**
 * The tester trying to break the challenges (T-0090 … T-0093): nonsense in
 * every input, the edges of every number, and the cases the tasks name.
 */

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

const TODAY = '2026-11-23'

describe('nonsense in, no crash out', () => {
  it('takes a book with no fields a challenge wants', () => {
    const bare: Book = { id: 'bare', title: '', authors: [], color: '#000000', status: 'read', addedAt: 0 }
    expect(() => challengeRings({ books: [bare], year: 2026, goal: 1, today: TODAY })).not.toThrow()
    expect(() => worldCountries([bare], 2026)).not.toThrow()
    expect(() => seasonChallenge([bare], 2026, TODAY)).not.toThrow()
    expect(() => minutesYear([bare], 2026, TODAY)).not.toThrow()
    expect(() => seriesRows([], [bare], 2026)).not.toThrow()
  })

  it('takes a broken reading log', () => {
    const broken = book('b', {
      pages: 300,
      readingLog: { '2026-13-45': 0.5, 'not a day': 1, '2026-02-30': 1, '2026-03-01': -5, '2026-03-02': 0 } as Record<string, number>,
    })
    const got = minutesByDay([broken])
    expect([...got.keys()]).toEqual([])
  })

  it('takes a finish day that is not a day', () => {
    const odd = book('odd', { finished: ['2026', 'nonsense', '2026-02-30'] })
    expect(() => seasonChallenge([odd], 2026, TODAY)).not.toThrow()
    expect(seasonChallenge([odd], 2026, TODAY).every((s) => s.done === 0)).toBe(true)
  })

  it('takes a year nothing happened in', () => {
    expect(challengeRings({ books: [book('a')], year: 1999, goal: null, today: TODAY })).toEqual([])
    // every day of 1999 has happened and none of them reached the target
    expect(minutesYear([book('a')], 1999, TODAY)).toMatchObject({ done: 0, complete: false })
  })
})

describe('the edges of the numbers', () => {
  it('caps the list at 50 challenges', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ id: `c${i}`, name: `C${i}`, target: 1, year: 2026, rule: 'any' }))
    expect(cleanChallenges(many)).toHaveLength(50)
  })

  it('never lets a bar go past full, for any unit', () => {
    const shelf = [book('p', { pages: 900 }), book('l', { minutes: 6000, pages: 6000, format: 'audiobook', formats: ['audiobook'] })]
    for (const unit of ['pages', 'hours'] as const) {
      const c: OwnChallenge = { id: 'c', name: 'Tiny', target: 1, year: 2026, rule: 'any', unit }
      const done = challengeDone(c, challengeBooks(c, shelf))
      expect(done).toBeGreaterThan(1)
      expect(Math.min(1, done / c.target)).toBe(1)
    }
  })

  it('reads a goal of one page and one hour as a sentence', () => {
    expect(doneText({ id: 'c', name: 'n', target: 1, year: 2026, rule: 'any', unit: 'pages' }, 0)).toBe('0 of 1 pages')
    expect(doneText({ id: 'c', name: 'n', target: 1, year: 2026, rule: 'any', unit: 'hours' }, 1)).toBe('1 of 1 hours')
  })

  it('keeps the rule line readable when the value is gone from the shelf', () => {
    const c: OwnChallenge = { id: 'c', name: 'n', target: 1, year: 2026, rule: 'genre', value: 'A Genre She Deleted' }
    expect(ruleText(c, [])).toBe('A Genre She Deleted books')
    const author: OwnChallenge = { id: 'c', name: 'n', target: 1, year: 2026, rule: 'author', value: 'Gone Writer' }
    expect(ruleText(author, [])).toBe('Books by Gone Writer')
  })
})

describe('the cases the tasks name', () => {
  it('a month boundary and a leap day in one shelf', () => {
    const shelf = [
      book('p', {
        status: 'reading',
        readCount: 0,
        finished: [],
        pages: 300,
        readingLog: { '2028-01-31': 0.5, '2028-02-01': 0.5, '2028-02-29': 0.5, '2027-02-29': 0.5 },
      }),
    ]
    expect(minutesMonth(shelf, 2028, 1, '2028-12-31').reached).toBe(1)
    expect(minutesMonth(shelf, 2028, 2, '2028-12-31').reached).toBe(2)
    expect(minutesMonth(shelf, 2028, 2, '2028-12-31').days).toHaveLength(29)
    // the day that never was counts nowhere
    expect(minutesYear(shelf, 2027, '2027-12-31').done).toBe(0)
  })

  it('a series with one book, and a pick for a series that is gone', () => {
    const one = [book('only', { series: 'Only Ever', seriesIndex: 1 })]
    const pick: OwnChallenge = { id: 'p', name: 'Only Ever', target: 1, year: 2026, rule: 'finishseries', value: 'only ever' }
    const rows = seriesRows([pick], one, 2026)
    expect(rows[0]).toMatchObject({ done: 0, total: 1 })
    expect(rows[0].complete).toBe(false)
    expect(() => seriesRows([pick], [], 2026)).not.toThrow()
  })

  it('a trope she renames: the old spelling keeps counting, a new word does not', () => {
    const c: OwnChallenge = { id: 'c', name: 'n', target: 1, year: 2026, rule: 'trope', value: 'enemies to lovers' }
    expect(challengeBooks(c, [book('a', { tropes: ['Enemies to Lovers'] })])).toHaveLength(1)
    expect(challengeBooks(c, [book('a', { tropes: ['Rivals to lovers'] })])).toHaveLength(0)
  })

  it('an AND where nothing matches, in every unit', () => {
    const shelf = [book('a', { genres: ['Fantasy'], pages: 300 })]
    for (const unit of [undefined, 'pages', 'hours'] as const) {
      const c: OwnChallenge = {
        id: 'c',
        name: 'n',
        target: 5,
        year: 2026,
        rule: 'genre',
        value: 'Fantasy',
        and: 'language',
        andValue: 'nl',
        ...(unit && { unit }),
      }
      expect(challengeDone(c, challengeBooks(c, shelf))).toBe(0)
    }
  })

  it('a swap to a square the card already has is refused, on card 1 and on card 3', () => {
    for (const card of [1, 3]) {
      const plain = cardSquares(2026, card)
      const already = plain.squares[2]
      expect(cardSquares(2026, card, new Map([[5, already]]))).toEqual(plain)
    }
  })

  it('a swap log full of rubbish gives an empty map', () => {
    const rubbish = [
      { id: 'a', at: 1, kind: 'place', key: 'b:::' },
      { id: 'b', at: 2, kind: 'place', key: 'b:2026:1:0' },
      { id: 'c', at: 3, kind: 'place', key: 'b:2026:1:0', sq: 42 },
      { id: 'd', at: 4, kind: 'wear', key: 'b:2026:1:0', sq: 'long' },
      null,
      'nonsense',
    ] as unknown as Parameters<typeof bingoSwaps>[0]
    expect(() => bingoSwaps(rubbish)).not.toThrow()
    expect(bingoSwaps(rubbish).size).toBe(0)
    expect([...forCard(undefined, 2026, 1)]).toEqual([])
  })
})

describe('two challenges finished at once count as two', () => {
  it('lists both, so the medal counts both and the confetti still fires once', () => {
    const own: OwnChallenge[] = [
      { id: 'c1', name: 'One', target: 1, year: 2026, rule: 'any' },
      { id: 'c2', name: 'Two', target: 1, year: 2026, rule: 'any' },
    ]
    const done = completedChallenges({ books: [book('a')], own, today: TODAY })
    expect(done).toContain('2026:own:c1')
    expect(done).toContain('2026:own:c2')
  })
})
