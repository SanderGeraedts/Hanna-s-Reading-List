import type { Book } from './library'
import { SHELF, footprint, rowFloorY } from './shelfLayout'
import type { ShelfLayout } from './shelfLayout'

/** Where a dragged book lands, and whether it lands on a pile. */
export interface Drop {
  /** her whole arrangement with the dragged book put in its new place */
  order: string[]
  /** the drop is on a lying book or its pile, so the book is laid flat too (D-0073 §4) */
  lay: boolean
}

/**
 * Where a book being dragged over the shelf would land (D-0073 §4).
 *
 * `others` is her arrangement without the dragged book, and `layout` is that
 * arrangement laid out, so the place is read off the shelf she can actually see.
 * The pointer is in world units: `x` across the case from its middle, `y` up
 * from the floor of the case.
 *
 * Dropped on a book lying flat — or anywhere on the pile it is part of, since a
 * pile shares one place along the shelf — the book goes **on top**: straight
 * after that pile's topmost book in her arrangement, and lying flat. Everywhere
 * else it lands between the books of the shelf it is over, as it always did.
 */
export function dropOrder(others: Book[], layout: ShelfLayout, id: string, x: number, y: number): Drop {
  // which shelf is the pointer over?
  let row = 0
  for (let r = 0; r < layout.rows; r++) {
    row = r
    if (y >= rowFloorY(r, layout.rows) - SHELF.board) break
  }
  const inRow = others.filter((b) => layout.slots.get(b.id)!.row === row)
  const place = (index: number, lay: boolean): Drop => {
    const ids = others.map((b) => b.id)
    ids.splice(index, 0, id)
    return { order: ids, lay }
  }

  const onPile = inRow.filter((b) => {
    const slot = layout.slots.get(b.id)!
    if (slot.pose !== 'flat') return false
    const along = footprint(layout.dims.get(b.id)!, 'flat').along
    return x >= slot.x - along / 2 && x <= slot.x + along / 2
  })
  if (onPile.length) return place(others.indexOf(onPile[onPile.length - 1]) + 1, true)

  const before = inRow.find((b) => layout.slots.get(b.id)!.x > x)
  if (before) return place(others.indexOf(before), false)
  if (inRow.length) return place(others.indexOf(inRow[inRow.length - 1]) + 1, false)
  // an empty shelf: go after the last book on any shelf above it
  const above = others.filter((b) => layout.slots.get(b.id)!.row < row)
  return place(above.length ? others.indexOf(above[above.length - 1]) + 1 : 0, false)
}
