import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { searchShelf } from './search'
import { grantWish, wishOptions, wishScore } from './wish'
import { badges } from './badges'
import { challengeBooks, cleanChallenges, ruleOptions, ruleText } from './ownChallenges'
import type { OwnChallenge } from './ownChallenges'
import { cleanLayout } from './dashboardLayout'

/** T-0048 / D-0042: the six places tropes and characters are used. */

const book = (over: Partial<Book> = {}): Book =>
  ({ id: 'b', title: 'Title', authors: ['Writer'], color: '#000', status: 'want', addedAt: 1, ...over }) as Book

const read = (over: Partial<Book> = {}): Book =>
  book({ status: 'read', readCount: 1, finished: ['2026-05-01'], ...over })

describe('shelf search', () => {
  const shelf = [
    book({ id: '1', title: 'One', tropes: ['Enemies to lovers'] }),
    book({ id: '2', title: 'Two', characters: [{ name: 'Feyre', fav: true }] }),
    book({ id: '3', title: 'Three' }),
  ]

  it('finds a book by its trope, with the trope as the hint', () => {
    const hits = searchShelf(shelf, 'enemies')
    expect(hits.map((h) => h.book.id)).toEqual(['1'])
    expect(hits[0].hint).toBe('Enemies to lovers')
  })

  it('finds a book by a character, with the character as the hint', () => {
    const hits = searchShelf(shelf, 'feyre')
    expect(hits.map((h) => h.book.id)).toEqual(['2'])
    expect(hits[0].hint).toBe('Character: Feyre')
  })

  it('leaves a book with neither out', () => {
    expect(searchShelf(shelf, 'enemies').some((h) => h.book.id === '3')).toBe(false)
  })
})

describe('make a wish', () => {
  const choices = [
    book({ id: '1', tropes: ['Enemies to lovers'] }),
    book({ id: '2', tropes: ['enemies to lovers'] }),
    book({ id: '3', tropes: ['Found family'] }),
  ]

  it('offers the tropes of the books she could read next, most common first', () => {
    expect(wishOptions(choices).tropes).toEqual(['Enemies to lovers', 'Found family'])
  })

  it('offers none when nothing she could read next has a trope', () => {
    expect(wishOptions([book({ id: 'x' })]).tropes).toEqual([])
  })

  it('counts a trope wish, whatever the case', () => {
    expect(wishScore(choices[1], { trope: 'Enemies to lovers' })).toEqual({ met: 1, of: 1 })
    expect(wishScore(choices[2], { trope: 'Enemies to lovers' })).toEqual({ met: 0, of: 1 })
  })

  it('grants only books with the trope when some have it', () => {
    const granted = grantWish(choices, choices, { trope: 'Enemies to lovers' }, { random: () => 0 })
    expect(granted.exact).toBe(true)
    expect(granted.books.every((g) => g.book.id !== '3')).toBe(true)
  })
})

describe('trope badges', () => {
  const withTrope = (n: number, trope = 'Enemies to lovers') =>
    Array.from({ length: n }, (_, i) =>
      read({ id: `b${i}`, title: `B${i}`, tropes: [i % 2 ? trope.toUpperCase() : trope], finished: [`2026-01-0${(i % 9) + 1}`] }),
    )
  const find = (books: Book[], id: string) => badges(books, '2026-12-31').find((b) => b.id === id)!

  it('is earned at 5 different books with the same trope, whatever the case', () => {
    expect(find(withTrope(4), 'trope-5').earned).toBe(false)
    expect(find(withTrope(4), 'trope-5').progress).toEqual({ done: 4, goal: 5 })
    const earned = find(withTrope(5), 'trope-5')
    expect(earned.earned).toBe(true)
    expect(earned.how).toContain('Enemies to lovers')
  })

  it('does not move on when one book is read again', () => {
    const books = [read({ id: 'a', tropes: ['Found family'], readCount: 9, finished: ['2026-01-01', '2026-02-01', '2026-03-01'] })]
    expect(find(books, 'trope-5').progress).toEqual({ done: 1, goal: 5 })
  })

  it('is bronze, silver and gold by its step (D-0038)', () => {
    const all = badges([], '2026-12-31')
    expect(all.find((b) => b.id === 'trope-5')!.tier).toBe('bronze')
    expect(all.find((b) => b.id === 'trope-10')!.tier).toBe('silver')
    expect(all.find((b) => b.id === 'trope-25')!.tier).toBe('gold')
  })

  it('stays locked with no tropes anywhere', () => {
    expect(find([read({ id: 'a' })], 'trope-5').earned).toBe(false)
  })
})

describe('her own challenges', () => {
  const challenge: OwnChallenge = { id: 'c1', name: 'Enemies', target: 5, year: 2026, rule: 'trope', value: 'Enemies to lovers' }

  it('counts a finished book of the year with that trope, whatever the case', () => {
    const books = [
      read({ id: '1', tropes: ['ENEMIES TO LOVERS'] }),
      read({ id: '2', tropes: ['Found family'] }),
      read({ id: '3', tropes: ['Enemies to lovers'], finished: ['2025-05-01'] }),
    ]
    expect(challengeBooks(challenge, books).map((b) => b.id)).toEqual(['1'])
  })

  it('offers the tropes on her shelf, and reads as "… books"', () => {
    const books = [book({ id: '1', tropes: ['Slow burn', 'Enemies to lovers'] })]
    expect(ruleOptions('trope', books).map((o) => o.value)).toEqual(['Enemies to lovers', 'Slow burn'])
    expect(ruleText(challenge, books)).toBe('Enemies to lovers books')
  })

  it('keeps a trope rule and still drops a rubbish one', () => {
    expect(cleanChallenges([challenge])).toEqual([challenge])
    expect(cleanChallenges([{ ...challenge, value: '' }])).toEqual([])
    expect(cleanChallenges([{ ...challenge, rule: 'nonsense' }])).toEqual([])
  })
})

describe('the dashboard layout', () => {
  it('drops Tropes & characters from a saved layout: it lives on the Stats page now (T-0121)', () => {
    const saved = {
      sections: {
        today: [['waiting'], []],
        challenges: [[], []],
        stats: [[], []],
        fun: [['badges', 'fact'], ['covers']],
      },
      hidden: [],
      folded: [],
      favourites: [],
    }
    const layout = cleanLayout(saved)
    const all = Object.values(layout.sections).flat(2)
    expect(all).not.toContain('tropes')
    expect(all).not.toContain('badges')
    // what is still on the dashboard joins Today, in the same column
    expect(layout.sections.fun).toEqual([[], []])
    expect(layout.sections.today[0]).toContain('fact')
  })
})
