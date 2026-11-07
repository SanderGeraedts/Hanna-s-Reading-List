import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { motifFor } = await import('./nookMotifs')
const { sortBooks } = await import('./library')
const { arrangementSeparators } = await import('./separators')
const { computeLayout } = await import('./shelfLayout')

let n = 0
const book = (title: string, extra: Partial<Book> = {}): Book => ({
  id: `b${++n}`,
  title,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

describe('something from the series in its nook (#56)', () => {
  it('knows the series by name, in English and German', () => {
    expect(motifFor('The Empyrean', [book('Fourth Wing')])).toBe('dragon')
    expect(motifFor('Fourth Wing', [book('Fourth Wing – Flammengeküsst')])).toBe('dragon')
    expect(motifFor('Harry Potter', [book('Harry Potter und der Stein der Weisen')])).toBe('stag')
    expect(motifFor('Percy Jackson', [book('Percy Jackson – Diebe im Olymp')])).toBe('trident')
    expect(motifFor('Die Kane-Chroniken', [book('Die rote Pyramide')])).toBe('pyramid')
    expect(motifFor('Throne of Glass', [book('Throne of Glass')])).toBe('crown')
    expect(motifFor('Das Reich der sieben Höfe', [book('Dornen und Rosen')])).toBe('rose')
    expect(motifFor('Six of Crows', [book('Six of Crows')])).toBe('crow')
    expect(motifFor('Tintenwelt', [book('Tintenherz')])).toBe('quill')
  })

  it('otherwise goes by the words in the titles and blurbs', () => {
    expect(
      motifFor('Die Chroniken von Alera', [
        book('Band 1', { description: 'Ein junger Drachenreiter und sein Drache fliegen gegen das Imperium.' }),
        book('Band 2', { description: 'Der Drache kehrt zurück.' }),
      ]),
    ).toBe('dragon')
    expect(motifFor('Mondlicht', [book('Das Rudel', { description: 'Ein Wolf allein im Schnee.' })])).toBe('wolf')
  })

  it('leaves a series alone when nothing fits, and does not trip over parts of words', () => {
    expect(motifFor('Die Tribute von Panem', [book('Catching Fire')])).toBeUndefined()
    expect(motifFor('Millionaire', [book('A million things')])).toBeUndefined()
  })

  it('only series nooks get one, and it reaches the nook on the shelf', () => {
    const shelf = [
      ...[1, 2].map((i) => book(`Harry Potter ${i}: Band ${i}`)),
      ...[1, 2].map((i) => book(`Percy Jackson ${i}: Band ${i}`)),
    ]
    const ordered = sortBooks(shelf, 'series')
    const seps = arrangementSeparators(ordered, 'series')
    expect([...seps.values()].map((s) => s.motif)).toEqual(['stag', 'trident'])
    expect(computeLayout(ordered, {}, seps).nooks.map((s) => s.motif)).toEqual(['stag', 'trident'])
    expect([...arrangementSeparators(sortBooks(shelf, 'title'), 'title').values()].every((s) => !s.motif)).toBe(true)
  })
})
