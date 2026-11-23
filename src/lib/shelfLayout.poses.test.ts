import { describe, expect, it } from 'vitest'
import type { Book } from './library'
import { SHELF, STACK_SHIFT, bookDims, computeLayout, footprint, rowFloorY, stackRoom } from './shelfLayout'

/** Book poses on the shelf (T-0052, D-0044). */

const book = (id: string, title: string, extra: Partial<Book> = {}): Book => ({
  id,
  title,
  authors: ['Rick Riordan'],
  color: '#335577',
  status: 'want',
  addedAt: 0,
  ...extra,
})

/** no decorations, so a shelf's whole inner width is for the books */
const layoutOf = (books: Book[], innerWidth = 1.6) => computeLayout(books, { innerWidth, minRows: 3 }, undefined, [])

describe('how much room a pose takes (D-0044 §4)', () => {
  const d = { w: 0.2, h: 0.3, t: 0.04 }

  it('gives each pose its own footprint', () => {
    expect(footprint(d, 'standing')).toEqual({ along: 0.04, up: 0.3, deep: 0.2 })
    expect(footprint(d, 'faceout')).toEqual({ along: 0.2, up: 0.3, deep: 0.04 })
    expect(footprint(d, 'flat')).toEqual({ along: 0.3, up: 0.04, deep: 0.2 })
  })
})

describe('a face-out book on the shelf', () => {
  const shelf = [book('a', 'One'), book('b', 'Two'), book('c', 'Three')]
  const plain = layoutOf(shelf)
  const posed = layoutOf([shelf[0], { ...shelf[1], pose: 'faceout' }, shelf[2]])

  it('takes its cover width and pushes the books after it along by exactly that much more', () => {
    const d = plain.dims.get('b')!
    expect(posed.slots.get('b')!.pose).toBe('faceout')
    expect(posed.slots.get('a')!.x).toBeCloseTo(plain.slots.get('a')!.x, 9)
    expect(posed.slots.get('b')!.x - plain.slots.get('b')!.x).toBeCloseTo((d.w - d.t) / 2, 9)
    expect(posed.slots.get('c')!.x - plain.slots.get('c')!.x).toBeCloseTo(d.w - d.t, 9)
  })

  it('keeps its front face on the front line of the shelf, and its full height', () => {
    const d = posed.dims.get('b')!
    const slot = posed.slots.get('b')!
    expect(slot.z + d.t / 2).toBeCloseTo(SHELF.depth / 2 - 0.012, 9)
    expect(slot.y - rowFloorY(slot.row, posed.rows)).toBeCloseTo(d.h / 2, 9)
  })

  it('fits fewer books on a case than the same books standing', () => {
    const many = Array.from({ length: 40 }, (_, i) => book(`f${i}`, `Book ${i}`))
    const standing = layoutOf(many)
    const faceOut = layoutOf(many.map((b) => ({ ...b, pose: 'faceout' as const })))
    expect(faceOut.rows).toBeGreaterThan(standing.rows)
  })
})

describe('flat books stack (D-0044 §5)', () => {
  const flat = (id: string, pages: number) => book(id, `Flat ${id}`, { pose: 'flat', pages })
  const shelf = [book('before', 'Standing'), flat('f1', 200), flat('f2', 200), flat('f3', 200), book('after', 'Also standing')]
  const layout = layoutOf(shelf)
  const slot = (id: string) => layout.slots.get(id)!

  it('puts neighbouring flat books in one place, one on top of the other', () => {
    expect([slot('f1').pose, slot('f2').pose, slot('f3').pose]).toEqual(['flat', 'flat', 'flat'])
    expect(slot('f1').row).toBe(slot('f3').row)
    expect(Math.abs(slot('f2').x - slot('f1').x)).toBeLessThanOrEqual(STACK_SHIFT + 1e-9)
    expect(Math.abs(slot('f3').x - slot('f1').x)).toBeLessThanOrEqual(STACK_SHIFT + 1e-9)
    const t = layout.dims.get('f1')!.t
    expect(slot('f1').y - rowFloorY(slot('f1').row, layout.rows)).toBeCloseTo(t / 2, 9)
    expect(slot('f2').y - slot('f1').y).toBeCloseTo(t, 9)
    expect(slot('f3').y - slot('f2').y).toBeCloseTo(t, 9)
  })

  it('takes one book of room along the shelf, and the packing goes on after it', () => {
    // the stack is as wide as its widest book (books vary a little in height)
    const h = Math.max(...['f1', 'f2', 'f3'].map((id) => layout.dims.get(id)!.h))
    const left = slot('before').x + layout.dims.get('before')!.t / 2
    expect(slot('f1').x - h / 2).toBeCloseTo(left + SHELF.gap, 9)
    expect(slot('after').x - layout.dims.get('after')!.t / 2).toBeCloseTo(left + SHELF.gap + h + SHELF.gap, 9)
  })

  it('starts a new stack beside it rather than reaching through the shelf above', () => {
    const thick = Array.from({ length: 12 }, (_, i) => flat(`g${i}`, 700))
    const tall = layoutOf(thick)
    const xs = new Set([...tall.slots.values()].map((s) => Math.round(s.x * 1000)))
    expect(xs.size).toBeGreaterThan(1)
    for (const [id, s] of tall.slots) {
      const t = tall.dims.get(id)!.t
      expect(s.y + t / 2 - rowFloorY(s.row, tall.rows)).toBeLessThanOrEqual(stackRoom() + 1e-9)
    }
  })

  it('does not stack flat books that are not neighbours', () => {
    const mixed = [flat('a', 200), book('mid', 'Between'), flat('b', 200)]
    const l = layoutOf(mixed)
    expect(Math.abs(l.slots.get('a')!.x - l.slots.get('b')!.x)).toBeGreaterThan(0.01)
    expect(l.slots.get('a')!.y).toBeCloseTo(l.slots.get('b')!.y, 9)
  })

  it('never splits a stack across two shelves', () => {
    const filler = Array.from({ length: 30 }, (_, i) => book(`s${i}`, `Standing ${i}`, { pages: 600 }))
    const run = [flat('r1', 200), flat('r2', 200)]
    const l = layoutOf([...filler, ...run])
    expect(l.slots.get('r1')!.row).toBe(l.slots.get('r2')!.row)
  })
})

describe('a pose that cannot fit falls back to standing (D-0044 §7)', () => {
  it('stands a flat book on a case too narrow for it, and keeps the field', () => {
    const b = book('wide', 'Wide', { pose: 'flat' })
    expect(layoutOf([b], 0.2).slots.get('wide')!.pose).toBe('standing')
    expect(b.pose).toBe('flat')
    expect(layoutOf([b], 1.6).slots.get('wide')!.pose).toBe('flat')
  })

  it('stands a face-out book when even an empty shelf has no room for its cover', () => {
    const b = book('fo', 'Face out', { pose: 'faceout' })
    const d = bookDims(b)
    expect(layoutOf([b], d.w - 0.01).slots.get('fo')!.pose).toBe('standing')
    expect(layoutOf([b], d.w + 0.01).slots.get('fo')!.pose).toBe('faceout')
  })

  it('counts the room a decoration keeps on the most cramped shelf', () => {
    const b = book('fo2', 'Face out', { pose: 'faceout' })
    const d = bookDims(b)
    // a case just wide enough for the cover, but not once a decoration keeps its spot
    const l = computeLayout([b], { innerWidth: d.w + 0.05, minRows: 3 }, undefined, ['cat'])
    expect(l.slots.get('fo2')!.pose).toBe('standing')
  })
})

describe('every posed book stays inside the case', () => {
  const seeded = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const pose = i % 3 === 0 ? ('flat' as const) : i % 7 === 0 ? ('faceout' as const) : undefined
      return book(`p${i}`, `Posed ${i}`, { pages: 120 + ((i * 53) % 600), ...(pose && { pose }) })
    })

  for (const n of [150, 400])
    it(`keeps ${n} books inside the inner width and under the shelf above`, () => {
      for (const innerWidth of [0.5, 0.8, 1.6]) {
        const l = layoutOf(seeded(n), innerWidth)
        for (const [id, s] of l.slots) {
          const f = footprint(l.dims.get(id)!, s.pose)
          expect(s.x - f.along / 2).toBeGreaterThanOrEqual(-innerWidth / 2 - 1e-9)
          expect(s.x + f.along / 2).toBeLessThanOrEqual(innerWidth / 2 + 1e-9)
          const up = s.y - rowFloorY(s.row, l.rows)
          expect(up - f.up / 2).toBeGreaterThanOrEqual(-1e-9)
          expect(up + f.up / 2).toBeLessThanOrEqual(SHELF.rowHeight - SHELF.board + 1e-9)
        }
      }
    })

  it('lays out a shelf of only flat books and one of only face-out books without overlapping', () => {
    for (const pose of ['flat', 'faceout'] as const) {
      const all = Array.from({ length: 30 }, (_, i) => book(`o${i}`, `Only ${i}`, { pose, pages: 150 + i * 13 }))
      const l = layoutOf(all)
      expect(l.slots.size).toBe(30)
      for (const [idA, a] of l.slots)
        for (const [idB, b] of l.slots) {
          if (idA >= idB || a.row !== b.row) continue
          const fa = footprint(l.dims.get(idA)!, a.pose)
          const fb = footprint(l.dims.get(idB)!, b.pose)
          const apart = Math.abs(a.x - b.x) + 1e-6 >= (fa.along + fb.along) / 2
          const above = Math.abs(a.y - b.y) + 1e-6 >= (fa.up + fb.up) / 2
          expect(apart || above).toBe(true)
        }
    }
  })
})

describe('a shelf with no poses is exactly the shelf it was', () => {
  it('gives every book the place it had before poses existed', () => {
    const shelf = Array.from({ length: 40 }, (_, i) => book(`n${i}`, `Book ${i}`, { pages: 120 + i * 7 }))
    const l = layoutOf(shelf)
    for (const [id, s] of l.slots) {
      const d = l.dims.get(id)!
      expect(s.pose).toBe('standing')
      expect(s.y - rowFloorY(s.row, l.rows)).toBeCloseTo(d.h / 2, 9)
      expect(s.z).toBeCloseTo(SHELF.depth / 2 - d.w / 2 - 0.012, 9)
    }
  })
})
