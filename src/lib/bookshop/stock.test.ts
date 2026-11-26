import { describe, expect, it } from 'vitest'
import type { Book } from '../library'
import { addDays } from '../creatures/days'
import { FINISH_COPIES, MINUTES_PER_COPY, OPENING_COPIES, SHOP_START } from './numbers'
import { stocking } from './stock'

/**
 * What her reading puts on the shelves (T-0113, D-0084 §1). Every copy the
 * shop ever sells is printed by one of these rules, so each one has a test.
 */

const S = SHOP_START
const day = (n: number) => addDays(S, n)

let next = 0
function book(over: Partial<Book> = {}): Book {
  return { id: `b${next++}`, title: 'A book', authors: [], color: '#333', status: 'reading', addedAt: 0, ...over }
}

/** Every copy of one title, as day → copies (a day can have more than one arrival). */
function copiesOf(books: Book[], id: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const p of stocking(books).prints) if (p.id === id) out.set(p.day, (out.get(p.day) ?? 0) + p.copies)
  return out
}

const totalCopies = (books: Book[], id: string) =>
  stocking(books)
    .prints.filter((p) => p.id === id)
    .reduce((n, p) => n + p.copies, 0)

describe('which books the shop sells', () => {
  it('sells nothing she has not finished — a book she is halfway through is not in the shop', () => {
    const b = book({ status: 'reading', readingLog: { [day(1)]: 1 }, pages: 300 })
    expect(stocking([b]).titles).toEqual([])
  })

  it('puts a book in the shop under its own name the day she finishes it', () => {
    const b = book({ title: 'Babel', status: 'read', finished: [day(3)] })
    const [title] = stocking([b]).titles
    expect(title.book.title).toBe('Babel')
    expect(title.openDay).toBe(day(3))
    expect(title.backlist).toBe(false)
  })

  it('opens with every book she had already read, one copy each', () => {
    const b = book({ title: 'Piranesi', status: 'read', finished: ['2020-05-01'] })
    const [title] = stocking([b]).titles
    expect(title.backlist).toBe(true)
    expect(title.openDay).toBe(S)
    expect(copiesOf([b], b.id).get(S)).toBe(OPENING_COPIES)
  })

  it('counts a book she read with no day noted as one she had already read', () => {
    const b = book({ status: 'read', readCount: 1 })
    const [title] = stocking([b]).titles
    expect(title.backlist).toBe(true)
    expect(totalCopies([b], b.id)).toBe(OPENING_COPIES)
  })
})

describe('what reading prints', () => {
  it('prints a copy for every six minutes she reads', () => {
    // 60 pages × 1.5 = 90 minutes, all on one day: 15 copies
    const b = book({ status: 'read', pages: 60, finished: [day(0)], readingLog: { [day(0)]: 1 } })
    expect(copiesOf([b], b.id).get(day(0))).toBe(90 / MINUTES_PER_COPY + FINISH_COPIES)
  })

  it('prints twenty more the day she finishes it, and twenty again when she reads it again', () => {
    const b = book({ status: 'read', pages: 60, readCount: 2, finished: [day(1), day(9)] })
    expect(copiesOf([b], b.id).get(day(1))).toBe(FINISH_COPIES)
    expect(copiesOf([b], b.id).get(day(9))).toBe(FINISH_COPIES)
  })

  it('does not lose the minutes she read before she finished it: they arrive together on the day', () => {
    const b = book({
      status: 'read',
      pages: 60,
      finished: [day(4)],
      readingLog: { [day(1)]: 0.5, [day(2)]: 0.3, [day(4)]: 0.2 },
    })
    const copies = copiesOf([b], b.id)
    // nothing on the days she was still reading it; the whole print run on the finish day
    expect(copies.get(day(1))).toBeUndefined()
    expect(copies.get(day(2))).toBeUndefined()
    expect(copies.get(day(4))).toBe(90 / MINUTES_PER_COPY + FINISH_COPIES)
  })

  it('adds up the minutes before rounding, so three and three minutes still print a copy', () => {
    // 4 pages = 6 minutes, split over two days after it went on sale
    const b = book({ status: 'read', pages: 4, finished: [day(0)], readingLog: { [day(5)]: 0.5, [day(6)]: 0.5 } })
    const copies = copiesOf([b], b.id)
    expect(copies.get(day(5))).toBeUndefined()
    expect(copies.get(day(6))).toBe(1)
  })

  it('counts nothing she read before the shop opened', () => {
    const b = book({ status: 'read', pages: 600, finished: ['2026-01-01'], readingLog: { '2026-01-01': 1 } })
    // only the one copy her back catalogue brings
    expect(totalCopies([b], b.id)).toBe(OPENING_COPIES)
  })

  it('restocks an old favourite when she reads it again', () => {
    const b = book({ status: 'read', pages: 60, readCount: 2, finished: ['2020-01-01', day(7)], readingLog: { [day(7)]: 1 } })
    const copies = copiesOf([b], b.id)
    expect(copies.get(S)).toBe(OPENING_COPIES)
    expect(copies.get(day(7))).toBe(90 / MINUTES_PER_COPY + FINISH_COPIES)
  })
})

describe('the plan itself', () => {
  it('lists the arrivals oldest first, so two devices stock the shelves in the same order', () => {
    const a = book({ status: 'read', finished: [day(5)] })
    const b = book({ status: 'read', finished: [day(2)] })
    const days = stocking([a, b]).prints.map((p) => p.day)
    expect(days).toEqual([...days].sort())
  })

  it('reads her shelf and writes nothing back to it', () => {
    const b = book({ status: 'read', pages: 60, finished: [day(1)], readingLog: { [day(1)]: 1 } })
    const before = JSON.stringify(b)
    stocking([b])
    expect(JSON.stringify(b)).toBe(before)
  })
})
