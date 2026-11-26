import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import type { ChoiceEvent } from './creatures/choices'
import { askText, fulfilledWishes, keepWishEvent, keptKey, keptWishes, wishToAsk } from './wishFulfilled'

/** A wish she already has on her shelf (D-0086): offered, never done for her. */

const book = (id: string, title: string, over: Partial<Book> = {}): Book => ({
  id,
  title,
  authors: ['R. F. Kuang'],
  color: '#888',
  status: 'want',
  addedAt: 1,
  ...over,
})

const wish = (id: string, title: string, over: Partial<Book> = {}) => book(id, title, { wish: true, ...over })

describe('spotting a wish she already has', () => {
  it('finds the shelf book with the same title and author', () => {
    const list = [wish('w', 'Babel'), book('s', 'Babel', { storytelId: '123' })]
    const found = fulfilledWishes(list)
    expect(found).toHaveLength(1)
    expect(found[0].wish.id).toBe('w')
    expect(found[0].book.id).toBe('s')
    expect(found[0].fromStorytel).toBe(true)
  })

  it('does not care about capitals, spaces or punctuation', () => {
    const list = [wish('w', 'The Night Circus'), book('s', 'the night  circus!')]
    expect(fulfilledWishes(list)).toHaveLength(1)
  })

  it('leaves a different book by another author alone', () => {
    const list = [wish('w', 'Babel'), book('s', 'Babel', { authors: ['A. Byatt'] })]
    expect(fulfilledWishes(list)).toHaveLength(0)
  })

  it('matches on the title alone when one of them names no author', () => {
    const list = [wish('w', 'Babel', { authors: [] }), book('s', 'Babel')]
    expect(fulfilledWishes(list)).toHaveLength(1)
  })

  it('never matches a wish against another wish', () => {
    expect(fulfilledWishes([wish('w', 'Babel'), wish('w2', 'Babel')])).toHaveLength(0)
  })

  it('says nothing about a wish she does not have yet', () => {
    expect(fulfilledWishes([wish('w', 'Babel'), book('s', 'Circe')])).toHaveLength(0)
  })

  it('offers the oldest wish first, one at a time', () => {
    const list = [
      wish('new', 'Circe', { addedAt: 500 }),
      wish('old', 'Babel', { addedAt: 100 }),
      book('s1', 'Babel'),
      book('s2', 'Circe'),
    ]
    expect(wishToAsk(list)!.wish.id).toBe('old')
  })

  it('has nothing to ask on an empty shelf', () => {
    expect(wishToAsk([])).toBeNull()
  })
})

describe('her answer', () => {
  const at = (n: number, body: Record<string, unknown>): ChoiceEvent =>
    ({ id: `e${n}`, at: 1_700_000_000_000 + n, ...body }) as ChoiceEvent

  it('remembers a "keep it" so she is not asked twice', () => {
    const log = [at(1, keepWishEvent('w'))]
    expect(keptWishes(log).has('w')).toBe(true)
    const list = [wish('w', 'Babel'), book('s', 'Babel')]
    expect(fulfilledWishes(list, keptWishes(log))).toHaveLength(0)
    expect(wishToAsk(list, keptWishes(log))).toBeNull()
  })

  it('keeps one wish without silencing another', () => {
    const log = [at(1, keepWishEvent('w1'))]
    const list = [wish('w1', 'Babel'), wish('w2', 'Circe'), book('s1', 'Babel'), book('s2', 'Circe')]
    expect(fulfilledWishes(list, keptWishes(log)).map((f) => f.wish.id)).toEqual(['w2'])
  })

  it('writes one event per wish, under its own key, and reads nobody else’s', () => {
    expect(keepWishEvent('w')).toEqual({ kind: 'place', key: keptKey('w'), keep: 1 })
    const others = [
      at(1, { kind: 'place', key: 'f:seen', n: 10 }),
      at(2, { kind: 'place', key: 'c:earned', n: 40 }),
      at(3, { kind: 'place', key: 'b:2026:1:3', sq: 'rain' }),
    ]
    expect(keptWishes(others).size).toBe(0)
  })
})

describe('what the question says', () => {
  it('names the book and where it came from', () => {
    const [storytel] = fulfilledWishes([wish('w', 'Babel'), book('s', 'Babel', { storytelId: '1' })])
    expect(askText(storytel)).toBe('“Babel” is on your shelf from Storytel and still on your wishlist.')
    const [added] = fulfilledWishes([wish('w', 'Circe'), book('s', 'Circe')])
    expect(askText(added)).toBe('“Circe” is on your shelf and still on your wishlist.')
  })
})
