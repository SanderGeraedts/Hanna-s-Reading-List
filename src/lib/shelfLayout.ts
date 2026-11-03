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

export type DecorKind = 'koala' | 'succulent' | 'frame' | 'candle' | 'vase'

/** Decorations in placement order (the koala always comes first) and their footprint width. */
export const DECOR: Array<{ kind: DecorKind; width: number }> = [
  { kind: 'koala', width: 0.17 },
  { kind: 'succulent', width: 0.11 },
  { kind: 'frame', width: 0.15 },
  { kind: 'candle', width: 0.08 },
  { kind: 'vase', width: 0.11 },
]
const DECOR_PER_ROW = 2
const DECOR_GAP = 0.05
const DECOR_MARGIN = 0.035

export interface DecorSlot {
  kind: DecorKind
  /** centre x, and the y of the shelf surface it stands on */
  x: number
  floorY: number
  row: number
}

/** A book nook: a little lit alley in a book-sized box, standing between groups of books. */
export const NOOK = { width: 0.12, height: 0.3, depth: 0.22, gap: 0.012 }

export interface NookSlot {
  /** id of the book the nook stands in front of */
  before: string
  /** the group that starts after the nook, painted on its hanging sign */
  label: string
  x: number
  floorY: number
  row: number
}

export interface ShelfLayout {
  slots: Map<string, Slot>
  decor: DecorSlot[]
  nooks: NookSlot[]
  dims: Map<string, BookDims>
  innerWidth: number
  rows: number
  caseWidth: number
  caseHeight: number
}

/** y of the top surface of the board books in `row` stand on (row 0 = top). */
export function rowFloorY(row: number, rows: number) {
  return (rows - 1 - row) * SHELF.rowHeight + SHELF.board
}

export interface ShelfFit {
  innerWidth: number
  minRows: number
}

/** Header room and side margin the camera keeps around the bookcase. */
export const FRAME = { vertical: 1.28, horizontal: 1.12 }

/**
 * Shapes the bookcase to the screen: wide on desktop, narrow and taller on a
 * portrait phone so the camera can come closer and the books appear bigger.
 * Widths are quantised so small viewport changes (mobile URL bar) don't reflow.
 */
export function shelfFitFor(aspect: number): ShelfFit {
  const sides = SHELF.side * 2
  // a pleasant width for this screen shape, and the case height that pairs with it
  const target = clamp(aspect * 1.45, 0.6, SHELF.innerWidth)
  const pairedHeight = ((target + sides) * FRAME.horizontal) / (aspect * FRAME.vertical)
  const minRows = Math.max(
    SHELF.minRows,
    Math.round((pairedHeight - SHELF.board) / SHELF.rowHeight),
  )
  // now pick the width that makes exactly `minRows` shelves fill the screen
  const caseHeight = minRows * SHELF.rowHeight + SHELF.board
  const fitted = (caseHeight * FRAME.vertical * aspect) / FRAME.horizontal - sides
  const innerWidth = clamp(Math.floor(fitted * 20) / 20, 0.6, SHELF.innerWidth)
  return { innerWidth, minRows }
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

/** Packs books left-to-right, top shelf first, wrapping to the next shelf. */
export function computeLayout(
  books: Book[],
  { innerWidth = SHELF.innerWidth, minRows = SHELF.minRows }: Partial<ShelfFit> = {},
  /** book id -> label of a nook to stand just before that book */
  nooksBefore: Map<string, string> = new Map(),
): ShelfLayout {
  const dims = new Map<string, BookDims>()
  const placed: Array<{ id: string; row: number; x: number; d: BookDims }> = []
  const nookPlaced: Array<{ before: string; label: string; row: number; x: number }> = []
  let row = 0
  let x = 0
  const fit = (width: number) => {
    if (x > 0 && x + width > innerWidth) {
      row++
      x = 0
    }
  }
  for (const b of books) {
    const d = bookDims(b)
    dims.set(b.id, d)
    const label = nooksBefore.get(b.id)
    if (label !== undefined) {
      fit(NOOK.width + NOOK.gap * 2)
      nookPlaced.push({ before: b.id, label, row, x: x + NOOK.gap + NOOK.width / 2 })
      x += NOOK.width + NOOK.gap * 2
    }
    fit(d.t)
    placed.push({ id: b.id, row, x: x + d.t / 2, d })
    x += d.t + SHELF.gap
  }
  // right edge of the books (and nooks) on each shelf
  const usedEnd = (r: number) => {
    let end = 0
    for (const p of placed) if (p.row === r) end = Math.max(end, p.x + p.d.t / 2)
    for (const n of nookPlaced) if (n.row === r) end = Math.max(end, n.x + NOOK.width / 2)
    return end
  }
  // fill free space at the right end of each shelf with decorations
  const placeDecor = (rowCount: number) => {
    const out: Array<Omit<DecorSlot, 'floorY'>> = []
    let next = 0
    for (let r = 0; r < rowCount && next < DECOR.length; r++) {
      let right = innerWidth - DECOR_MARGIN
      const left = usedEnd(r) + DECOR_MARGIN
      for (let n = 0; n < DECOR_PER_ROW && next < DECOR.length; n++) {
        const d = DECOR[next]
        if (right - d.width < left) break
        out.push({ kind: d.kind, x: -innerWidth / 2 + right - d.width / 2, row: r })
        right -= d.width + DECOR_GAP
        next++
      }
    }
    return out
  }

  let rows = Math.max(minRows, row + 1)
  let decor = placeDecor(rows)
  // there is always room for at least one koala: grow a shelf if needed
  if (!decor.some((d) => d.kind === 'koala')) {
    rows++
    decor = placeDecor(rows)
  }
  const slots = new Map<string, Slot>()
  for (const p of placed) {
    slots.set(p.id, {
      row: p.row,
      x: -innerWidth / 2 + p.x,
      y: rowFloorY(p.row, rows) + p.d.h / 2,
      z: SHELF.depth / 2 - p.d.w / 2 - 0.012,
    })
  }
  return {
    slots,
    decor: decor.map((d) => ({ ...d, floorY: rowFloorY(d.row, rows) })),
    nooks: nookPlaced.map((n) => ({
      ...n,
      x: -innerWidth / 2 + n.x,
      floorY: rowFloorY(n.row, rows),
    })),
    dims,
    innerWidth,
    rows,
    caseWidth: innerWidth + SHELF.side * 2,
    caseHeight: rows * SHELF.rowHeight + SHELF.board,
  }
}
