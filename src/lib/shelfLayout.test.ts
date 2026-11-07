import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { bookDims, computeLayout, seriesDividers } from './shelfLayout'

const book = (id: string, title: string, extra: Partial<Book> = {}): Book => ({
  id,
  title,
  authors: ['Rick Riordan'],
  color: '#335577',
  status: 'want',
  addedAt: 0,
  ...extra,
})

describe('books in a series are the same height (#20)', () => {
  const shelf = [
    book('pj1', 'Percy Jackson, Teil 1: Diebe im Olymp'),
    book('pj2', 'Percy Jackson, Teil 2: Im Bann des Zyklopen', { coverAspect: 0.7 }),
    book('pj3', 'Percy Jackson, Teil 3: Der Fluch des Titanen'),
    book('kc1', 'Die Kane-Chroniken 1: Die rote Pyramide'),
    book('kc2', 'Die Kane-Chroniken 2: Der Feuerthron'),
    book('solo', 'Something on its own', { authors: ['Someone'] }),
    book('typed1', 'Erster Band', { authors: ['A. Autor'], series: 'Meine Reihe', seriesIndex: 1 }),
    book('typed2', 'Zweiter Band', { authors: ['A. Autor'], series: 'Meine Reihe', seriesIndex: 2 }),
  ]
  const { dims } = computeLayout(shelf)
  const h = (id: string) => dims.get(id)!.h

  it('gives every book of a series the same height', () => {
    expect(h('pj2')).toBe(h('pj1'))
    expect(h('pj3')).toBe(h('pj1'))
    expect(h('kc2')).toBe(h('kc1'))
    expect(h('typed2')).toBe(h('typed1'))
  })

  it('still varies between series, and keeps the width from the cover', () => {
    expect(new Set([h('pj1'), h('kc1'), h('typed1')]).size).toBe(3)
    expect(dims.get('pj2')!.w).not.toBe(dims.get('pj1')!.w)
  })

  it("leaves a book that isn't in a series as it was", () => {
    expect(h('solo')).toBe(bookDims(shelf[5]).h)
  })
})

describe('a gold divider for a series that is all read (#18)', () => {
  const read = { status: 'read' as const }
  const pj = (n: number, extra: Partial<Book> = {}) => book(`pj${n}`, `Percy Jackson, Teil ${n}: Band ${n}`, extra)
  const kc = (n: number, extra: Partial<Book> = {}) => book(`kc${n}`, `Die Kane-Chroniken ${n}: Band ${n}`, extra)
  const flags = (shelf: Book[]) =>
    Object.fromEntries([...seriesDividers(shelf).values()].map((d) => [d.label, !!d.complete]))

  it('marks a series whose books on the shelf are all read', () => {
    const shelf = [pj(1, read), pj(2, read), kc(1, read), kc(2), book('solo', 'Alone', { ...read, authors: ['X'] })]
    expect(flags(shelf)).toEqual({ 'Percy Jackson': true, 'Die Kane-Chroniken': false, Standalone: false })
  })

  it('only counts the books on the shelf, and needs at least two', () => {
    // a single read book is no series, so no divider of its own
    expect(flags([pj(1, read), kc(1, read), kc(2, read)])).toEqual({ Standalone: false, 'Die Kane-Chroniken': true })
  })
})
