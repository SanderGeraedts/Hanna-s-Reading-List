import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { pileJars } from './pile'
import { parsePrice } from './price'
import { boughtPatch, buyHref, cleanBuyLink, shelfBooks, wishBooks, wishCountText, wishTotal } from './wishlist'

/** The tester's gap tests: the awkward wishes. */

const wish = (extra: Partial<Book> = {}): Book => ({
  id: 'w1',
  title: 'A Wish',
  authors: ['Someone'],
  color: '#884422',
  status: 'want',
  wish: true,
  addedAt: Date.parse('2026-11-10T09:00:00Z'),
  ...extra,
})

describe('the wishlist, pushed harder (T-0072)', () => {
  it('a wish of €0 keeps its price (the row shows €0.00) but adds nothing to the total', () => {
    const free = wish({ price: 0 })
    // the row shows a price whenever one is set, so €0.00 is shown, not hidden
    expect(free.price).toBe(0)
    expect(wishTotal([free])).toBe(0)
    // the count line leaves a €0 total out, because "· €0.00" says nothing
    expect(wishCountText([free])).toBe('1 book')
    expect(wishCountText([free, wish({ id: 'w2', price: 5 })])).toBe('2 books · €5.00')
  })

  it('the biggest price D-0024 allows still adds up', () => {
    const many = Array.from({ length: 12 }, (_, i) => wish({ id: `w${i}`, price: 9999.99 }))
    expect(wishTotal(many)).toBe(119999.88)
    expect(wishCountText(many)).toBe('12 books · €119999.88')
    expect(parsePrice('9999.99')).toEqual({ ok: true, price: 9999.99 })
    expect(parsePrice('10000')).toEqual({ ok: false, problem: 'too-much' })
  })

  it('a price that drifted in from somewhere else never breaks the total', () => {
    for (const price of [Number.NaN, Number.POSITIVE_INFINITY, -5] as number[]) {
      expect(wishTotal([wish({ price })])).toBe(0)
      expect(wishCountText([wish({ price })])).toBe('1 book')
    }
  })

  it('a wish that looks exactly like a finished, rated, priced shelf book still counts nowhere', () => {
    const loud = wish({
      status: 'read',
      readCount: 3,
      rating: 5,
      finished: ['2026-11-11'],
      readingLog: { '2026-11-11': 1 },
      pages: 900,
      formats: ['hardcover'],
      price: 99.99,
      genres: ['Fantasy'],
      places: ['Japan'],
    })
    expect(shelfBooks([loud])).toEqual([])
    expect(pileJars(shelfBooks([loud]), '2026-11-23')).toEqual(pileJars([], '2026-11-23'))
  })

  it('a wish bought twice is still one book on the shelf', () => {
    const w = wish({ price: 12 })
    const once = { ...w, ...boughtPatch(1000) }
    // the second press works out a patch from a book that is no longer a wish
    const twice = { ...once, ...boughtPatch(2000) }
    expect(shelfBooks([twice])).toHaveLength(1)
    expect(wishBooks([twice])).toEqual([])
    expect(twice.price).toBe(12)
  })

  it('a buy link with odd but legal shapes is kept, and anything else is refused', () => {
    const ok = [
      'https://example.com',
      'https://example.com/a/b?c=d&e=f#g',
      'http://192.168.1.1:8080/shop',
      'https://exämple.com/böök',
      'https://example.com/' + 'x'.repeat(2000),
    ]
    for (const link of ok) {
      expect(cleanBuyLink(link)).toBe(link)
      expect(buyHref(link)).toBeTruthy()
    }
    const bad = [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      ' javascript:alert(1) ',
      'data:text/html,<script>x</script>',
      'vbscript:msgbox',
      'file:///etc/passwd',
      'mailto:someone@example.com',
      'ftp://example.com/x',
      '//example.com',
      'example.com',
      '',
      '   ',
    ]
    for (const link of bad) {
      expect(cleanBuyLink(link)).toBeUndefined()
      expect(buyHref(link)).toBeUndefined()
    }
  })

  it('a wish with no author, no cover and a very long title is still a wish', () => {
    const long = wish({ title: 'The '.repeat(300) + 'End', authors: [] })
    expect(wishBooks([long])).toHaveLength(1)
    expect(shelfBooks([long])).toEqual([])
  })

  it('a whole library of wishes leaves every counter nothing to count', () => {
    const all = Array.from({ length: 50 }, (_, i) => wish({ id: `w${i}`, price: i }))
    expect(shelfBooks(all)).toEqual([])
    expect(wishBooks(all)).toHaveLength(50)
    expect(pileJars(shelfBooks(all), '2026-11-23')).toEqual(pileJars([], '2026-11-23'))
  })
})
