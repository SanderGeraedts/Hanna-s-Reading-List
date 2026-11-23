import type { Book } from '#/lib/library'
import { hasMedal } from '#/lib/library'
import { describe, expect, it } from 'vitest'
import { MATCH_DIM, MATCH_FORWARD, MATCH_GLOW, bookLight } from './BookMesh'

describe('search highlight strength (#184)', () => {
  it('pins the values from the design', () => {
    expect(MATCH_GLOW).toBe(0.6)
    expect(MATCH_DIM).toBe(0.82)
    expect(MATCH_FORWARD).toBe(0.06)
  })

  it('lights a book on the shelf normally when no search is on', () => {
    expect(bookLight(0, 0, 0)).toEqual({ emissive: 0, shade: 1 })
  })

  it('gives a match a glow of 0.6 at full brightness', () => {
    expect(bookLight(0, 1, 0)).toEqual({ emissive: 0.6, shade: 1 })
  })

  it('leaves a book that does not match at 18% brightness, without glow', () => {
    const { emissive, shade } = bookLight(0, 0, 1)
    expect(emissive).toBe(0)
    expect(shade).toBeCloseTo(0.18, 5)
  })

  it('lights a taken-out book evenly, without glow or dimming', () => {
    expect(bookLight(1, 0, 0)).toEqual({ emissive: 1, shade: 0 })
    expect(bookLight(1, 1, 0)).toEqual({ emissive: 1, shade: 0 })
    expect(bookLight(1, 0, 1)).toEqual({ emissive: 1, shade: 0 })
  })
})

describe('a book on the shelf on a phone is drawn in two parts (T-0003)', () => {
  it('has the paper sides first and the spine last, as two groups', async () => {
    const { shelfBlock } = await import('./BookMesh')
    const g = shelfBlock({ w: 0.13, h: 0.2, t: 0.03 })
    expect(g.groups).toEqual([
      { start: 0, count: 30, materialIndex: 0 },
      { start: 30, count: 6, materialIndex: 1 },
    ])
    // the last six indices are the spine side (-x): every corner at x = -w/2
    const pos = g.attributes.position
    const idx = Array.from(g.index!.array).slice(30)
    expect(idx.every((i) => Math.abs(pos.getX(i) + 0.065) < 1e-6)).toBe(true)
    expect(g.index!.count).toBe(36)
  })
})

describe('a hardcover on the shelf is one light piece (T-0034, D-0035)', () => {
  const sizes = [
    { w: 0.19, h: 0.29, t: 0.034 },
    { w: 0.16, h: 0.27, t: 0.018 },
    { w: 0.29, h: 0.35, t: 0.075 },
  ]

  it('is one geometry with exactly two groups (paper, cloth) covering every index', async () => {
    const { shelfHardcover } = await import('./BookMesh')
    for (const dims of sizes) {
      const g = shelfHardcover(dims)
      expect(g.groups.length).toBe(2)
      const [paper, cloth] = g.groups
      expect(paper).toMatchObject({ start: 0, materialIndex: 0 })
      expect(cloth).toMatchObject({ start: paper.count, materialIndex: 1 })
      expect(paper.count + cloth.count).toBe(g.index!.count)
      expect(paper.count).toBeGreaterThan(0)
      expect(cloth.count).toBeGreaterThan(0)
    }
  })

  it('has the outer size of the hardcover of the separate parts, and at most 300 vertices', async () => {
    const THREE = await import('three')
    const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js')
    const { shelfHardcover, hardcoverSizes } = await import('./BookMesh')
    for (const dims of sizes) {
      const g = shelfHardcover(dims)
      g.computeBoundingBox()
      const size = g.boundingBox!.getSize(new THREE.Vector3())
      // the separate parts of a taken-out book, put together as BookMesh places them
      const s = hardcoverSizes(dims)
      const box = new THREE.Box3()
      const add = (geo: InstanceType<typeof THREE.BufferGeometry>, x: number, z: number) => {
        geo.translate(x, 0, z)
        geo.computeBoundingBox()
        box.union(geo.boundingBox!)
      }
      add(new THREE.BoxGeometry(s.pagesW, dims.h - 2 * s.over, dims.t - 2 * s.board), s.pagesX, 0)
      add(new RoundedBoxGeometry(dims.w - s.board, dims.h, s.board, 1, s.round), s.board / 2, dims.t / 2 - s.board / 2)
      add(new RoundedBoxGeometry(dims.w - s.board, dims.h, s.board, 1, s.round), s.board / 2, -dims.t / 2 + s.board / 2)
      add(new RoundedBoxGeometry(s.board, dims.h, dims.t, 1, s.round), -dims.w / 2 + s.board / 2, 0)
      expect(g.boundingBox!.min.distanceTo(box.min)).toBeLessThan(1e-6)
      expect(g.boundingBox!.max.distanceTo(box.max)).toBeLessThan(1e-6)
      expect(Math.abs(size.x - dims.w)).toBeLessThan(1e-6)
      expect(Math.abs(size.y - dims.h)).toBeLessThan(1e-6)
      expect(Math.abs(size.z - dims.t)).toBeLessThan(1e-6)
      expect(g.attributes.position.count).toBeLessThanOrEqual(300)
    }
  })

  it('puts the page block (fore-edge, top, bottom) in the paper group and the rest in the cloth', async () => {
    const { shelfHardcover, hardcoverSizes } = await import('./BookMesh')
    const dims = sizes[0]
    const s = hardcoverSizes(dims)
    const g = shelfHardcover(dims)
    const pos = g.attributes.position
    const idx = Array.from(g.index!.array)
    const paper = idx.slice(0, g.groups[0].count)
    // every paper vertex is on the page block, inside the boards
    for (const i of paper) expect(Math.abs(pos.getZ(i))).toBeLessThanOrEqual(dims.t / 2 - s.board + 1e-6)
    // the cloth has the spine at -w/2
    const cloth = idx.slice(g.groups[0].count)
    expect(Math.min(...cloth.map((i) => pos.getX(i)))).toBeCloseTo(-dims.w / 2, 6)
  })

  it('has 4 ridges on an unread book and 2 on a read one, none at the bottom, in no group or mesh of its own', async () => {
    const { ridgeLayout, shelfHardcover, RIDGES_PER_BOOK } = await import('./BookMesh')
    const dims = sizes[0]
    expect(ridgeLayout(dims, false).length).toBe(4)
    const read = ridgeLayout(dims, true)
    expect(read.length).toBe(2)
    // both near the top, above the middle of the spine (the medal hangs at the bottom)
    expect(read.every((r) => r.position[1] > 0)).toBe(true)
    expect(RIDGES_PER_BOOK).toBe(4)
    // the ridges are not part of the book's piece: still two groups
    expect(shelfHardcover(dims).groups.length).toBe(2)
  })
})

describe('which look a book gets (T-0034)', () => {
  it('follows Detailed books and whether the book is out, not the device', async () => {
    const { bookLook } = await import('./BookMesh')
    expect(bookLook({ detailed: true, takenOut: false })).toBe('shelf-hardcover')
    expect(bookLook({ detailed: true, takenOut: true })).toBe('hardcover')
    expect(bookLook({ detailed: false, takenOut: false })).toBe('shelf-block')
    expect(bookLook({ detailed: false, takenOut: true })).toBe('block')
  })
})

describe('the ridges follow the same "has a medal" rule as the medal (T-0037, F5)', () => {
  const dims = { w: 0.19, h: 0.29, t: 0.034 }
  const book = (status: string, readCount?: number) =>
    ({ id: 'x', title: 'X', authors: [], color: '#000', status, addedAt: 0, ...(readCount ? { readCount } : {}) }) as unknown as Book

  it('read: 2 (top only); did not finish, read before: 2; did not finish, never read: 4; reading: 4; want: 4', async () => {
    const { ridgesFor } = await import('./BookMesh')
    expect(ridgesFor(book('read'), dims).length).toBe(2)
    expect(ridgesFor(book('dnf', 1), dims).length).toBe(2)
    expect(ridgesFor(book('dnf'), dims).length).toBe(4)
    expect(ridgesFor(book('reading'), dims).length).toBe(4)
    expect(ridgesFor(book('want'), dims).length).toBe(4)
    // a read-before DNF book has a medal, and its two ridges are both at the top, clear of it
    expect(hasMedal(book('dnf', 1))).toBe(true)
    expect(ridgesFor(book('dnf', 1), dims).every((r) => r.position[1] > 0)).toBe(true)
  })
})
