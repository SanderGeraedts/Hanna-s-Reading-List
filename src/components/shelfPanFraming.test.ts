import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { Book } from '#/lib/library'
import { computeLayout, fitShelf } from '#/lib/shelfLayout'
import { panEdges } from '#/lib/shelfPan'
import { FOV, aimCamera, cameraZ, frameCase, newAim } from './cameraAim'

// Tester's checks for T-0025: the ‹ › buttons and the arrows follow `panEdges(x, frameCase(…).xMax)`,
// so these hold for the real framing of real shelves, not just the phone numbers of section 1.

const shelf = (count: number): Book[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `b${i}`,
    title: `Book ${i}`,
    authors: ['Someone'],
    color: '#2e5a8a',
    status: 'want',
    pages: 150 + ((i * 53) % 400),
    addedAt: i,
  })) as Book[]

// phones upright, a phone on its side, tablets, laptops and wide monitors
const SCREENS: [number, number][] = [
  [360, 780],
  [390, 844],
  [430, 932],
  [768, 1024],
  [844, 390],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [2560, 1080],
]
const COUNTS = [1, 12, 60, 200]

function framing(width: number, height: number, books: Book[], zoom: number) {
  const aspect = width / height
  const fit = fitShelf(books, aspect)
  const layout = computeLayout(books, fit)
  return frameCase(layout.caseWidth, layout.caseHeight, aspect, aspect < 0.8, zoom)
}

describe('‹ › and ← → follow the zoom on every screen', () => {
  it('cannot pan at zoom 1 (the buttons stay hidden, the arrows do nothing)', () => {
    for (const [w, h] of SCREENS) {
      for (const n of COUNTS) {
        const { xMax } = framing(w, h, shelf(n), 1)
        expect(panEdges(0, xMax).canPan, `${w}×${h}, ${n} books, xMax ${xMax.toFixed(3)}`).toBe(false)
      }
    }
  })

  it('can pan when zoomed in all the way, with a shelf wide enough to fill the screen', () => {
    for (const [w, h] of SCREENS) {
      const { xMax } = framing(w, h, shelf(60), 3)
      expect(panEdges(0, xMax).canPan, `${w}×${h}, xMax ${xMax.toFixed(3)}`).toBe(true)
    }
  })
})

describe('the aim keeps an opened book in front (the inspect view)', () => {
  // an opened book flies to (cameraBase.x, cameraBase.y, cameraBase.z - dist): straight ahead of the
  // resting camera. With no parallax (none while a book is open) the camera must look straight ahead,
  // wherever the shelf is panned to, also while it is still gliding there.
  const aspect = 390 / 844
  const frame = frameCase(0.63, 1.6, aspect, true, 3)
  const z = cameraZ(frame.toCase)
  const y = 0.8

  function lookingStraight(camera: THREE.Camera) {
    const dir = camera.getWorldDirection(new THREE.Vector3())
    return Math.abs(dir.x) < 1e-6 && Math.abs(dir.y) < 1e-6 && dir.z < 0
  }

  it('looks straight ahead when settled at either end and in the middle', () => {
    for (const x of [-frame.xMax, 0, frame.xMax]) {
      const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.05, 60)
      const aim = newAim()
      for (let i = 0; i < 600; i++) aimCamera(camera, { x, y, z }, aim, { x: 0, y: 0 }, 1 / 60)
      camera.updateMatrixWorld()
      expect(lookingStraight(camera), `pan ${x}`).toBe(true)
      // a book placed straight ahead of the resting camera lands in the middle of the screen
      const book = new THREE.Vector3(x, y, z - 0.5).project(camera)
      expect(book.x).toBeCloseTo(0, 5)
      expect(book.y).toBeCloseTo(0, 5)
    }
  })

  it('keeps looking straight ahead while gliding to a new pan (no swing while it moves)', () => {
    const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.05, 60)
    const aim = newAim()
    for (let i = 0; i < 600; i++) aimCamera(camera, { x: -frame.xMax, y, z }, aim, { x: 0, y: 0 }, 1 / 60)
    for (let i = 0; i < 20; i++) {
      aimCamera(camera, { x: frame.xMax, y, z }, aim, { x: 0, y: 0 }, 1 / 60)
      camera.updateMatrixWorld()
      expect(lookingStraight(camera), `frame ${i}`).toBe(true)
    }
    // part-way there, not jumped
    expect(camera.position.x).toBeGreaterThan(-frame.xMax)
    expect(camera.position.x).toBeLessThan(frame.xMax)
  })
})
