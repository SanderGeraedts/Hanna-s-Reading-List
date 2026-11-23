import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import type { IsbnLookup } from '#/server/openLibrary'
import {
  DEFAULT_PILE_FORMATS,
  MAX_ROWS,
  addAllLabel,
  addScan,
  addableRows,
  addedText,
  anyLooking,
  firstPriceProblem,
  formatsOfRow,
  listHeading,
  patchRow,
  removeRow,
  retryRow,
  rowAsksPrice,
  settleScan,
} from './batchScan'
import type { ScanRow } from './batchScan'

const NIGHT = '9780099554790'
/** the same book as an ISBN-10 */
const NIGHT_10 = '0099554798'
const CIRCE = '9781408890052'
const PIRANESI = '9781526622426'
const WISHED = '9780008501822'
const UNKNOWN = '9781234567897'

const found = (isbn: string, title: string): IsbnLookup => ({
  workKey: `/works/OL${isbn.slice(-4)}W`,
  title,
  authors: ['Someone'],
  isbn,
  genres: [],
  coverId: 42,
})

const shelfBook = (isbn: string, title: string, extra: Partial<Book> = {}): Book => ({
  id: isbn,
  title,
  authors: ['Someone'],
  color: '#884422',
  status: 'want',
  addedAt: 1,
  isbn,
  ...extra,
})

const library: Book[] = [
  shelfBook(PIRANESI, 'Piranesi'),
  shelfBook(WISHED, 'Babel', { wish: true, price: 22.49 }),
]

/** scan a book and let its lookup come back */
function scan(rows: ScanRow[], isbn: string, outcome?: IsbnLookup | null | 'error') {
  const a = addScan(rows, isbn, library)
  if (outcome === undefined || a.rows[0]?.kind !== 'looking') return a
  return settleScan(a.rows, isbn, outcome === 'error' ? { ok: false } : { ok: true, result: outcome })
}

describe('the batch-scan list (T-0071)', () => {
  it('turns a scanned ISBN Open Library knows into a row with its book', () => {
    const { rows, event } = scan([], NIGHT, found(NIGHT, 'The Night Circus'))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ isbn: NIGHT, kind: 'found', price: '' })
    expect(rows[0].result?.title).toBe('The Night Circus')
    expect(event).toBe('Added to the list: The Night Circus')
  })

  it('keeps the newest scan at the top', () => {
    let rows = scan([], NIGHT, found(NIGHT, 'The Night Circus')).rows
    rows = scan(rows, CIRCE, found(CIRCE, 'Circe')).rows
    expect(rows.map((r) => r.result?.title)).toEqual(['Circe', 'The Night Circus'])
  })

  it('counts the same book once, whichever ISBN spelling it is scanned with', () => {
    const one = scan([], NIGHT, found(NIGHT, 'The Night Circus')).rows
    const again = addScan(one, NIGHT, library)
    expect(again.rows).toBe(one)
    expect(again.event).toBe('Already in the list: The Night Circus')
    // ISBN-10 and ISBN-13 of the same book are the same book (sameIsbn)
    const ten = addScan(one, NIGHT_10, library)
    expect(ten.rows).toBe(one)
    expect(ten.event).toBe('Already in the list: The Night Circus')
  })

  it('marks a book that is already on her shelf, and leaves it out of Add all', () => {
    const { rows, event } = addScan([], PIRANESI, library)
    expect(rows[0]).toMatchObject({ kind: 'on-shelf' })
    expect(rows[0].have?.title).toBe('Piranesi')
    expect(event).toBe('Already on your shelf: Piranesi')
    expect(addableRows(rows)).toEqual([])
  })

  it('marks a book that is already on her wishlist (D-0053), and leaves it out too', () => {
    const { rows, event } = addScan([], WISHED, library)
    expect(rows[0]).toMatchObject({ kind: 'on-wishlist' })
    expect(rows[0].have?.title).toBe('Babel')
    expect(event).toBe('Already on your wishlist: Babel')
    expect(addableRows(rows)).toEqual([])
  })

  it('keeps the number of an ISBN Open Library does not know, so she can type it by hand', () => {
    const { rows, event } = scan([], UNKNOWN, null)
    expect(rows[0]).toMatchObject({ isbn: UNKNOWN, kind: 'unknown' })
    expect(rows[0].result).toBeUndefined()
    expect(event).toBe(`Not found: ${UNKNOWN}`)
    expect(addableRows(rows)).toEqual([])
  })

  it('lets a failed lookup be tried again, and leaves the rest of the list alone', () => {
    let rows = scan([], NIGHT, found(NIGHT, 'The Night Circus')).rows
    const failed = scan(rows, CIRCE, 'error')
    expect(failed.rows[0]).toMatchObject({ isbn: CIRCE, kind: 'failed' })
    expect(failed.event).toBe(`Could not look up ${CIRCE}.`)
    expect(failed.rows[1]).toMatchObject({ kind: 'found' })
    // Try again
    rows = retryRow(failed.rows, CIRCE)
    expect(rows[0].kind).toBe('looking')
    const ok = settleScan(rows, CIRCE, { ok: true, result: found(CIRCE, 'Circe') })
    expect(ok.rows[0]).toMatchObject({ kind: 'found' })
    expect(addableRows(ok.rows)).toHaveLength(2)
  })

  it('a lookup that comes back after she removed the row changes nothing', () => {
    const rows = addScan([], NIGHT, library).rows
    const left = removeRow(rows, NIGHT)
    const late = settleScan(left, NIGHT, { ok: true, result: found(NIGHT, 'The Night Circus') })
    expect(late.rows).toBe(left)
    expect(late.event).toBe('')
  })

  it('a row can be removed, and scanning that book again puts it back', () => {
    const rows = scan([], NIGHT, found(NIGHT, 'The Night Circus')).rows
    const left = removeRow(rows, NIGHT)
    expect(left).toEqual([])
    expect(scan(left, NIGHT, found(NIGHT, 'The Night Circus')).rows).toHaveLength(1)
  })

  it('holds twenty books in order and never drops one at the cap', () => {
    let rows: ScanRow[] = []
    for (let i = 0; i < 20; i++) {
      const isbn = `978${1000000000 + i * 1000}`
      rows = scan(rows, isbn, found(isbn, `Book ${i}`)).rows
    }
    expect(rows).toHaveLength(20)
    expect(rows[0].result?.title).toBe('Book 19')
    expect(listHeading(rows)).toBe('20 books')
    expect(addAllLabel(rows)).toBe('Add all 20 books')

    for (let i = 20; i < MAX_ROWS; i++) {
      const isbn = `978${1000000000 + i * 1000}`
      rows = scan(rows, isbn, found(isbn, `Book ${i}`)).rows
    }
    expect(rows).toHaveLength(MAX_ROWS)
    // one more: refused out loud, and nothing already in the list is lost
    const over = addScan(rows, '9789999999999', library)
    expect(over.rows).toBe(rows)
    expect(over.event).toBe(`The list is full (${MAX_ROWS} books). Add them before scanning more.`)
    expect(over.rows).toHaveLength(MAX_ROWS)
    expect(over.rows.at(-1)?.result?.title).toBe('Book 0')
  })

  it('a row follows the pile’s formats until she changes that row', () => {
    const rows = scan([], NIGHT, found(NIGHT, 'The Night Circus')).rows
    expect(formatsOfRow(rows[0], DEFAULT_PILE_FORMATS)).toEqual(['paperback'])
    expect(formatsOfRow(rows[0], ['hardcover'])).toEqual(['hardcover'])
    const own = patchRow(rows, NIGHT, { formats: ['ebook'] })
    // her own choice stays, whatever the pile says afterwards
    expect(formatsOfRow(own[0], ['hardcover'])).toEqual(['ebook'])
  })

  it('asks a price only for a bought format, per row (D-0024)', () => {
    const rows = scan([], NIGHT, found(NIGHT, 'The Night Circus')).rows
    for (const f of [['paperback'], ['hardcover'], ['ebook']] as const) {
      expect(rowAsksPrice(rows[0], [...f])).toBe(true)
    }
    for (const f of [['library'], ['borrowed'], ['audiobook'], ['storytel'], ['other'], []] as const) {
      expect(rowAsksPrice(rows[0], [...f])).toBe(false)
    }
    // a row that is not going to be added has no price field at all
    const onShelf = addScan([], PIRANESI, library).rows
    expect(rowAsksPrice(onShelf[0], ['paperback'])).toBe(false)
  })

  it('finds the first price that is not a price, and says which', () => {
    let rows = scan([], NIGHT, found(NIGHT, 'The Night Circus')).rows
    rows = scan(rows, CIRCE, found(CIRCE, 'Circe')).rows
    expect(firstPriceProblem(rows, ['paperback'])).toBeNull()
    rows = patchRow(rows, NIGHT, { price: 'twelve euros' })
    expect(firstPriceProblem(rows, ['paperback'])).toEqual({ isbn: NIGHT, problem: 'format' })
    rows = patchRow(rows, NIGHT, { price: '12,50' })
    rows = patchRow(rows, CIRCE, { price: '99999' })
    expect(firstPriceProblem(rows, ['paperback'])).toEqual({ isbn: CIRCE, problem: 'too-much' })
    // a price on a row with no bought format is not checked at all
    expect(firstPriceProblem(rows, ['library'])).toBeNull()
  })

  it('waits while a lookup is still in flight', () => {
    const rows = addScan([], NIGHT, library).rows
    expect(anyLooking(rows)).toBe(true)
    expect(anyLooking(settleScan(rows, NIGHT, { ok: true, result: found(NIGHT, 'x') }).rows)).toBe(false)
  })

  it('the words it puts on the heading, the button and the summary', () => {
    expect(listHeading([])).toBe('Nothing to add yet')
    expect(addAllLabel([])).toBe('Add all')
    const one = scan([], NIGHT, found(NIGHT, 'The Night Circus')).rows
    expect(listHeading(one)).toBe('1 book')
    expect(addAllLabel(one)).toBe('Add all 1 book')
    // rows that will not be added are not counted in either
    const mixed = addScan(one, PIRANESI, library).rows
    expect(listHeading(mixed)).toBe('1 book')
    expect(addedText(0)).toBe('Added 0 books.')
    expect(addedText(1)).toBe('Added 1 book.')
    expect(addedText(4)).toBe('Added 4 books.')
  })
})
