import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { dropOrder } from './shelfDrop'
import { computeLayout, footprint, rowFloorY } from './shelfLayout'

/** Dragging a book onto a pile (#271, D-0073 §4). */

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Rick Riordan'],
  color: '#335577',
  status: 'want',
  addedAt: 0,
  pages: 300,
  ...extra,
})

/** a wide case with no decorations, so every book lands where it is put */
const laid = (books: Book[]) => computeLayout(books, { innerWidth: 1.6, minRows: 3 }, undefined, [])

/** the point in the middle of a book as it stands on the shelf */
const middleOf = (layout: ReturnType<typeof laid>, id: string) => {
  const slot = layout.slots.get(id)!
  return { x: slot.x, y: slot.y }
}

describe('a book dropped on a pile joins it', () => {
  const pile = ['f1', 'f2', 'f3'].map((id) => book(id, { pose: 'flat' }))
  const others = [book('before'), ...pile, book('after')]
  const layout = laid(others)

  it('goes on top of the pile and is laid flat, wherever on the pile it is dropped', () => {
    for (const on of ['f1', 'f2', 'f3']) {
      const { x, y } = middleOf(layout, on)
      const drop = dropOrder(others, layout, 'new', x, y)
      expect(drop.lay).toBe(true)
      // straight after the pile's topmost book, so the layout puts it on top of it
      expect(drop.order).toEqual(['before', 'f1', 'f2', 'f3', 'new', 'after'])
    }
  })

  it('counts the whole width of the pile, not just the book under the pointer', () => {
    const slot = layout.slots.get('f2')!
    const along = footprint(layout.dims.get('f2')!, 'flat').along
    for (const x of [slot.x - along / 2 + 0.001, slot.x + along / 2 - 0.001]) {
      expect(dropOrder(others, layout, 'new', x, slot.y).lay).toBe(true)
    }
  })

  it('leaves a book dropped beside the pile standing, between its neighbours', () => {
    const slot = layout.slots.get('before')!
    const drop = dropOrder(others, layout, 'new', slot.x, slot.y)
    expect(drop.lay).toBe(false)
    expect(drop.order).toEqual(['before', 'new', 'f1', 'f2', 'f3', 'after'])
  })

  it('is not fooled by a pile on another shelf, straight above or below the pointer', () => {
    const many = [...Array.from({ length: 40 }, (_, i) => book(`s${i}`, { pages: 600 })), ...pile]
    const l = laid(many)
    const top = l.slots.get('f3')!
    const elsewhere = [...l.slots.entries()].find(([, s]) => s.row !== top.row && s.pose === 'standing')!
    const drop = dropOrder(many, l, 'new', top.x, elsewhere[1].y)
    expect(drop.lay).toBe(false)
  })
})

describe('a drop that is not on a pile lands exactly where it always did', () => {
  const shelf = Array.from({ length: 12 }, (_, i) => book(`b${i}`))
  const layout = laid(shelf)

  it('puts the book before the first book to the right of the pointer', () => {
    const slot = layout.slots.get('b5')!
    expect(dropOrder(shelf, layout, 'new', slot.x - 0.001, slot.y).order.indexOf('new')).toBe(5)
  })

  it('puts it at the end of a shelf when the pointer is past every book on it', () => {
    const last = layout.slots.get('b11')!
    const drop = dropOrder(shelf, layout, 'new', 0.79, last.y)
    expect(drop.order[drop.order.length - 1]).toBe('new')
  })

  it('puts it after the books above when the shelf under the pointer is empty', () => {
    const empty = rowFloorY(layout.rows - 1, layout.rows)
    const drop = dropOrder(shelf, layout, 'new', 0, empty)
    expect(drop.lay).toBe(false)
    expect(drop.order).toHaveLength(13)
  })
})
