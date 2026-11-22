import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { HEIGHT_THINGS, compareHeight, comparisonText, heightSpoken, heightText, pileHeight, pileHeightLine } = await import(
  './pileHeight'
)
const { bookDims } = await import('./shelfLayout')
const { listenOnly } = await import('./listening')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['A'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

describe('pileHeight (D-0029)', () => {
  it('is the sum of the shelf thickness of the want-to-read books she does not only listen to', () => {
    const shelf = [
      book('a', { pages: 320, format: 'paperback' }),
      book('b', { pages: 120, format: 'hardcover' }),
      book('c', { status: 'read', pages: 400 }),
      book('d', { formats: ['storytel'], minutes: 700, pages: 700 }),
      book('e', { formats: ['paperback', 'storytel'], pages: 250, minutes: 600 }),
      book('f', { format: 'ebook', pages: 500 }),
      book('g'),
    ]
    const expected = shelf
      .filter((b) => b.status === 'want' && !listenOnly(b))
      .reduce((sum, b) => sum + bookDims(b).t, 0)
    expect(pileHeight(shelf).metres).toBeCloseTo(expected, 10)
    expect(pileHeight(shelf)).toMatchObject({ counted: 5, listenOnly: 1 })
  })

  it('leaves out read, reading, paused and did-not-finish books', () => {
    const shelf = (['read', 'reading', 'paused', 'dnf'] as const).map((status, i) => book(String(i), { status, pages: 300 }))
    expect(pileHeight(shelf)).toEqual({ metres: 0, counted: 0, listenOnly: 0 })
  })

  it('leaves out a listen-only book, but counts a paperback + Storytel book with its pages', () => {
    const listen = book('l', { formats: ['audiobook'], minutes: 900, pages: 900 })
    const both = book('p', { formats: ['paperback', 'storytel'], pages: 300, minutes: 800 })
    expect(pileHeight([listen]).metres).toBe(0)
    expect(pileHeight([both]).metres).toBeCloseTo(bookDims(book('x', { pages: 300 })).t, 10)
  })

  it('counts an e-book and a book without pages (as 280 pages)', () => {
    const ebook = book('e', { format: 'ebook', pages: 400 })
    const none = book('n')
    expect(pileHeight([ebook]).metres).toBeCloseTo(bookDims(ebook).t, 10)
    expect(pileHeight([none]).metres).toBeCloseTo(bookDims(book('y', { pages: 280 })).t, 10)
  })

  it('tells an empty pile from a pile of only audiobooks', () => {
    expect(pileHeight([])).toEqual({ metres: 0, counted: 0, listenOnly: 0 })
    expect(pileHeight([book('a', { formats: ['storytel'] }), book('b', { formats: ['audiobook'] })])).toEqual({
      metres: 0,
      counted: 0,
      listenOnly: 2,
    })
  })
})

describe('heightText', () => {
  it.each([
    [0.004, '1 cm'],
    [0.483, '48 cm'],
    [0.996, '1 m'],
    [1.624, '1.62 m'],
    [1.6, '1.6 m'],
    [2, '2 m'],
    [12.44, '12.4 m'],
    [123.4, '123 m'],
  ])('%s → %s', (m, text) => {
    expect(heightText(m)).toBe(text)
  })

  it('takes a non-breaking space for the screen', () => {
    expect(heightText(1.624, ' ')).toBe('1.62 m')
  })

  it('speaks the units in full, singular for 1', () => {
    expect(heightSpoken(1.624)).toBe('1.62 metres')
    expect(heightSpoken(0.483)).toBe('48 centimetres')
    expect(heightSpoken(0.996)).toBe('1 metre')
    expect(heightSpoken(0.004)).toBe('1 centimetre')
  })
})

describe('compareHeight', () => {
  it.each([
    [1.62, 'about as tall as an adult (1.75 m)'],
    [2, 'about as tall as a door (2 m)'],
    [0.97, 'about as tall as a kitchen counter (90 cm)'],
    [3.05, 'taller than a door (2 m)'],
    [400, 'taller than the Eiffel Tower (330 m)'],
    [0.05, 'not as tall as a mug (10 cm) yet'],
  ])('%s → %s', (m, text) => {
    expect(comparisonText(compareHeight(m))).toBe(text)
  })

  it('writes every list height with the same rounding as the pile, in order of height', () => {
    expect(HEIGHT_THINGS.map((t) => `${t.name} (${heightText(t.metres)})`)).toEqual([
      'a mug (10 cm)',
      'a cat (25 cm)',
      'a kitchen counter (90 cm)',
      'a door handle (1.05 m)',
      'an adult (1.75 m)',
      'a door (2 m)',
      'a double-decker bus (4.4 m)',
      'a giraffe (5 m)',
      'a house (8 m)',
      'an oak tree (20 m)',
      'the Leaning Tower of Pisa (56 m)',
      'Big Ben (96 m)',
      'the Eiffel Tower (330 m)',
    ])
    const heights = HEIGHT_THINGS.map((t) => t.metres)
    expect([...heights].sort((a, b) => a - b)).toEqual(heights)
  })

  it('builds the whole line', () => {
    expect(pileHeightLine(1.624)).toBe('Stacked up, your pile would be 1.62 m: about as tall as an adult (1.75 m).')
    expect(pileHeightLine(12.44)).toBe('Stacked up, your pile would be 12.4 m: taller than a house (8 m).')
    expect(pileHeightLine(0.04)).toBe('Stacked up, your pile would be 4 cm: not as tall as a mug (10 cm) yet.')
  })
})

describe('pileHeight: edge cases (tester, T-0021)', () => {
  it('a pile of 1 book is that book’s shelf thickness', () => {
    const one = book('1', { pages: 400, format: 'paperback' })
    expect(pileHeight([one])).toEqual({ metres: bookDims(one).t, counted: 1, listenOnly: 0 })
    expect(pileHeightLine(pileHeight([one]).metres)).toBe(
      'Stacked up, your pile would be 4 cm: not as tall as a mug (10 cm) yet.',
    )
  })

  it('a 1-page book still stands at the shelf’s minimum thickness (never 0 cm)', () => {
    const thin = book('t', { pages: 1 })
    expect(pileHeight([thin]).metres).toBeCloseTo(0.018, 10)
    expect(heightText(pileHeight([thin]).metres)).toBe('2 cm')
  })

  it('a book with 0 or a negative page count counts as the shelf’s 280 pages', () => {
    const t280 = bookDims(book('y', { pages: 280 })).t
    expect(pileHeight([book('z', { pages: 0 })]).metres).toBeCloseTo(t280, 10)
    expect(pileHeight([book('n', { pages: -5 })]).metres).toBeCloseTo(t280, 10)
  })

  it('mixed formats: e-book (new and old field), "other", paper + audiobook count; audio-only (also old Storytel imports) is left out', () => {
    const shelf = [
      book('e1', { formats: ['ebook'], pages: 300 }),
      book('e2', { format: 'ebook', pages: 300 }),
      book('o', { formats: ['other'], pages: 300 }),
      book('h', { formats: ['hardcover', 'audiobook'], pages: 300, minutes: 900 }),
      book('s', { formats: ['storytel', 'other'], minutes: 900 }),
      book('st', { storytelId: 'x', minutes: 900 }),
      book('a', { formats: ['audiobook', 'storytel'], minutes: 900 }),
    ]
    const t300 = bookDims(book('q', { pages: 300 })).t
    const h = pileHeight(shelf)
    expect(h).toMatchObject({ counted: 4, listenOnly: 3 })
    expect(h.metres).toBeCloseTo(4 * t300, 10)
  })

  it('a paper + audiobook book counts with its pages, not its (longer) minutes', () => {
    const both = book('b', { formats: ['paperback', 'audiobook'], pages: 200, minutes: 900 })
    expect(pileHeight([both]).metres).toBeCloseTo(bookDims(book('c', { pages: 200 })).t, 10)
  })

  it('a very large pile adds up and is written in whole metres with a thousands comma', () => {
    const shelf = Array.from({ length: 30_000 }, (_, i) => book(String(i), { pages: 300 }))
    const h = pileHeight(shelf)
    expect(h.counted).toBe(30_000)
    expect(h.metres).toBeCloseTo(30_000 * bookDims(book('q', { pages: 300 })).t, 6)
    expect(heightText(h.metres)).toBe('1,035 m')
    expect(heightSpoken(h.metres)).toBe('1,035 metres')
    expect(comparisonText(compareHeight(h.metres))).toBe('taller than the Eiffel Tower (330 m)')
  })
})

describe('heightText: rounding boundaries (tester, T-0021)', () => {
  it.each([
    [0, '1 cm'],
    [0.0149, '1 cm'],
    [0.9949, '99 cm'],
    [0.995, '1 m'],
    [1.0051, '1.01 m'],
    [9.994, '9.99 m'],
    [9.996, '10 m'],
    [10, '10 m'],
    [99.94, '99.9 m'],
    [99.96, '100 m'],
    [100, '100 m'],
    [999.5, '1,000 m'],
  ])('%s → %s', (m, text) => {
    expect(heightText(m)).toBe(text)
  })

  it('speaks a value that rounds to 1 in the singular, and anything else in the plural', () => {
    expect(heightSpoken(0.995)).toBe('1 metre')
    expect(heightSpoken(1.004)).toBe('1 metre')
    expect(heightSpoken(1.01)).toBe('1.01 metres')
    expect(heightSpoken(0.02)).toBe('2 centimetres')
    expect(heightSpoken(10)).toBe('10 metres')
  })
})

describe('compareHeight: boundaries and ties (tester, T-0021)', () => {
  it('a pile exactly as tall as a thing is about as tall as it', () => {
    for (const thing of HEIGHT_THINGS) {
      expect(compareHeight(thing.metres)).toEqual({ kind: 'about', thing })
    }
  })

  it('just inside and just outside 10% of a mug', () => {
    expect(comparisonText(compareHeight(0.0905))).toBe('about as tall as a mug (10 cm)')
    expect(comparisonText(compareHeight(0.0895))).toBe('not as tall as a mug (10 cm) yet')
    expect(comparisonText(compareHeight(0.1095))).toBe('about as tall as a mug (10 cm)')
    expect(comparisonText(compareHeight(0.1105))).toBe('taller than a mug (10 cm)')
  })

  it('between two things that are both within 10%, the closer by ratio wins either side of the midpoint', () => {
    // kitchen counter 0.9 and door handle 1.05 meet at √(0.9 × 1.05) ≈ 0.972
    expect(comparisonText(compareHeight(0.97))).toBe('about as tall as a kitchen counter (90 cm)')
    expect(comparisonText(compareHeight(0.975))).toBe('about as tall as a door handle (1.05 m)')
    // a giraffe 5 m and a bus 4.4 m meet at ≈ 4.69
    expect(comparisonText(compareHeight(4.68))).toBe('about as tall as a double-decker bus (4.4 m)')
    expect(comparisonText(compareHeight(4.7))).toBe('about as tall as a giraffe (5 m)')
  })

  it('in a gap between things it is taller than the tallest one it beats', () => {
    expect(comparisonText(compareHeight(0.3))).toBe('taller than a cat (25 cm)')
    expect(comparisonText(compareHeight(12))).toBe('taller than a house (8 m)')
    expect(comparisonText(compareHeight(150))).toBe('taller than Big Ben (96 m)')
    expect(comparisonText(compareHeight(364))).toBe('taller than the Eiffel Tower (330 m)')
    expect(comparisonText(compareHeight(1e6))).toBe('taller than the Eiffel Tower (330 m)')
  })
})
