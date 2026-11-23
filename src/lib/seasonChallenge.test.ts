import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { holdsWord, matchesSeason, seasonChallenge, seasonsDone } from './seasonChallenge'

/** Seasonal (T-0091, D-0061 §2). */

const book = (id: string, day: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A. Writer'],
  color: '#888888',
  status: 'read',
  readCount: 1,
  addedAt: 0,
  finished: [day],
  ...extra,
})

const of = (list: ReturnType<typeof seasonChallenge>, season: string) => list.find((s) => s.season === season)!

describe('seasonal: which season a finish falls in', () => {
  it('holds the season boundaries', () => {
    const autumnStart = book('a', '2026-09-01', { genres: ['Horror'] })
    const autumnEnd = book('b', '2026-11-30', { genres: ['Horror'] })
    const winterStart = book('c', '2026-12-01', { genres: ['Fantasy'] })
    const list = seasonChallenge([autumnStart, autumnEnd, winterStart], 2026, '2026-12-05')
    expect(of(list, 'autumn').done).toBe(2)
    expect(of(list, 'winter').done).toBe(1)
    // 28 February is winter of its own year's card
    const late = seasonChallenge([book('d', '2027-02-28', { genres: ['Fantasy'] })], 2027, '2027-03-01')
    expect(of(late, 'winter').done).toBe(1)
  })

  it('takes 29 February in a leap year and ignores one that never happened', () => {
    const leap = seasonChallenge([book('leap', '2028-02-29', { genres: ['Fantasy'] })], 2028, '2028-03-01')
    expect(of(leap, 'winter').done).toBe(1)
    const nonsense = seasonChallenge([book('bad', '2027-02-29', { genres: ['Fantasy'] })], 2027, '2027-03-01')
    expect(nonsense.every((s) => s.done === 0)).toBe(true)
  })
})

describe('seasonal: what counts', () => {
  it('matches a genre and a trope, folded, and only whole words', () => {
    expect(matchesSeason(book('g', '2026-04-01', { genres: ['Romance'] }), 'spring')).toBe(true)
    expect(matchesSeason(book('t', '2026-07-01', { tropes: ['One Bed'] }), 'summer')).toBe(true)
    expect(matchesSeason(book('mix', '2026-04-01', { genres: ['Historical romance'] }), 'spring')).toBe(true)
    // "Romantasy" is not "romance"
    expect(matchesSeason(book('no', '2026-04-01', { genres: ['Romantasy'] }), 'spring')).toBe(false)
    expect(holdsWord('Historical Romance', 'romance')).toBe(true)
    expect(holdsWord('Romantasy', 'romance')).toBe(false)
  })

  it('counts a book that matches two of a season words once', () => {
    const b = book('two', '2026-10-01', { genres: ['Horror', 'Thriller'], tropes: ['Locked room'] })
    expect(of(seasonChallenge([b], 2026, '2026-11-01'), 'autumn').done).toBe(1)
  })

  it('needs 3 in autumn and 5 in summer', () => {
    const autumn = (n: number) => Array.from({ length: n }, (_, i) => book(`a${i}`, `2026-10-0${i + 1}`, { genres: ['Horror'] }))
    expect(of(seasonChallenge(autumn(2), 2026, '2026-11-01'), 'autumn').complete).toBe(false)
    expect(of(seasonChallenge(autumn(3), 2026, '2026-11-01'), 'autumn').complete).toBe(true)
    const summer = Array.from({ length: 6 }, (_, i) => book(`s${i}`, `2026-07-0${i + 1}`, { genres: ['Romance'] }))
    const s = of(seasonChallenge(summer, 2026, '2026-11-01'), 'summer')
    expect([s.done, s.target, s.complete]).toEqual([6, 5, true])
  })

  it('counts seasons completed out of four, and marks the season happening now', () => {
    const shelf = [
      ...Array.from({ length: 3 }, (_, i) => book(`a${i}`, `2026-10-0${i + 1}`, { genres: ['Horror'] })),
      ...Array.from({ length: 3 }, (_, i) => book(`w${i}`, `2026-01-0${i + 1}`, { genres: ['Fantasy'] })),
    ]
    const list = seasonChallenge(shelf, 2026, '2026-11-23')
    expect(seasonsDone(list)).toBe(2)
    expect(of(list, 'autumn').current).toBe(true)
    expect(list.filter((s) => s.current)).toHaveLength(1)
    // a past year has no current season
    expect(seasonChallenge(shelf, 2026, '2027-11-23').some((s) => s.current)).toBe(false)
  })

  it('leaves out sleep reads and an empty shelf gives four rows at zero', () => {
    const sleep = book('sleep', '2026-10-01', { genres: ['Horror'], sleepRead: true })
    expect(of(seasonChallenge([sleep], 2026, '2026-11-01'), 'autumn').done).toBe(0)
    const empty = seasonChallenge([], 2026, '2026-11-01')
    expect(empty).toHaveLength(4)
    expect(empty.every((s) => s.done === 0 && !s.complete)).toBe(true)
  })
})
