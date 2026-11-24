import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { poseBasis, poseQuaternion, shelfHardcover } from './BookMesh'
import { footprint } from '#/lib/shelfLayout'
import { facesToPaint } from '#/lib/bookFaces'
import type { BookPose } from '#/lib/pose'

/**
 * How a posed book is turned (T-0052, D-0044 §4). The decision is the footprint
 * and the face that looks at her, not the Euler angles, so that is what is
 * tested: the book's geometry turned by its pose, measured in world space.
 */

const dims = { w: 0.2, h: 0.3, t: 0.04 }

/** The box a book's shelf piece fills once it is turned into its pose. */
function turnedBox(pose: BookPose) {
  const piece = shelfHardcover(dims)
  const g = piece.clone()
  g.applyQuaternion(poseQuaternion(pose))
  g.computeBoundingBox()
  const size = new THREE.Vector3()
  g.boundingBox!.getSize(size)
  g.dispose()
  piece.dispose()
  return size
}

/** Where a face of the book's own frame points once the pose has turned it. */
const facing = (pose: BookPose, local: THREE.Vector3) =>
  local
    .clone()
    .applyQuaternion(poseQuaternion(pose))
    .toArray()
    // round, and turn -0 into 0 so the direction reads plainly
    .map((v) => Math.round(v) + 0)

describe('a pose turns the book to the footprint the decision gives it', () => {
  for (const pose of ['standing', 'faceout', 'flat'] as const)
    it(`${pose}: the turned book fills exactly along × up × deep`, () => {
      const f = footprint(dims, pose)
      const size = turnedBox(pose)
      expect(size.x).toBeCloseTo(f.along, 6)
      expect(size.y).toBeCloseTo(f.up, 6)
      expect(size.z).toBeCloseTo(f.deep, 6)
    })
})

describe('which side looks at her', () => {
  // the book's own frame: front cover +z, spine −x, and the spine's lettering runs from +y down
  const COVER = new THREE.Vector3(0, 0, 1)
  const SPINE = new THREE.Vector3(-1, 0, 0)
  const READING = new THREE.Vector3(0, -1, 0)

  it('standing: the spine faces her', () => {
    expect(facing('standing', SPINE)).toEqual([0, 0, 1])
  })

  it('face-out: the front cover faces her', () => {
    expect(facing('faceout', COVER)).toEqual([0, 0, 1])
  })

  it('lying flat: the spine faces her, its lettering reads left to right and the cover points up', () => {
    expect(facing('flat', SPINE)).toEqual([0, 0, 1])
    expect(facing('flat', READING)).toEqual([1, 0, 0])
    expect(facing('flat', COVER)).toEqual([0, 1, 0])
  })

  it('turns the book without squashing or mirroring it', () => {
    for (const pose of ['standing', 'faceout', 'flat'] as const) {
      const m = poseBasis(pose)
      expect(m.determinant()).toBeCloseTo(1, 9)
    }
  })
})

describe('the shelf piece itself is unchanged by a pose (D-0035)', () => {
  it('stays one geometry with two groups', () => {
    const piece = shelfHardcover(dims)
    expect(piece.groups).toHaveLength(2)
    piece.dispose()
  })
})

describe('only a face-out book wants a cover on the shelf (D-0044 §6)', () => {
  it('asks for the cover picture while it stands on the shelf', () => {
    expect(facesToPaint({ coverUrl: 'c.jpg', coverFailed: false, takenOut: false, faceOut: true })).toEqual({ back: false, cover: true, fallback: false })
  })

  it('falls back to the painted cover when the book has none', () => {
    expect(facesToPaint({ coverFailed: false, takenOut: false, faceOut: true })).toEqual({ back: false, cover: false, fallback: true })
    expect(facesToPaint({ coverUrl: 'c.jpg', coverFailed: true, takenOut: false, faceOut: true })).toEqual({ back: false, cover: true, fallback: true })
  })

  it('leaves a standing or flat book with no cover at all, as before', () => {
    expect(facesToPaint({ coverUrl: 'c.jpg', coverFailed: false, takenOut: false })).toEqual({ back: false, cover: false, fallback: false })
    expect(facesToPaint({ coverUrl: 'c.jpg', coverFailed: false, takenOut: false, faceOut: false })).toEqual({ back: false, cover: false, fallback: false })
  })

  it('still paints everything for a book that is taken out', () => {
    expect(facesToPaint({ coverUrl: 'c.jpg', coverFailed: false, takenOut: true })).toEqual({ back: true, cover: true, fallback: false })
  })
})
