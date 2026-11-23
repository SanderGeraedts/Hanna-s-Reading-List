import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import type { IsbnLookup } from '#/server/openLibrary'
import { isbnFromBarcode } from './isbn'
import {
  MAX_ROWS,
  addScan,
  addableRows,
  firstPriceProblem,
  formatList,
  formatsOfRow,
  patchRow,
  removeRow,
  retryRow,
  rowAsksPrice,
  settleScan,
} from './batchScan'
import type { ScanRow } from './batchScan'

/** The tester's gap tests: the awkward piles. */

const NIGHT = '9780099554790'
const found = (isbn: string, title: string): IsbnLookup => ({
  workKey: '/works/OL1W',
  title,
  authors: ['Someone'],
  isbn,
  genres: [],
})
const library: Book[] = []
const scan = (rows: ScanRow[], isbn: string, out?: IsbnLookup | null) => {
  const a = addScan(rows, isbn, library)
  if (out === undefined || a.rows[0]?.kind !== 'looking') return a.rows
  return settleScan(a.rows, isbn, { ok: true, result: out }).rows
}

describe('the batch-scan list, pushed harder (T-0071)', () => {
  it('only a real book barcode becomes a scan at all', () => {
    // the scanner itself refuses anything that is not a 978/979 EAN-13 with a right check digit
    expect(isbnFromBarcode('9780099554790')).toBe('9780099554790')
    for (const raw of ['9780099554791', '5012345678900', '12345', '', 'abc', '97800995547901']) {
      expect(isbnFromBarcode(raw)).toBeNull()
    }
  })

  it('the forty-first scan is refused out loud and nothing already in the list moves', () => {
    let rows: ScanRow[] = []
    for (let i = 0; i < MAX_ROWS; i++) {
      const isbn = `978${1000000000 + i * 1000}`
      rows = scan(rows, isbn, found(isbn, `Book ${i}`))
    }
    const before = rows
    const over = addScan(rows, `978${1000000000 + MAX_ROWS * 1000}`, library)
    expect(over.rows).toBe(before)
    expect(over.event).toContain('The list is full')
    // removing one makes room again
    const left = removeRow(rows, rows[0].isbn)
    expect(left).toHaveLength(MAX_ROWS - 1)
    expect(addScan(left, '9789999999991', library).rows).toHaveLength(MAX_ROWS)
  })

  it('a book scanned again while its own lookup is still running is still one row', () => {
    const first = addScan([], NIGHT, library)
    const again = addScan(first.rows, NIGHT, library)
    expect(again.rows).toBe(first.rows)
    expect(again.event).toBe(`Already in the list: ${NIGHT}`)
    // and the one lookup that is running still lands
    const settled = settleScan(first.rows, NIGHT, { ok: true, result: found(NIGHT, 'The Night Circus') })
    expect(addableRows(settled.rows)).toHaveLength(1)
  })

  it('Try again on a row that she removed in the meantime does nothing', () => {
    const rows = settleScan(addScan([], NIGHT, library).rows, NIGHT, { ok: false }).rows
    const left = removeRow(rows, NIGHT)
    expect(retryRow(left, NIGHT)).toEqual([])
    expect(settleScan(retryRow(left, NIGHT), NIGHT, { ok: true, result: found(NIGHT, 'x') }).rows).toEqual([])
  })

  it('a price typed on a row and then taken off the bought formats is not kept', () => {
    let rows = scan([], NIGHT, found(NIGHT, 'The Night Circus'))
    rows = patchRow(rows, NIGHT, { price: '12.50' })
    // the pile is library-only now: no price is asked, and none is checked
    expect(rowAsksPrice(rows[0], ['library'])).toBe(false)
    expect(firstPriceProblem(rows, ['library'])).toBeNull()
  })

  it('the words a row says when she has it in several ways, or in none', () => {
    expect(formatList(['paperback'])).toBe('Paperback')
    expect(formatList(['paperback', 'ebook'])).toBe('Paperback · E-book')
    expect(formatList([])).toBe('Not set')
    const rows = scan([], NIGHT, found(NIGHT, 'The Night Circus'))
    expect(formatsOfRow(rows[0], [])).toEqual([])
    expect(rowAsksPrice(rows[0], [])).toBe(false)
  })

  it('a book with a very long title keeps its row and its price field', () => {
    const long = 'Rural Development and Social Citizenship '.repeat(6)
    let rows = scan([], NIGHT, found(NIGHT, long))
    rows = patchRow(rows, NIGHT, { price: '12,50' })
    expect(rows[0].result?.title).toBe(long)
    expect(rowAsksPrice(rows[0], ['paperback'])).toBe(true)
    expect(firstPriceProblem(rows, ['paperback'])).toBeNull()
  })

  it('every kind of row that will not be added is left out of Add all, in one mixed list', () => {
    let rows = scan([], NIGHT, found(NIGHT, 'The Night Circus'))
    rows = scan(rows, '9798765432105', null)
    rows = settleScan(addScan(rows, '9789999999991', library).rows, '9789999999991', { ok: false }).rows
    rows = addScan(rows, '9780008501822', [
      { id: 'w', title: 'Babel', authors: [], color: '#1', status: 'want', addedAt: 1, isbn: '9780008501822', wish: true },
    ]).rows
    expect(rows.map((r) => r.kind).sort()).toEqual(['failed', 'found', 'on-wishlist', 'unknown'])
    expect(addableRows(rows).map((r) => r.result?.title)).toEqual(['The Night Circus'])
  })
})
