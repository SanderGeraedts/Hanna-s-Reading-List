import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))

const { sortBooks } = await import('./library')
const { arrangementSeparators, shelfGroups } = await import('./separators')
const { themeFor } = await import('./nookThemes')

let n = 0
const book = (title: string, extra: Partial<Book> = {}): Book => ({
  id: `b${++n}`,
  title,
  authors: ['Someone'],
  color: '#888888',
  status: 'want',
  addedAt: Date.UTC(2026, 0, 1),
  ...extra,
})

/** What stands before each book, as "label:kind[:theme][:complete]" in shelf order. */
function markers(shelf: Book[], arrangement: Parameters<typeof arrangementSeparators>[1]) {
  const ordered = sortBooks(shelf, arrangement!)
  const seps = arrangementSeparators(ordered, arrangement)
  return ordered
    .map((b) => seps.get(b.id))
    .filter((s) => !!s)
    .map((s) => [s!.label, s!.kind, s!.kind === 'nook' && s!.theme, s!.complete && 'complete'].filter(Boolean).join(':'))
}

describe('book nooks for every arrangement (#17, #36)', () => {
  it('puts a wide nook before every group, small ones too: no slim dividers (#36)', () => {
    const shelf = [
      ...['A', 'B', 'C'].map((t) => book(`Fantasy ${t}`, { genres: ['Fantasy'] })),
      ...['A', 'B', 'C'].map((t) => book(`Krimi ${t}`, { genres: ['Crime'] })),
      book('Gedicht', { genres: ['Poetry'] }),
    ]
    expect(markers(shelf, 'genre')).toEqual(['Crime:nook:neon', 'Fantasy:nook:forest', 'Poetry:nook:library'])
  })

  it('picks the scene from the books, and gives each group its own version', () => {
    expect(themeFor('Percy Jackson', [book('x', { genres: ['Fantasy', 'Adventure'] })]).theme).toBe('forest')
    expect(themeFor('Krimis', [book('x', { genres: ['Crime'] })]).theme).toBe('neon')
    expect(themeFor('Kinder', [book('x', { genres: ["Children's"] })]).theme).toBe('meadow')
    expect(themeFor('Group one', []).variant).not.toBe(themeFor('Group two', []).variant)
  })

  it('gives every reading-status group a nook', () => {
    const shelf = [book('a', { status: 'read' }), book('b'), book('c', { status: 'reading' })]
    expect(markers(shelf, 'status').map((m) => m.split(':').slice(0, 2).join(':'))).toEqual([
      // shelf order is Reading, Want to read, Read
      'Reading:nook',
      'Want to read:nook',
      'Read:nook',
    ])
  })

  it('groups by first letter, decade, year added and colour family', () => {
    const titles = [...['Alpha', 'Apple', 'Avocado', 'Ärger'].map((t) => book(t)), ...['Beta', 'Bravo', 'Boot'].map((t) => book(t))]
    expect(shelfGroups(sortBooks(titles, 'title'), 'title').map((g) => [g.label, g.books.length])).toEqual([
      ['A', 4],
      ['B', 3],
    ])
    expect(markers(titles, 'title').map((m) => m.split(':').slice(0, 2).join(':'))).toEqual(['A:nook', 'B:nook'])

    const years = [1994, 1999, 2003, 2008, 2009].map((y) => book(`y${y}`, { year: y }))
    expect(shelfGroups(years, 'year').map((g) => g.label)).toEqual(['1990s', '2000s'])

    const added = [book('old', { addedAt: Date.UTC(2025, 5, 1) }), book('new')]
    expect(shelfGroups(added, 'added').map((g) => g.label)).toEqual(['Added in 2025', 'Added in 2026'])

    const colours = ['#c0392b', '#2e86c1', '#1f618d', '#777777'].map((c) => book(c, { color: c }))
    expect(shelfGroups(colours, 'color').map((g) => g.label)).toEqual(['Reds', 'Blues', 'Black, white & grey'])
  })

  it('starts the shelf with a nook naming the first group', () => {
    const shelf = [...[1, 2, 3].map((i) => book(`A${i}`, { genres: ['Romance'] })), ...[1, 2, 3].map((i) => book(`B${i}`, { genres: ['Thriller'] }))]
    expect(markers(shelf, 'genre')).toEqual(['Romance:nook:seaside', 'Thriller:nook:neon'])
  })

  it('shows a finished series on its nook too (#18)', () => {
    const read = { status: 'read' as const, authors: ['Rick Riordan'] }
    const shelf = [
      book('Die Kane-Chroniken 1: Die rote Pyramide', { authors: ['Rick Riordan'] }),
      book('Die Kane-Chroniken 2: Der Feuerthron', { authors: ['Rick Riordan'] }),
      ...[1, 2, 3].map((i) => book(`Percy Jackson, Teil ${i}: Band ${i}`, read)),
    ]
    const ms = markers(shelf, 'series')
    expect(ms[0]).toMatch(/^Die Kane-Chroniken:nook:\w+$/)
    expect(ms[1]).toMatch(/^Percy Jackson:nook:\w+:complete$/)
  })

  it("leaves arrangements with no groups to divide alone", () => {
    expect(markers([book('a'), book('b')], 'color')).toEqual([])
    expect(arrangementSeparators([book('a')], null).size).toBe(0)
  })
})
