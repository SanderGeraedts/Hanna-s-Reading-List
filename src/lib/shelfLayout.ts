import type { Book } from './library'
import { seriesGroups } from './series'
import { thicknessPages } from './listening'
import type { NookThemeId } from './nookThemes'

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

/**
 * A book's size. The height varies a little from book to book, but books in
 * the same series (`seriesKey`, see seriesGroups) all get the same height.
 */
export function bookDims(book: Book, seriesKey?: string): BookDims {
  const r = hash(seriesKey ? `series:${seriesKey}` : book.id)
  const h = 0.27 + r * 0.08
  const aspect = Math.min(0.82, Math.max(0.58, book.coverAspect ?? 0.66))
  // an audiobook she only listens to: a minute counts as a page (#48)
  const pages = thicknessPages(book) ?? 280
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
  /** every book of this series on the shelf is read (series only) */
  complete?: boolean
  /** a finished series: how many times every book has been read; the nook wears a medal for it */
  medal?: number
  /** the whole series is a sleep read: a moon on the sign */
  sleep?: boolean
  /** nooks: the scene inside, and this group's own version of it */
  theme?: NookThemeId
  variant?: number
}

/** A slim labelled marker standing before each series when sorted by series. */
export const DIVIDER = { width: 0.03, height: 0.2, depth: 0.15, gap: 0.008 }

export type DividerSlot = NookSlot

/** What stands just before a book: a nook (between reading-status groups) or a series divider. */
export interface Separator {
  kind: 'nook' | 'divider'
  label: string
  /** a series whose books on the shelf are all read: the divider turns gold */
  complete?: boolean
  /** a finished series: how many times every book has been read, for its medal */
  medal?: number
  /** the whole series is a sleep read */
  sleep?: boolean
  /** nooks: the scene inside, and this group's own version of it */
  theme?: NookThemeId
  variant?: number
}

export interface ShelfLayout {
  slots: Map<string, Slot>
  decor: DecorSlot[]
  nooks: NookSlot[]
  dividers: DividerSlot[]
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
  if (aspect < 0.8) {
    // phone held upright: a narrow case across the full width, scrolled vertically,
    // so the books come out large enough to read and tap
    const innerWidth = clamp(Math.floor(aspect * 1.25 * 20) / 20, 0.5, SHELF.innerWidth)
    const viewHeight = ((innerWidth + sides) * 1.09) / aspect
    return { innerWidth, minRows: Math.max(2, Math.ceil((viewHeight * 0.75) / SHELF.rowHeight)) }
  }
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
  /** book id -> what stands just before that book */
  separators: Map<string, Separator> = new Map(),
): ShelfLayout {
  const dims = new Map<string, BookDims>()
  const placed: Array<{ id: string; row: number; x: number; d: BookDims }> = []
  const sepPlaced: Array<{
    before: string
    label: string
    row: number
    x: number
    kind: Separator['kind']
    complete?: boolean
    medal?: number
    sleep?: boolean
    theme?: NookThemeId
    variant?: number
  }> = []
  let row = 0
  let x = 0
  const fit = (width: number) => {
    if (x > 0 && x + width > innerWidth) {
      row++
      x = 0
    }
  }
  const series = seriesGroups(books)
  for (const b of books) {
    const d = bookDims(b, series.get(b.id)?.key || undefined)
    dims.set(b.id, d)
    const sep = separators.get(b.id)
    if (sep) {
      const { width, gap } = sep.kind === 'nook' ? NOOK : DIVIDER
      // keep the marker on the same shelf as the book it introduces
      fit(width + gap * 2 + d.t)
      sepPlaced.push({
        before: b.id,
        label: sep.label,
        kind: sep.kind,
        row,
        x: x + gap + width / 2,
        ...(sep.complete && { complete: true }),
        ...(sep.medal && { medal: sep.medal }),
        ...(sep.sleep && { sleep: true }),
        ...(sep.theme && { theme: sep.theme, variant: sep.variant }),
      })
      x += width + gap * 2
    }
    fit(d.t)
    placed.push({ id: b.id, row, x: x + d.t / 2, d })
    x += d.t + SHELF.gap
  }
  // right edge of the books (and nooks) on each shelf
  const usedEnd = (r: number) => {
    let end = 0
    for (const p of placed) if (p.row === r) end = Math.max(end, p.x + p.d.t / 2)
    for (const n of sepPlaced) {
      const width = n.kind === 'nook' ? NOOK.width : DIVIDER.width
      if (n.row === r) end = Math.max(end, n.x + width / 2)
    }
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
  const placedOf = (kind: Separator['kind']) =>
    sepPlaced
      .filter((n) => n.kind === kind)
      .map(({ before, label, row, x, complete, medal, sleep, theme, variant }) => ({
        before,
        label,
        ...(complete && { complete }),
        ...(medal && { medal }),
        ...(sleep && { sleep }),
        ...(theme && { theme, variant }),
        row,
        x: -innerWidth / 2 + x,
        floorY: rowFloorY(row, rows),
      }))
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
    nooks: placedOf('nook'),
    dividers: placedOf('divider'),
    dims,
    innerWidth,
    rows,
    caseWidth: innerWidth + SHELF.side * 2,
    caseHeight: rows * SHELF.rowHeight + SHELF.board,
  }
}

/** The widest a desktop bookcase may grow to fill a large, wide screen. */
export const MAX_INNER_WIDTH = 4

/**
 * The bookcase for this screen and these books (#39). Phones keep the narrow,
 * scrolling case. On a desktop the whole case is always in view, so a full
 * shelf used to grow taller and taller and the books got small, with empty
 * space left and right. Here the case also tries wider widths and keeps the
 * one that shows the books largest on this screen: the case's shape follows
 * the screen's.
 */
export function fitShelf(books: Book[], aspect: number, separators: Map<string, Separator> = new Map()): ShelfFit {
  const base = shelfFitFor(aspect)
  if (aspect < 0.8) return base
  const sides = SHELF.side * 2
  // how far the camera has to be to show the whole case (the same sums as the camera rig)
  const distance = (innerWidth: number) => {
    const { caseHeight } = computeLayout(books, { innerWidth, minRows: base.minRows }, separators)
    return Math.max(((innerWidth + sides) * FRAME.horizontal) / aspect, caseHeight * FRAME.vertical)
  }
  let best = base
  let bestDistance = distance(base.innerWidth)
  for (let w = base.innerWidth + 0.1; w <= MAX_INNER_WIDTH + 1e-9; w += 0.1) {
    const innerWidth = Math.round(w * 10) / 10
    const d = distance(innerWidth)
    // only take a wider case when the books come out clearly bigger
    if (d < bestDistance * 0.98) {
      best = { innerWidth, minRows: base.minRows }
      bestDistance = d
    }
  }
  return best
}
