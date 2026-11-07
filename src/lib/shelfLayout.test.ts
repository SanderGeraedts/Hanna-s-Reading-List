import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { FRAME, MAX_INNER_WIDTH, SHELF, bookDims, computeLayout, fitShelf, shelfFitFor } from './shelfLayout'
import { arrangementSeparators } from './separators'

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

describe('a gold sign for a series that is all read (#18)', () => {
  const read = { status: 'read' as const }
  const pj = (n: number, extra: Partial<Book> = {}) => book(`pj${n}`, `Percy Jackson, Teil ${n}: Band ${n}`, extra)
  const kc = (n: number, extra: Partial<Book> = {}) => book(`kc${n}`, `Die Kane-Chroniken ${n}: Band ${n}`, extra)
  const flags = (shelf: Book[]) =>
    Object.fromEntries([...arrangementSeparators(shelf, 'series').values()].map((d) => [d.label, !!d.complete]))

  it('marks a series whose books on the shelf are all read', () => {
    const shelf = [pj(1, read), pj(2, read), kc(1, read), kc(2), book('solo', 'Alone', { ...read, authors: ['X'] })]
    expect(flags(shelf)).toEqual({ 'Percy Jackson': true, 'Die Kane-Chroniken': false, Standalone: false })
  })

  it('only counts the books on the shelf, and needs at least two', () => {
    // a single read book is no series, so no nook of its own
    expect(flags([pj(1, read), kc(1, read), kc(2, read)])).toEqual({ Standalone: false, 'Die Kane-Chroniken': true })
  })
})

describe('the bookcase follows the screen width (#39)', () => {
  const many = (count: number) =>
    Array.from({ length: count }, (_, i) => book(`m${i}`, `Book number ${i}`, { authors: [`Author ${i % 37}`], pages: 320 }))
  // how far the camera stands back to show the whole case (smaller = bigger books)
  const distance = (books: Book[], aspect: number, fit: { innerWidth: number; minRows: number }) => {
    const { caseHeight } = computeLayout(books, fit)
    return Math.max(((fit.innerWidth + SHELF.side * 2) * FRAME.horizontal) / aspect, caseHeight * FRAME.vertical)
  }

  it('keeps the usual size for a small shelf', () => {
    const few = many(12)
    expect(fitShelf(few, 16 / 9)).toEqual(shelfFitFor(16 / 9))
  })

  it('widens the case for a full library on a wide screen, so the books are bigger', () => {
    const lots = many(220)
    const old = shelfFitFor(16 / 9)
    const fit = fitShelf(lots, 16 / 9)
    expect(fit.innerWidth).toBeGreaterThan(old.innerWidth)
    expect(fit.innerWidth).toBeLessThanOrEqual(MAX_INNER_WIDTH)
    expect(computeLayout(lots, fit).caseHeight).toBeLessThan(computeLayout(lots, old).caseHeight)
    expect(distance(lots, 16 / 9, fit)).toBeLessThan(distance(lots, 16 / 9, old) * 0.9)
  })

  it('grows wider on a wider screen', () => {
    const lots = many(220)
    expect(fitShelf(lots, 21 / 9).innerWidth).toBeGreaterThanOrEqual(fitShelf(lots, 4 / 3).innerWidth)
  })

  it('leaves phones held upright alone', () => {
    expect(fitShelf(many(220), 9 / 19)).toEqual(shelfFitFor(9 / 19))
  })

  it('is quick enough to run on every change', () => {
    const lots = many(400)
    const t = performance.now()
    fitShelf(lots, 16 / 9)
    expect(performance.now() - t).toBeLessThan(250)
  })
})
