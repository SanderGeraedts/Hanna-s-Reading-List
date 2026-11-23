import type { Book, BookFormat } from './library'
import { FORMAT_LABELS } from './library'
import type { IsbnLookup } from '#/server/openLibrary'
import { sameIsbn } from './isbn'
import { asksPrice, parsePrice } from './price'
import type { PriceProblem } from './price'

/**
 * Scanning a pile of books in one go (T-0071, AD2). The camera never stops:
 * each barcode it reads drops into this list, and at the end one **How I have
 * it** covers the whole pile (changeable per book), each book gets its own
 * price field under D-0024's rules, and **Add all** puts them on the shelf.
 *
 * The rules that are easy to get wrong, and are therefore all in here, pure
 * and tested: the same book scanned twice is one row, a book already on her
 * shelf *or* on her wishlist (D-0044) is marked and not added again, an ISBN
 * Open Library doesn't know keeps its number so she can type it by hand, and a
 * lookup that fails can be tried again. Nothing is ever silently dropped: at
 * the cap a further scan is refused out loud instead of pushing the oldest
 * book off the list.
 */

export type ScanKind =
  /** Open Library is being asked about it */
  | 'looking'
  /** a book, ready to add */
  | 'found'
  /** Open Library doesn't know this ISBN */
  | 'unknown'
  /** the lookup itself failed (offline, a bad gateway): she can try again */
  | 'failed'
  | 'on-shelf'
  | 'on-wishlist'

export interface ScanRow {
  /** the ISBN as the scanner read it; the row's key */
  isbn: string
  kind: ScanKind
  /** what Open Library knows about it (kind `found`) */
  result?: IsbnLookup
  /** the copy she already has (kind `on-shelf` or `on-wishlist`) */
  have?: Book
  /** the formats she set on this row herself; unset means it follows the pile's choice */
  formats?: BookFormat[]
  /** the price exactly as she typed it */
  price: string
}

/** How many books the list holds. Past this a scan is refused, never swapped in. */
export const MAX_ROWS = 40

/** What the pile starts as: a barcode on the back of a book is nearly always a paperback. */
export const DEFAULT_PILE_FORMATS: BookFormat[] = ['paperback']

/** What the one live region says about the newest scan. */
export type ScanEvent = string

const title = (row: ScanRow) => row.result?.title ?? row.have?.title ?? row.isbn

/** The row this ISBN is already in, whichever spelling either of them uses. */
export const rowFor = (rows: ScanRow[], isbn: string): ScanRow | undefined =>
  rows.find((r) => sameIsbn(r.isbn, isbn))

/** The copy she already has, on the shelf or on the wishlist; `library` is the whole library. */
function alreadyHas(library: Book[], isbn: string): Book | undefined {
  return library.find((b) => sameIsbn(b.isbn, isbn))
}

/**
 * A barcode the camera just read. Gives the new list and the one line the live
 * region says; the list is unchanged when the book is already in it or the
 * list is full.
 */
export function addScan(rows: ScanRow[], isbn: string, library: Book[]): { rows: ScanRow[]; event: ScanEvent } {
  const already = rowFor(rows, isbn)
  if (already) return { rows, event: `Already in the list: ${title(already)}` }
  if (rows.length >= MAX_ROWS) {
    return { rows, event: `The list is full (${MAX_ROWS} books). Add them before scanning more.` }
  }
  const have = alreadyHas(library, isbn)
  if (have) {
    const kind: ScanKind = have.wish ? 'on-wishlist' : 'on-shelf'
    return {
      rows: [{ isbn, kind, have, price: '' }, ...rows],
      event: `${have.wish ? 'Already on your wishlist' : 'Already on your shelf'}: ${have.title}`,
    }
  }
  return { rows: [{ isbn, kind: 'looking', price: '' }, ...rows], event: `Looking up ${isbn}…` }
}

/** What a lookup came back with. */
export type Outcome = { ok: true; result: IsbnLookup } | { ok: true; result: null } | { ok: false }

/** The list after a lookup finished, and what the live region says. */
export function settleScan(rows: ScanRow[], isbn: string, outcome: Outcome): { rows: ScanRow[]; event: ScanEvent } {
  const row = rowFor(rows, isbn)
  // she removed it while the lookup was in flight: nothing comes back
  if (!row || row.kind !== 'looking') return { rows, event: '' }
  const next: ScanRow = !outcome.ok
    ? { ...row, kind: 'failed' }
    : outcome.result
      ? { ...row, kind: 'found', result: outcome.result }
      : { ...row, kind: 'unknown' }
  const event = !outcome.ok
    ? `Could not look up ${isbn}.`
    : outcome.result
      ? `Added to the list: ${outcome.result.title}`
      : `Not found: ${isbn}`
  return { rows: rows.map((r) => (r === row ? next : r)), event }
}

/** Taking a row off the list; scanning that book again puts it back. */
export const removeRow = (rows: ScanRow[], isbn: string): ScanRow[] => rows.filter((r) => !sameIsbn(r.isbn, isbn))

/** A row set back to `looking`, for **Try again**. */
export const retryRow = (rows: ScanRow[], isbn: string): ScanRow[] =>
  rows.map((r) => (sameIsbn(r.isbn, isbn) ? { ...r, kind: 'looking' as const } : r))

/** One row changed. */
export const patchRow = (rows: ScanRow[], isbn: string, patch: Partial<ScanRow>): ScanRow[] =>
  rows.map((r) => (sameIsbn(r.isbn, isbn) ? { ...r, ...patch } : r))

/** The formats a row will be added with: her own choice for that row, else the pile's. */
export const formatsOfRow = (row: ScanRow, pile: BookFormat[]): BookFormat[] => row.formats ?? pile

/** Whether this row shows a price field: D-0024's rule, per row. */
export const rowAsksPrice = (row: ScanRow, pile: BookFormat[]): boolean =>
  row.kind === 'found' && asksPrice(formatsOfRow(row, pile), 'scan')

/** The rows **Add all** will put on the shelf. */
export const addableRows = (rows: ScanRow[]): ScanRow[] => rows.filter((r) => r.kind === 'found')

/** Whether a lookup is still in flight, so **Add all** waits. */
export const anyLooking = (rows: ScanRow[]): boolean => rows.some((r) => r.kind === 'looking')

/**
 * The first row whose price isn't a price. **Add all** adds nothing at all
 * while there is one: either every addable row goes on the shelf or none does.
 */
export function firstPriceProblem(
  rows: ScanRow[],
  pile: BookFormat[],
): { isbn: string; problem: PriceProblem } | null {
  for (const row of rows) {
    if (!rowAsksPrice(row, pile)) continue
    const parsed = parsePrice(row.price)
    if (!parsed.ok) return { isbn: row.isbn, problem: parsed.problem }
  }
  return null
}

/** "Add all 4 books", "Add all 1 book", or plain "Add all" when there is nothing to add. */
export function addAllLabel(rows: ScanRow[]): string {
  const n = addableRows(rows).length
  return n === 0 ? 'Add all' : `Add all ${n} book${n === 1 ? '' : 's'}`
}

/** The list's heading: "4 books", "1 book", or "Nothing to add yet". */
export function listHeading(rows: ScanRow[]): string {
  const n = addableRows(rows).length
  return n === 0 ? 'Nothing to add yet' : `${n} book${n === 1 ? '' : 's'}`
}

/** What the summary says once **Add all** has run. */
export const addedText = (n: number): string => `Added ${n} book${n === 1 ? '' : 's'}.`

/** How a row says it is had, when its own chips are shut: "Paperback", "Paperback · E-book", "Not set". */
export function formatList(formats: BookFormat[]): string {
  const names = formats.map((f) => FORMAT_LABELS[f])
  return names.length ? names.join(' · ') : 'Not set'
}
