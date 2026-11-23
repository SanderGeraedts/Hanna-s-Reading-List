import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { addTrope, foldTrope, removeTrope, tropeCounts, tropeSuggestions, tropesOf } from './tropes'
import { addCharacter, favouriteCharacters, removeCharacter, toggleFavourite } from './characters'
import { searchShelf } from './search'
import { badges } from './badges'
import { wishOptions, wishScore } from './wish'
import { challengeBooks, ruleOptions, ruleText } from './ownChallenges'
import { tropesBlock } from '#/components/TropesCard'

/**
 * Tester, T-0048: gap tests. A shelf saved before these fields, rubbish input,
 * odd spellings and the empty block.
 */

/** a book exactly as a shelf saved before T-0048 holds it: no tropes, no characters */
const old = (over: Partial<Book> = {}): Book =>
  ({
    id: 'old',
    title: 'An Older Book',
    authors: ['Someone'],
    color: '#2e5a8a',
    status: 'read',
    readCount: 1,
    finished: ['2026-04-04'],
    pages: 300,
    addedAt: 1,
    ...over,
  }) as Book

describe('a shelf saved before the fields existed', () => {
  const shelf = [old(), old({ id: 'old2', title: 'Another' })]

  it('goes through every place that uses them without a change', () => {
    expect(tropesBlock(shelf).empty).toBe(true)
    expect(searchShelf(shelf, 'older').length).toBe(1)
    expect(wishOptions(shelf).tropes).toEqual([])
    expect(badges(shelf, '2026-12-31').find((b) => b.id === 'trope-5')!.earned).toBe(false)
    expect(ruleOptions('trope', shelf)).toEqual([])
    expect(tropeSuggestions(shelf).length).toBeGreaterThan(0)
    expect(challengeBooks({ id: 'c', name: 'x', target: 5, year: 2026, rule: 'trope', value: 'Slow burn' }, shelf)).toEqual([])
  })

  it('never grows an empty list on the book itself', () => {
    const b = old()
    const added = { ...b, ...addTrope(b, 'Slow burn', shelf)! }
    const back = { ...added, ...removeTrope(added, 'Slow burn') }
    // undefined is dropped by JSON, so the saved book is what it was
    expect(JSON.parse(JSON.stringify(back))).toEqual(JSON.parse(JSON.stringify(b)))
    expect(Object.hasOwn(JSON.parse(JSON.stringify(back)), 'tropes')).toBe(false)
  })

  it('treats a book saved mid-feature with empty lists like one with none', () => {
    const halfway = old({ tropes: [], characters: [] })
    expect(tropesBlock([halfway]).empty).toBe(true)
    expect(searchShelf([halfway], 'slow')).toEqual([])
    expect(favouriteCharacters([halfway])).toEqual([])
    expect(addTrope(halfway, 'Slow burn', [halfway])).toEqual({ tropes: ['Slow burn'] })
  })
})

describe('rubbish and odd input', () => {
  it('refuses a trope of nothing but spaces, tabs and newlines', () => {
    for (const typed of ['', '   ', '\t', '\n  \n']) expect(addTrope(old(), typed, [])).toBe(null)
  })

  it('keeps a very long trope to 60 characters and still matches it', () => {
    const typed = 'a'.repeat(200)
    const patch = addTrope(old(), typed, [])!
    const name = patch.tropes![0]
    expect(name.length).toBe(60)
    const b = old({ tropes: [name] })
    expect(searchShelf([b], 'aaaa').length).toBe(1)
    expect(tropeCounts([b])[0].count).toBe(1)
    expect(removeTrope(b, name)).toEqual({ tropes: undefined })
  })

  it('counts a trope typed in three different cases as one', () => {
    const books = [
      old({ id: '1', tropes: ['enemies to lovers'] }),
      old({ id: '2', tropes: ['Enemies To Lovers'] }),
      old({ id: '3', tropes: ['ENEMIES  TO  LOVERS'] }),
    ]
    expect(tropeCounts(books)).toEqual([{ name: 'enemies to lovers', count: 3 }])
    // the shelf's first spelling is what a new book gets
    expect(addTrope(old({ id: '4' }), 'Enemies to lovers', books)).toEqual({ tropes: ['enemies to lovers'] })
    expect(badges(books, '2026-12-31').find((b) => b.id === 'trope-5')!.progress).toEqual({ done: 3, goal: 5 })
  })

  it('matches a trope with accents by its plain letters, and the other way round', () => {
    const b = old({ tropes: ['Café romance'] })
    expect(foldTrope('Café romance')).toBe('cafe romance')
    expect(searchShelf([b], 'cafe').length).toBe(1)
    expect(addTrope(b, 'cafe romance', [b])).toBe(null)
  })

  it('ignores an empty string that somehow sits in a saved list', () => {
    const b = old({ tropes: ['', 'Slow burn'] })
    expect(tropeCounts([b])).toEqual([{ name: 'Slow burn', count: 1 }])
    expect(tropesOf(b).length).toBe(2)
  })
})

describe('characters, trying to break them', () => {
  it('refuses the same name twice however it is typed, including with accents', () => {
    const b = old({ characters: [{ name: 'Féyre' }] })
    for (const typed of ['Feyre', 'feyre', '  FÉYRE  ', 'Feyre']) expect(addCharacter(b, typed)).toBe(null)
  })

  it('leaves the other characters alone when one gets a ♥ or goes', () => {
    const b = old({ characters: [{ name: 'A' }, { name: 'B', fav: true }, { name: 'C' }] })
    expect(toggleFavourite(b, 'a').characters).toEqual([{ name: 'A', fav: true }, { name: 'B', fav: true }, { name: 'C' }])
    expect(removeCharacter(b, 'B').characters).toEqual([{ name: 'A' }, { name: 'C' }])
  })

  it('does nothing for a name that is not on the book', () => {
    const b = old({ characters: [{ name: 'A' }] })
    expect(toggleFavourite(b, 'Nobody').characters).toEqual([{ name: 'A' }])
    expect(removeCharacter(b, 'Nobody').characters).toEqual([{ name: 'A' }])
  })
})

describe('the badge family, trying to break it', () => {
  const sameTrope = (n: number) =>
    Array.from({ length: n }, (_, i) => old({ id: `b${i}`, tropes: ['Found family'], finished: [`2026-01-${String(i + 1).padStart(2, '0')}`] }))

  it('counts a want-to-read book with the trope not at all', () => {
    const books = [...sameTrope(4), old({ id: 'w', status: 'want', readCount: 0, finished: undefined, tropes: ['Found family'] })]
    expect(badges(books, '2026-12-31').find((b) => b.id === 'trope-5')!.earned).toBe(false)
  })

  it('takes the earliest trope that reaches the step when two do', () => {
    const books = [
      ...sameTrope(5),
      ...Array.from({ length: 5 }, (_, i) => old({ id: `l${i}`, tropes: ['Slow burn'], finished: [`2026-06-${String(i + 1).padStart(2, '0')}`] })),
    ]
    const badge = badges(books, '2026-12-31').find((b) => b.id === 'trope-5')!
    expect(badge.earned).toBe(true)
    expect(badge.on).toBe('2026-01-05')
    expect(badge.how).toContain('Found family')
  })

  it('is earned with no finish days known at all, without a day', () => {
    const books = Array.from({ length: 5 }, (_, i) => old({ id: `n${i}`, tropes: ['Found family'], finished: undefined }))
    const badge = badges(books, '2026-12-31').find((b) => b.id === 'trope-5')!
    expect(badge.earned).toBe(true)
    expect(badge.on).toBeUndefined()
  })
})

describe('the wish and the challenge rule, trying to break them', () => {
  it('a wish for a trope nothing has leaves the closest books', () => {
    const choices = [old({ id: '1', status: 'want', tropes: ['Slow burn'] })]
    expect(wishScore(choices[0], { trope: 'Heist' })).toEqual({ met: 0, of: 1 })
  })

  it('a challenge rule whose trope left the shelf reads as the trope itself', () => {
    expect(ruleText({ id: 'c', name: 'x', target: 3, year: 2026, rule: 'trope', value: 'Heist' }, [])).toBe('Heist books')
  })
})

describe('the dashboard block when it is empty', () => {
  it('has nothing to show with no finished book that has a trope and no ♥', () => {
    const books = [old({ status: 'want', readCount: 0, finished: undefined, tropes: ['Slow burn'] }), old({ id: 'x', characters: [{ name: 'A' }] })]
    expect(tropesBlock(books)).toEqual({ tropes: [], favourites: [], empty: true })
  })
})
