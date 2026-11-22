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
