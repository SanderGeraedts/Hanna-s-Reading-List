import type { Book } from './library'

/** World units: 1 unit ≈ 1 metre. */
export const SHELF = {
  innerWidth: 1.6,
  rowHeight: 0.44,
  board: 0.03,
  side: 0.04,
  depth: 0.3,
  gap: 0.004,
  minRows: 3,
}

export interface BookDims {
  /** width of the cover */
  w: number
  /** height */
  h: number
  /** thickness (spine width) */
  t: number
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

export function bookDims(book: Book): BookDims {
  const r = hash(book.id)
  const h = 0.27 + r * 0.08
  const aspect = Math.min(0.82, Math.max(0.58, book.coverAspect ?? 0.66))
  const pages = book.pages && book.pages > 0 ? book.pages : 280
  const t = Math.min(0.075, Math.max(0.018, 0.012 + pages * 0.000075))
  return { w: h * aspect, h, t }
}

export interface Slot {
  x: number
  y: number
  z: number
  row: number
}

export interface ShelfLayout {
  slots: Map<string, Slot>
  dims: Map<string, BookDims>
  rows: number
  caseWidth: number
  caseHeight: number
}

/** y of the top surface of the board books in `row` stand on (row 0 = top). */
export function rowFloorY(row: number, rows: number) {
  return (rows - 1 - row) * SHELF.rowHeight + SHELF.board
}

/** Packs books left-to-right, top shelf first, wrapping to the next shelf. */
export function computeLayout(books: Book[], minRows = SHELF.minRows): ShelfLayout {
  const dims = new Map<string, BookDims>()
  const placed: Array<{ id: string; row: number; x: number; d: BookDims }> = []
  let row = 0
  let x = 0
  for (const b of books) {
    const d = bookDims(b)
    dims.set(b.id, d)
    if (x > 0 && x + d.t > SHELF.innerWidth) {
      row++
      x = 0
    }
    placed.push({ id: b.id, row, x: x + d.t / 2, d })
    x += d.t + SHELF.gap
  }
  const rows = Math.max(minRows, row + 1)
  const slots = new Map<string, Slot>()
  for (const p of placed) {
    slots.set(p.id, {
      row: p.row,
      x: -SHELF.innerWidth / 2 + p.x,
      y: rowFloorY(p.row, rows) + p.d.h / 2,
      z: SHELF.depth / 2 - p.d.w / 2 - 0.012,
    })
  }
  return {
    slots,
    dims,
    rows,
    caseWidth: SHELF.innerWidth + SHELF.side * 2,
    caseHeight: rows * SHELF.rowHeight + SHELF.board,
  }
}
