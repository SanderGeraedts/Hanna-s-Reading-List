import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { mergeBooks } from './merge'
import {
  boughtPatch,
  buyHref,
  cleanBuyLink,
  isWish,
  shelfBooks,
  wishBooks,
  wishCountText,
  wishOrder,
  wishTotal,
} from './wishlist'

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Someone'],
  color: '#884422',
  status: 'want',
  addedAt: Number(id.replace(/\D/g, '')) || 1,
  ...extra,
})

describe('the wishlist, and how it is kept apart from the shelf (T-0062, D-0044)', () => {
  it('splits the library into her shelf and her wishes, and nothing is lost', () => {
    const library = [
      book('1'),
      book('2', { wish: true }),
      // a shelf saved before the flag existed, and one where it was explicitly turned off
      book('3', { wish: false }),
      book('4', { wish: true }),
      book('5'),
    ]
    expect(shelfBooks(library).map((b) => b.id)).toEqual(['1', '3', '5'])
    expect(wishBooks(library).map((b) => b.id)).toEqual(['2', '4'])
    expect(shelfBooks(library).length + wishBooks(library).length).toBe(library.length)
    expect(isWish(library[1])).toBe(true)
    expect(isWish(library[2])).toBe(false)
  })

  it('splits an empty, a one-book and a fifty-book library', () => {
    expect(shelfBooks([])).toEqual([])
    expect(wishBooks([])).toEqual([])
    expect(shelfBooks([book('1')]).map((b) => b.id)).toEqual(['1'])
    expect(wishBooks([book('1')])).toEqual([])
    const fifty = Array.from({ length: 50 }, (_, i) => book(`b${i}`, i % 5 === 0 ? { wish: true } : {}))
    expect(shelfBooks(fifty)).toHaveLength(40)
    expect(wishBooks(fifty)).toHaveLength(10)
    // the order of the library is kept on both sides
    expect(shelfBooks(fifty).map((b) => b.id)).toEqual(fifty.filter((b) => !b.wish).map((b) => b.id))
  })

  it('shows the wishes newest first', () => {
    const list = [book('1', { wish: true }), book('3', { wish: true }), book('2', { wish: true })]
    expect(wishOrder(list).map((b) => b.id)).toEqual(['3', '2', '1'])
    // the list it was given is not reordered in place
    expect(list.map((b) => b.id)).toEqual(['1', '3', '2'])
  })

  it('adds up only the wishes that have a price', () => {
    const list = [
      book('1', { wish: true, price: 18.99 }),
      book('2', { wish: true, price: 22.49 }),
      book('3', { wish: true }),
    ]
    expect(wishTotal(list)).toBeCloseTo(41.48, 10)
    expect(wishCountText(list)).toBe('3 books · €41.48')
    expect(wishCountText([book('1', { wish: true })])).toBe('1 book')
    expect(wishCountText([])).toBe('0 books')
    // a wish with no price at all is a perfectly good wish
    expect(wishTotal([book('3', { wish: true })])).toBe(0)
    expect(wishCountText([book('3', { wish: true }), book('4', { wish: true })])).toBe('2 books')
  })

  it('adds prices up in cents, so the total never drifts', () => {
    const ten = Array.from({ length: 10 }, (_, i) => book(`b${i}`, { wish: true, price: 0.1 }))
    expect(wishTotal(ten)).toBe(1)
    expect(wishCountText(ten)).toBe('10 books · €1.00')
  })

  it('"I bought it" clears the flag and dates the book today, keeping its price', () => {
    const wish = book('1', { wish: true, price: 18.99, buyUrl: 'https://example.com/x' })
    const patch = boughtPatch(1_700_000_000_000)
    expect(patch).toEqual({ wish: undefined, addedAt: 1_700_000_000_000 })
    const bought = { ...wish, ...patch }
    expect(isWish(bought)).toBe(false)
    expect(shelfBooks([bought]).map((b) => b.id)).toEqual(['1'])
    expect(bought.price).toBe(18.99)
  })

  it('only lets a web link behind the Buy button, on the way in and on every render', () => {
    for (const ok of ['https://example.com/book', 'http://example.com/book', 'https://a.co/x?y=1#z']) {
      expect(cleanBuyLink(ok)).toBe(ok)
      expect(buyHref(ok)).toBeTruthy()
    }
    for (const bad of ['javascript:alert(1)', 'data:text/html,<b>', 'file:///c:/x', '', '   ', 'bookshop', 'https://']) {
      expect(cleanBuyLink(bad)).toBeUndefined()
      expect(buyHref(bad)).toBeUndefined()
    }
    // whatever is already stored on a book from another device is checked again
    expect(buyHref(book('1', { buyUrl: 'javascript:alert(1)' }).buyUrl)).toBeUndefined()
  })

  it('merging takes the kept copy\u2019s wish flag, so a wish never lands on a shelf book (D-0009)', () => {
    const shelf = book('1', { title: 'Babel', isbn: '9780008501822' })
    const wish = book('2', { title: 'Babel', wish: true, buyUrl: 'https://example.com/babel', price: 22.49 })
    // the shelf book is the one she kept: the result is a shelf book
    const kept = mergeBooks(shelf, wish)
    expect(kept.wish).toBeUndefined()
    expect(shelfBooks([kept])).toHaveLength(1)
    // and the useful bits came along
    expect(kept.buyUrl).toBe('https://example.com/babel')
    expect(kept.price).toBe(22.49)
    // two wishes merged stay a wish
    const both = mergeBooks(wish, book('3', { wish: true }))
    expect(both.wish).toBe(true)
    // the wish is the one she kept: it stays a wish
    expect(mergeBooks(wish, shelf).wish).toBe(true)
  })
})
