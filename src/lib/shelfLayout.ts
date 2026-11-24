import type { Book } from './library'
import { seriesGroups } from './series'
import { thicknessPages } from './listening'
import type { NookThemeId } from './nookThemes'
import { poseOf } from './pose'
import type { BookPose } from './pose'

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
  /** the pose the shelf actually draws this book in (D-0044 §7: standing when its own doesn't fit) */
  pose: BookPose
}

/**
 * How much room a book takes in each direction in a pose (D-0044 §4):
 * `along` the shelf, `up` from the shelf floor and `deep` into the case.
 */
export function footprint(d: BookDims, pose: BookPose): { along: number; up: number; deep: number } {
  if (pose === 'faceout') return { along: d.w, up: d.h, deep: d.t }
  if (pose === 'flat') return { along: d.h, up: d.t, deep: d.w }
  return { along: d.t, up: d.h, deep: d.w }
}

/** How far a stack of flat books may grow before it reaches the shelf above. */
export const stackRoom = () => SHELF.rowHeight - SHELF.board - SHELF.gap

/** A flat book in a stack is nudged a couple of millimetres along the shelf, alternately. */
export const STACK_SHIFT = 0.002

export type DecorKind = 'shelf-pet' | 'koala' | 'succulent' | 'frame' | 'candle' | 'vase' | 'cat' | 'mug' | 'ivy' | ShopDecorKind
/** Decorations she buys in the creature shop (T-0031): on the shelves only once bought. */
export type ShopDecorKind = 'dragon-plush' | 'pennant' | 'egg-display' | 'snow-globe'

/**
 * Decorations in placement order and their footprint width. `'shelf-pet'` comes FIRST
 * so the favourite creature always gets the right-hand end of the top row (T-0033 §8a);
 * the koala and the rest follow on later shelves (the layout code pushes books along to
 * make room).
 */
export const DECOR: Array<{ kind: DecorKind; width: number }> = [
  { kind: 'shelf-pet', width: 0.17 },
  { kind: 'koala', width: 0.17 },
  // the newer ones first, so they get a shelf before the older ones
  { kind: 'cat', width: 0.18 },
  { kind: 'mug', width: 0.1 },
  { kind: 'ivy', width: 0.11 },
  { kind: 'candle', width: 0.08 },
  { kind: 'succulent', width: 0.11 },
  { kind: 'frame', width: 0.15 },
  { kind: 'vase', width: 0.11 },
]
/** The shop's decorations (T-0031 Design §2, each at most 0.16 wide), in shop order. */
export const SHOP_DECOR: Array<{ kind: ShopDecorKind; width: number }> = [
  { kind: 'dragon-plush', width: 0.16 },
  { kind: 'pennant', width: 0.16 },
  { kind: 'egg-display', width: 0.13 },
  { kind: 'snow-globe', width: 0.11 },
]
const ALL_DECOR = [...DECOR, ...SHOP_DECOR]
/** at most one decoration per shelf, so the books stay the main thing */
const DECOR_PER_ROW = 1
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

/** height of the crown moulding on top of the bookcase (BookshelfScene's Bookcase) */
export const CROWN_HEIGHT = 0.08

/**
 * Scrolled to the top, how far the top of the view is above the top of the
 * case (world units). Without a header height (desktops): 14% of the view, as
 * before. On a phone the header's real height decides (#181): the crown and
 * the top shelf start below it, so the header never covers the top shelf.
 */
export function topGap(viewH: number, worldPerPx: number, headerPx: number) {
  const base = viewH * 0.14
  if (!(headerPx > 0)) return base
  return Math.max(base, (headerPx + 8) * worldPerPx + CROWN_HEIGHT)
}

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
  /** the decorations she picked, in shelf order (Make the room yours); all of them (except the optional shelf-pet) by default */
  decorKinds: DecorKind[] = DECOR.map((d) => d.kind).filter((k) => k !== 'shelf-pet'),
): ShelfLayout {
  const decorList = decorKinds.map((k) => ALL_DECOR.find((d) => d.kind === k)!).filter(Boolean)
  const dims = new Map<string, BookDims>()
  /** `yUp` is the book's centre above the shelf floor; the absolute y follows once `rows` is known */
  const placed: Array<{ id: string; row: number; x: number; yUp: number; z: number; along: number; pose: BookPose }> = []
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
  // every shelf keeps a spot at its right end for its decoration (one per
  // shelf, in DECOR order), so full shelves still get their cat, mug or ivy
  const roomFor = (r: number) => innerWidth - (r < decorList.length ? decorList[r].width + DECOR_MARGIN * 2 : 0)
  /**
   * What a flat pile or a face-out book may use on any shelf: the whole inner width.
   * A decoration is only ever *placed* where the books left room for it (`placeDecor`
   * walks down the shelves), so letting a pose have the end of a shelf moves that
   * shelf's cat or mug down to the next one instead of standing on it (D-0073 §1).
   */
  const poseRoom = innerWidth - DECOR_MARGIN * 2
  const fit = (width: number, roomy = false) => {
    if (x > 0 && x + width > (roomy ? poseRoom : roomFor(row))) {
      row++
      x = 0
    }
  }
  const series = seriesGroups(books)
  for (const b of books) dims.set(b.id, bookDims(b, series.get(b.id)?.key || undefined))
  // the depth of a book's centre, so every pose's front face sits on the shelf's front line
  const depthZ = (deep: number) => SHELF.depth / 2 - deep / 2 - 0.012
  /**
   * The books in placement order, grouped into items: one book on its own, or a
   * stack of neighbouring flat books (D-0044 §5). A separator starts a new item,
   * so a nook or divider is never swallowed by a stack.
   */
  // A pose is drawn when a shelf of this bookcase has room for it at all (`poseRoom`, D-0073 §1,
  // widening D-0044 §7, which measured it against the most cramped shelf and so dropped the pose
  // on a phone, where a decoration takes nearly half the width — that is #271). Otherwise the
  // book stands, with her saved pose untouched, exactly as before.
  const poseFor = (b: Book): BookPose => {
    const want = poseOf(b)
    if (want === 'standing') return want
    return footprint(dims.get(b.id)!, want).along <= poseRoom ? want : 'standing'
  }
  const items: Array<{ books: Book[]; pose: BookPose }> = []
  for (const b of books) {
    const pose = poseFor(b)
    const last = items[items.length - 1]
    const joins = pose === 'flat' && last?.pose === 'flat' && !separators.has(b.id)
    if (joins) last.books.push(b)
    else items.push({ books: [b], pose })
  }

  for (const item of items) {
    const first = item.books[0]
    const sep = separators.get(first.id)
    if (sep) {
      const { width, gap } = sep.kind === 'nook' ? NOOK : DIVIDER
      // keep the marker on the same shelf as the book it introduces
      fit(width + gap * 2 + footprint(dims.get(first.id)!, poseFor(first)).along)
      sepPlaced.push({
        before: first.id,
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
    if (item.pose !== 'flat') {
      // a single standing or face-out book
      const f = footprint(dims.get(first.id)!, item.pose)
      fit(f.along, item.pose === 'faceout')
      placed.push({ id: first.id, row, x: x + f.along / 2, yUp: f.up / 2, z: depthZ(f.deep), along: f.along, pose: item.pose })
      x += f.along + SHELF.gap
      continue
    }
    // a run of flat books: one or more stacks, each as wide as its widest book
    let rest = item.books
    while (rest.length) {
      const stack: Book[] = []
      let height = 0
      for (const b of rest) {
        const up = footprint(dims.get(b.id)!, 'flat').up
        // a stack never grows through the shelf above
        if (stack.length && height + up > stackRoom()) break
        stack.push(b)
        height += up
      }
      const along = Math.max(...stack.map((b) => footprint(dims.get(b.id)!, 'flat').along))
      fit(along, true)
      const centre = x + along / 2
      let up = 0
      stack.forEach((b, i) => {
        const f = footprint(dims.get(b.id)!, 'flat')
        placed.push({
          id: b.id,
          row,
          // stacked by hand, not machined: every book but the bottom one is nudged a little
          x: centre + (i === 0 ? 0 : i % 2 ? STACK_SHIFT : -STACK_SHIFT),
          yUp: up + f.up / 2,
          z: depthZ(f.deep),
          along: f.along,
          pose: 'flat',
        })
        up += f.up
      })
      x += along + SHELF.gap
      rest = rest.slice(stack.length)
    }
  }
  // right edge of the books (and nooks) on each shelf
  const usedEnd = (r: number) => {
    let end = 0
    for (const p of placed) if (p.row === r) end = Math.max(end, p.x + p.along / 2)
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
    for (let r = 0; r < rowCount && next < decorList.length; r++) {
      let right = innerWidth - DECOR_MARGIN
      const left = usedEnd(r) + DECOR_MARGIN
      for (let n = 0; n < DECOR_PER_ROW && next < decorList.length; n++) {
        const d = decorList[next]
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
  // there is always room for the first decoration she picked (the koala, unless she changed it): grow a shelf if needed
  if (decorList.length && !decor.some((d) => d.kind === decorList[0].kind)) {
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
      y: rowFloorY(p.row, rows) + p.yUp,
      z: p.z,
      pose: p.pose,
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
