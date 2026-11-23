import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { Book } from '#/lib/library'
import { SHELF, computeLayout, fitShelf } from '#/lib/shelfLayout'
import { FOV, cameraZ, frameCase } from './cameraAim'
import { CLIP_OUT, MATCH_FORWARD } from './BookMesh'
import { SHEET_MAX, SHEET_MIN_PX } from './BookPanel'
import {
  DEFAULT_INSPECT,
  HEADER_SHARE,
  INSPECT_MARGIN,
  MIN_BOOK_SPACE,
  clampSheetPx,
  headerShareOf,
  inspectDistance,
  inspectPlacement,
  landscapeInspect,
  openingSheetPx,
  panelLeft,
  portraitInspect,
  reducedMotionCamera,
  sheetCap,
} from './inspectPlacement'
import type { InspectFrame } from './inspectPlacement'

// T-0026: an opened book and the dimming must stand in front of the case at every zoom and pan,
// and the book must look the same on screen as at zoom 1.

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

const CASE_FRONT = SHELF.depth / 2
const NEAR = 0.05
const WIDEST = 0.82

interface Case {
  label: string
  width: number
  height: number
  zoom: number
  fill: number
  yShift: number
  /** phone: the header's and the sheet's share of the screen */
  phone?: { header: number; sheet: number }
}

function cases(): Case[] {
  const out: Case[] = []
  const phoneAspect = 390 / 844
  for (const zoom of [1, 1.5, 2, 3]) {
    for (const sheet of [SHEET_MIN_PX / 844, 0.45, SHEET_MAX]) {
      const frame = { fill: 0, yShift: 0, xShift: 0 }
      portraitInspect(frame, sheet, phoneAspect, HEADER_SHARE)
      out.push({
        label: `390×844 zoom ${zoom} sheet ${sheet.toFixed(3)}`,
        width: 390,
        height: 844,
        zoom,
        ...frame,
        phone: { header: HEADER_SHARE, sheet },
      })
    }
  }
  for (const zoom of [1, 2, 3]) {
    out.push({ label: `1280×800 zoom ${zoom}`, width: 1280, height: 800, zoom, fill: 0.6, yShift: 0 })
  }
  return out
}

const books = shelf(60)

function setting(c: Case) {
  const aspect = c.width / c.height
  const fit = fitShelf(books, aspect)
  const layout = computeLayout(books, fit)
  const frame = frameCase(layout.caseWidth, layout.caseHeight, aspect, aspect < 0.8, c.zoom)
  const heights = [...layout.dims.values()].map((d) => d.h)
  return { aspect, frame, zoomZ: cameraZ(frame.toCase), shortest: Math.min(...heights), tallest: Math.max(...heights) }
}

describe('the opened book and the dimming stand in front of the case (T-0026)', () => {
  for (const c of cases()) {
    it(c.label, () => {
      const { aspect, frame, zoomZ, shortest, tallest } = setting(c)
      for (const bookH of [shortest, tallest]) {
        for (const coverAspect of [0.66, WIDEST]) {
          const bookW = bookH * coverAspect
          const p = inspectPlacement({ cameraZ: zoomZ, caseFront: CASE_FRONT, bookH, bookW, bookT: 0.04, fill: c.fill, fov: FOV })
          const what = `${c.label}, book ${bookH.toFixed(3)} × ${bookW.toFixed(3)}: camera ${p.cameraZ.toFixed(3)}, book ${p.bookZ.toFixed(3)}, dimming ${p.backdropZ.toFixed(3)}`

          // front to back: camera, book, dimming, the case and what sticks out of it
          expect(p.bookZ, what).toBeLessThan(p.cameraZ - NEAR - INSPECT_MARGIN)
          expect(p.backdropZ, what).toBeLessThanOrEqual(p.bookZ - bookW / 2 - INSPECT_MARGIN + 1e-9)
          expect(p.backdropZ, what).toBeGreaterThanOrEqual(CASE_FRONT + MATCH_FORWARD + INSPECT_MARGIN - 1e-9)
          // never closer than her zoom
          expect(p.cameraZ, what).toBeGreaterThanOrEqual(zoomZ - 1e-9)

          for (const pan of [-frame.xMax, 0, frame.xMax]) {
            const y = 0.8
            const camera = new THREE.PerspectiveCamera(FOV, aspect, NEAR, 60)
            camera.position.set(pan, y, p.cameraZ)
            camera.lookAt(pan, y, 0)
            camera.updateMatrixWorld()
            // the book stands where BookMesh puts it: straight ahead, raised by yShift of the view
            const dist = p.cameraZ - p.bookZ
            expect(dist, what).toBeCloseTo(inspectDistance(bookH, c.fill, FOV), 9)
            const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(FOV / 2))
            const centre = new THREE.Vector3(pan, y + viewH * c.yShift, p.bookZ)
            const at = (dx: number, dy: number) => centre.clone().add(new THREE.Vector3(dx, dy, 0)).project(camera)
            const mid = at(0, 0)
            const top = at(0, bookH / 2)
            const bottom = at(0, -bookH / 2)
            const where = `${what}, pan ${pan.toFixed(3)}`

            // the same size and place on screen at every zoom and pan
            expect(top.y - bottom.y, where).toBeCloseTo(2 * c.fill, 2)
            expect(Math.abs(top.y - bottom.y - 2 * c.fill) / (2 * c.fill), where).toBeLessThan(0.01)
            expect(Math.abs(mid.y - 2 * c.yShift), where).toBeLessThanOrEqual(0.01 * Math.max(0.01, Math.abs(2 * c.yShift)) + 1e-9)
            expect(mid.x, where).toBeCloseTo(0, 6)

            if (c.phone) {
              // the whole book, at the widest cover, inside the screen's width
              const w = bookH * WIDEST
              expect(at(w / 2, 0).x, where).toBeLessThanOrEqual(1)
              expect(at(-w / 2, 0).x, where).toBeGreaterThanOrEqual(-1)
              // and between the header and the sheet, wherever there is room for it
              // (portraitInspect keeps a book at least 0.15 of the view tall, so with the sheet at
              // its highest it reaches under the header: see the task's Log)
              const free = 1 - c.phone.sheet - c.phone.header
              if (c.fill <= free) {
                expect(top.y, where).toBeLessThanOrEqual(1 - 2 * c.phone.header + 1e-9)
                expect(bottom.y, where).toBeGreaterThanOrEqual(-1 + 2 * c.phone.sheet - 1e-9)
              }
            }
          }
        }
      }
    })
  }

  it('does not step back where none is needed (1280 × 800, zoom 1)', () => {
    const c = cases().find((x) => x.label === '1280×800 zoom 1')!
    const { zoomZ, shortest, tallest } = setting(c)
    for (const bookH of [shortest, tallest]) {
      const p = inspectPlacement({ cameraZ: zoomZ, caseFront: CASE_FRONT, bookH, bookW: bookH * WIDEST, bookT: 0.04, fill: 0.6, fov: FOV })
      expect(p.cameraZ).toBe(zoomZ)
    }
  })
})

// T-0026, the tester: cases the first test doesn't cover.
describe('the opened book and the dimming, more screens and a turned book (T-0026, tester)', () => {
  const FOG_NEAR = 6 // <fog args={[…, 6, 14]}> in BookshelfScene: the dimming must stand nearer, or it changes colour
  const BACKDROP_SIZE = 20 // Backdrop's planeGeometry is 20 × 20

  function check(label: string, width: number, height: number, zoom: number, fill: number, bookCount: number) {
    const aspect = width / height
    const few = shelf(bookCount)
    const layout = computeLayout(few, fitShelf(few, aspect))
    const frame = frameCase(layout.caseWidth, layout.caseHeight, aspect, aspect < 0.8, zoom)
    const zoomZ = cameraZ(frame.toCase)
    for (const d of layout.dims.values()) {
      const p = inspectPlacement({ cameraZ: zoomZ, caseFront: CASE_FRONT, bookH: d.h, bookW: d.w, bookT: d.t, fill, fov: FOV })
      const what = `${label}, ${bookCount} books, book ${d.h.toFixed(3)}: camera ${p.cameraZ.toFixed(3)}, book ${p.bookZ.toFixed(3)}, dimming ${p.backdropZ.toFixed(3)}`
      expect(p.bookZ, what).toBeLessThan(p.cameraZ - NEAR - INSPECT_MARGIN)
      expect(p.backdropZ, what).toBeGreaterThanOrEqual(CASE_FRONT + MATCH_FORWARD + INSPECT_MARGIN - 1e-9)
      expect(p.cameraZ, what).toBeGreaterThanOrEqual(zoomZ - 1e-9)
      // the book keeps the size it has at her zoom: always `dist` from the camera
      expect(p.cameraZ - p.bookZ, what).toBeCloseTo(inspectDistance(d.h, fill, FOV), 9)
      // the dimming covers the whole view and is not tinted by the fog
      const away = p.cameraZ - p.backdropZ
      const viewH = 2 * away * Math.tan(THREE.MathUtils.degToRad(FOV / 2))
      expect(Math.max(viewH, viewH * aspect), what).toBeLessThan(BACKDROP_SIZE)
      expect(away, what).toBeLessThan(FOG_NEAR)
    }
  }

  for (const zoom of [1, 2, 3]) {
    it(`phone turned sideways, 844 × 390, zoom ${zoom}`, () => check('844×390', 844, 390, zoom, 0.6, 60))
    it(`1024 × 800 and 1920 × 1080, zoom ${zoom}`, () => {
      check('1024×800', 1024, 800, zoom, 0.6, 60)
      check('1920×1080', 1920, 1080, zoom, 0.6, 60)
    })
    it(`a short shelf (5 books) and a long one (200), phone and computer, zoom ${zoom}`, () => {
      for (const n of [5, 200]) {
        const frame = { fill: 0, yShift: 0, xShift: 0 }
        portraitInspect(frame, 0.45, 390 / 844, HEADER_SHARE)
        check('390×844', 390, 844, zoom, frame.fill, n)
        check('1280×800', 1280, 800, zoom, 0.6, n)
      }
    })
  }

  it('the sheet at its highest still keeps the dimming nearer than the fog and covering the view', () => {
    const frame = { fill: 0, yShift: 0, xShift: 0 }
    portraitInspect(frame, SHEET_MAX, 390 / 844, HEADER_SHARE)
    for (const zoom of [1, 3]) check('390×844 sheet max', 390, 844, zoom, frame.fill, 60)
  })

  it('a book turned any way by dragging never reaches the dimming or the camera', () => {
    const { zoomZ, tallest } = setting(cases().find((x) => x.label.startsWith('390×844 zoom 3 sheet 0.450'))!)
    const frame = { fill: 0, yShift: 0, xShift: 0 }
    portraitInspect(frame, 0.45, 390 / 844, HEADER_SHARE)
    const [h, w, t] = [tallest, tallest * WIDEST, 0.06]
    const p = inspectPlacement({ cameraZ: zoomZ, caseFront: CASE_FRONT, bookH: h, bookW: w, bookT: t, fill: frame.fill, fov: FOV })
    const corner = new THREE.Vector3()
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 500; i++) {
      // dragging turns it any way round sideways, tilts it up to 0.9 rad and leans it a little
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() * 2 - 1) * 0.9, rnd() * Math.PI * 2, -0.12 * rnd()))
      for (const sx of [-1, 1])
        for (const sy of [-1, 1])
          for (const sz of [-1, 1]) {
            corner.set((sx * w) / 2, (sy * h) / 2, (sz * t) / 2).applyQuaternion(q)
            expect(p.bookZ + corner.z).toBeGreaterThan(p.backdropZ + INSPECT_MARGIN - 1e-9)
            expect(p.bookZ + corner.z).toBeLessThan(p.cameraZ - NEAR)
          }
    }
  })

  it('her zoom is never moved: the same input gives the same placement, and a camera already far enough is kept', () => {
    const input = { cameraZ: 0.9, caseFront: CASE_FRONT, bookH: 0.3, bookW: 0.2, bookT: 0.04, fill: 0.38, fov: FOV }
    expect(inspectPlacement(input)).toEqual(inspectPlacement(input))
    const far = inspectPlacement({ ...input, cameraZ: 10 })
    expect(far.cameraZ).toBe(10)
    expect(far.bookZ).toBeCloseTo(10 - inspectDistance(0.3, 0.38, FOV), 9)
  })
})

// ---------------------------------------------------------------------------------------------
// T-0037: the sheet leaves room for the open book (F1), the paper clip counts (F1), the phone held
// sideways (F3) and reduced motion (F2).
// ---------------------------------------------------------------------------------------------

/** the sheet's highest share for a header share (T-0037; before it: SHEET_MAX for every header) */
const capOf = (header: number) => sheetCap(header)
/** the clip's share of a book's height as the framing counts it (before T-0037: not counted, 0) */
const clipOf = (bookH: number, hasClip: boolean) => (hasClip ? CLIP_OUT / bookH : 0)

/** projects the opened book as BookMesh places it, from a camera at `pan` */
function projectBook(o: {
  aspect: number
  pan: number
  p: { cameraZ: number; bookZ: number }
  frame: InspectFrame
  bookH: number
  clip: boolean
}) {
  const y = 0.8
  const camera = new THREE.PerspectiveCamera(FOV, o.aspect, NEAR, 60)
  camera.position.set(o.pan, y, o.p.cameraZ)
  camera.lookAt(o.pan, y, 0)
  camera.updateMatrixWorld()
  const dist = o.p.cameraZ - o.p.bookZ
  const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  const centre = new THREE.Vector3(o.pan + viewH * o.aspect * o.frame.xShift, y + viewH * o.frame.yShift, o.p.bookZ)
  const at = (dx: number, dy: number) => centre.clone().add(new THREE.Vector3(dx, dy, 0)).project(camera)
  const w = o.bookH * WIDEST
  return {
    mid: at(0, 0),
    cover: at(0, o.bookH / 2),
    // the top of the clip for a book with one, else the top of the book
    top: at(0, o.bookH / 2 + (o.clip ? CLIP_OUT : 0)),
    bottom: at(0, -o.bookH / 2),
    left: at(-w / 2, 0),
    right: at(w / 2, 0),
  }
}

/** the T-0026 checks: camera, book, dimming, case front to back */
function frontToBack(p: { cameraZ: number; bookZ: number; backdropZ: number }, zoomZ: number, bookW: number, what: string) {
  expect(p.bookZ, what).toBeLessThan(p.cameraZ - NEAR - INSPECT_MARGIN)
  expect(p.backdropZ, what).toBeLessThanOrEqual(p.bookZ - bookW / 2 - INSPECT_MARGIN + 1e-9)
  expect(p.backdropZ, what).toBeGreaterThanOrEqual(CASE_FRONT + MATCH_FORWARD + INSPECT_MARGIN - 1e-9)
  expect(p.cameraZ, what).toBeGreaterThanOrEqual(zoomZ - 1e-9)
}

function shelfAt(width: number, height: number, zoom: number) {
  const aspect = width / height
  const layout = computeLayout(books, fitShelf(books, aspect))
  const frame = frameCase(layout.caseWidth, layout.caseHeight, aspect, aspect < 0.8, zoom)
  const heights = [...layout.dims.values()].map((d) => d.h)
  return { aspect, frame, zoomZ: cameraZ(frame.toCase), shortest: Math.min(...heights), tallest: Math.max(...heights) }
}

interface AtCap {
  zoom: number
  bookH: number
  clip: boolean
  what: string
  aspect: number
  frame: InspectFrame
  p: ReturnType<typeof inspectPlacement>
  zoomZ: number
  xMax: number
  zoom1Z: number
}

describe('T-0037 F1: on the phone the sheet stops where the open book still has room', () => {
  const PHONES = [
    [390, 844],
    [360, 640],
  ] as const
  const HEADERS = [0.1, 0.17, 0.19, 0.22]

  for (const [width, height] of PHONES) {
    for (const header of HEADERS) {
      const label = `${width}×${height}, header ${header}`

      it(`${label}: the cap is min(0.88, 1 − header − 0.25), leaves ≥ 0.25 and is above the default 0.45`, () => {
        const cap = capOf(header)
        expect(cap).toBeCloseTo(Math.min(SHEET_MAX, 1 - header - MIN_BOOK_SPACE), 12)
        expect(MIN_BOOK_SPACE).toBe(0.25)
        expect(1 - header - cap).toBeGreaterThanOrEqual(0.25 - 1e-9)
        expect(0.45).toBeLessThanOrEqual(cap)
      })

      // the sheet at the cap; the shortest and the tallest book of 60, with and without a clip, at every zoom
      const each = (fn: (o: AtCap) => void) => {
        const cap = capOf(header)
        const zoom1Z = shelfAt(width, height, 1).zoomZ
        for (const zoom of [1, 1.5, 2, 3]) {
          const { aspect, frame: caseFrame, zoomZ, shortest, tallest } = shelfAt(width, height, zoom)
          for (const bookH of [shortest, tallest]) {
            for (const clip of [false, true]) {
              const frame = { ...DEFAULT_INSPECT }
              portraitInspect(frame, cap, aspect, header, clipOf(bookH, clip))
              const p = inspectPlacement({ cameraZ: zoomZ, caseFront: CASE_FRONT, bookH, bookW: bookH * WIDEST, bookT: 0.04, fill: frame.fill, fov: FOV })
              const what = `${label}, sheet ${cap.toFixed(3)}, zoom ${zoom}, book ${bookH.toFixed(3)}${clip ? ' with a clip' : ''}: fill ${frame.fill.toFixed(4)}, camera ${p.cameraZ.toFixed(3)} (zoom 1 at ${zoom1Z.toFixed(3)})`
              fn({ zoom, bookH, clip, what, aspect, frame, p, zoomZ, xMax: caseFrame.xMax, zoom1Z })
            }
          }
        }
      }

      it(`${label}: at the cap the whole book, and its clip, stands between the header and the sheet and inside the screen`, () => {
        const cap = capOf(header)
        each(({ aspect, frame, p, bookH, clip, what, xMax }) => {
          for (const pan of [-xMax, 0, xMax]) {
            const b = projectBook({ aspect, pan, p, frame, bookH, clip })
            const where = `${what}, pan ${pan.toFixed(3)}`
            expect(b.top.y, where).toBeLessThanOrEqual(1 - 2 * header + 1e-9)
            expect(b.bottom.y, where).toBeGreaterThanOrEqual(-1 + 2 * cap - 1e-9)
            expect(b.right.x, where).toBeLessThanOrEqual(1)
            expect(b.left.x, where).toBeGreaterThanOrEqual(-1)
          }
        })
      })

      it(`${label}: at zoom 1 the camera steps back at most 0.45 m (it was 2 m)`, () => {
        each(({ zoom, p, zoom1Z, what }) => {
          if (zoom === 1) expect(p.cameraZ, what).toBeLessThanOrEqual(zoom1Z + 0.45)
        })
      })

      it(`${label}: the T-0026 checks still hold at zoom 1, 1.5, 2 and 3`, () => {
        each(({ aspect, frame, p, zoomZ, bookH, clip, what, xMax }) => {
          frontToBack(p, zoomZ, bookH * WIDEST, what)
          expect(p.cameraZ - p.bookZ, what).toBeCloseTo(inspectDistance(bookH, frame.fill, FOV), 9)
          for (const pan of [-xMax, 0, xMax]) {
            const b = projectBook({ aspect, pan, p, frame, bookH, clip })
            expect(Math.abs(b.cover.y - b.bottom.y - 2 * frame.fill) / (2 * frame.fill), what).toBeLessThan(0.01)
            expect(b.mid.x, what).toBeCloseTo(0, 6)
          }
        })
      })
    }
  }

  it('a book without a clip is framed exactly as before T-0037', () => {
    for (const sheet of [0.2, 0.45, 0.6]) {
      const now = { ...DEFAULT_INSPECT }
      portraitInspect(now, sheet, 390 / 844, 0.17)
      const free = Math.max(0.15, 1 - sheet - 0.17)
      expect(now.fill).toBeCloseTo(Math.min(0.6, free * 0.85, (0.88 * (390 / 844)) / 0.82), 12)
      expect(now.yShift).toBeCloseTo((sheet - 0.17) / 2, 12)
      expect(now.xShift).toBe(0)
    }
  })
})

describe('T-0037 F1: the sheet stops at the cap', () => {
  const H = 844
  const cap = sheetCap(0.19)

  it('a drag above the cap stops at the cap, smoothly (the same clamp, a lower top)', () => {
    expect(clampSheetPx(0.88 * H, H, cap)).toBe(Math.round(cap * H))
    expect(clampSheetPx(2000, H, cap)).toBe(Math.round(cap * H))
    // below the cap a drag is followed exactly, and the lowest stays the handle and the title
    expect(clampSheetPx(300, H, cap)).toBe(300)
    expect(clampSheetPx(20, H, cap)).toBe(SHEET_MIN_PX)
  })

  it('a saved share of 0.88 opens at the cap; one below it opens as saved', () => {
    expect(openingSheetPx(0.88, H, cap)).toBe(Math.round(cap * H))
    expect(openingSheetPx(0.45, H, cap)).toBe(Math.round(0.45 * H))
  })

  it('a cap that changes (a taller header, turning the phone) is applied again', () => {
    // the header grows from 0.17 to 0.22 of the screen (a wrapped toolbar)
    const before = openingSheetPx(0.88, H, sheetCap(0.17))
    const after = openingSheetPx(before / H, H, sheetCap(0.22))
    expect(before).toBe(Math.round(sheetCap(0.17) * H))
    expect(after).toBe(Math.round(sheetCap(0.22) * H))
    // turned sideways (667 × 375): the header is 162 px of 375
    const sideways = openingSheetPx(after / H, 375, sheetCap(headerShareOf(162, 375)))
    expect(sideways).toBe(Math.round(sheetCap(162 / 375) * 375))
    expect(sideways / 375).toBeLessThanOrEqual(1 - 162 / 375 - MIN_BOOK_SPACE + 0.002)
    // and until the header is measured, HEADER_SHARE
    expect(headerShareOf(0, 844)).toBe(HEADER_SHARE)
  })
})

describe('T-0037 F3: a screen that is not portrait frames the book in the free space', () => {
  // the header's bottom (.topbar) as measured on the dev server (no backend, 70 books seeded, lavender),
  // 2026-11-23, with playwright: 844 × 390 → 193 px, 800 × 360 → 191, 667 × 375 → 162, 1024 × 768 → 183,
  // 1280 × 800 → 184, 1440 × 900 and 1920 × 1080 → 129
  const SMALL = [
    [844, 390, 193],
    [800, 360, 191],
    [667, 375, 162],
    [1024, 768, 183],
  ] as const
  const LARGE = [
    [1280, 800, 184],
    [1440, 900, 129],
    [1920, 1080, 129],
  ] as const

  /** the frame for the panel at the side (the test's sum: width − 20 − min(340, width − 40)) */
  const frameFor = (width: number, height: number, header: number, bookH: number, clip: boolean) => {
    const frame = { ...DEFAULT_INSPECT }
    landscapeInspect(frame, { width, height, top: header, right: width - 20 - Math.min(340, width - 40), bottom: height }, clipOf(bookH, clip))
    return frame
  }

  it('panelLeft is where the CSS puts the panel: 340 px wide at most, 20 px from the right', () => {
    for (const w of [360, 667, 800, 844, 1024, 1280]) expect(panelLeft(w)).toBe(w - 20 - Math.min(340, w - 40))
  })

  for (const [width, height, header] of SMALL) {
    for (const zoom of [1, 3]) {
      it(`${width}×${height}, zoom ${zoom}: the whole book (and clip) is below the header, left of the panel and on screen`, () => {
        const { aspect, frame: caseFrame, zoomZ, shortest, tallest } = shelfAt(width, height, zoom)
        const panel = 2 * ((width - 20 - Math.min(340, width - 40)) / width) - 1
        for (const bookH of [shortest, tallest]) {
          for (const clip of [false, true]) {
            const frame = frameFor(width, height, header, bookH, clip)
            const bookW = bookH * WIDEST
            const p = inspectPlacement({ cameraZ: zoomZ, caseFront: CASE_FRONT, bookH, bookW, bookT: 0.04, fill: frame.fill, fov: FOV })
            const what = `${width}×${height} zoom ${zoom}, book ${bookH.toFixed(3)}${clip ? ' with a clip' : ''}: ${JSON.stringify(frame)}`
            frontToBack(p, zoomZ, bookW, what)
            expect(p.cameraZ - p.bookZ, what).toBeCloseTo(inspectDistance(bookH, frame.fill, FOV), 9)
            for (const pan of [-caseFrame.xMax, 0, caseFrame.xMax]) {
              const b = projectBook({ aspect, pan, p, frame, bookH, clip })
              const where = `${what}, pan ${pan.toFixed(3)}`
              expect(b.top.y, where).toBeLessThanOrEqual(1 - (2 * header) / height + 1e-9)
              expect(b.bottom.y, where).toBeGreaterThanOrEqual(-1 - 1e-9)
              expect(b.right.x, where).toBeLessThanOrEqual(panel + 1e-9)
              expect(b.left.x, where).toBeGreaterThanOrEqual(-1 - 1e-9)
              // the T-0026 checks with the new fill: its size on screen, and where its middle stands
              expect(Math.abs(b.cover.y - b.bottom.y - 2 * frame.fill) / (2 * frame.fill), where).toBeLessThan(0.01)
              expect(b.mid.x, where).toBeCloseTo(2 * frame.xShift, 6)
              expect(b.mid.y, where).toBeCloseTo(2 * frame.yShift, 6)
            }
          }
        }
      })
    }
  }

  it('667 × 375 really has the sheet at the bottom (narrower than 720 px): the book stays above it, at the cap', () => {
    const [width, height, header] = [667, 375, 162]
    const sheet = sheetCap(header / height)
    for (const zoom of [1, 3]) {
      const { aspect, zoomZ, shortest, tallest } = shelfAt(width, height, zoom)
      for (const bookH of [shortest, tallest]) {
        for (const clip of [false, true]) {
          const frame = { ...DEFAULT_INSPECT }
          landscapeInspect(frame, { width, height, top: header, right: width, bottom: height * (1 - sheet) }, clipOf(bookH, clip))
          const p = inspectPlacement({ cameraZ: zoomZ, caseFront: CASE_FRONT, bookH, bookW: bookH * WIDEST, bookT: 0.04, fill: frame.fill, fov: FOV })
          const b = projectBook({ aspect, pan: 0, p, frame, bookH, clip })
          const what = `zoom ${zoom}, book ${bookH.toFixed(3)}${clip ? ' with a clip' : ''}: ${JSON.stringify(frame)}`
          expect(b.top.y, what).toBeLessThanOrEqual(1 - (2 * header) / height + 1e-9)
          expect(b.bottom.y, what).toBeGreaterThanOrEqual(-1 + 2 * sheet - 1e-9)
          expect(b.right.x, what).toBeLessThanOrEqual(1)
          expect(b.left.x, what).toBeGreaterThanOrEqual(-1)
        }
      }
    }
  })

  for (const [width, height, header] of LARGE) {
    it(`${width}×${height}: the frame stays exactly { fill: 0.6, yShift: 0, xShift: 0 }`, () => {
      const { shortest, tallest } = shelfAt(width, height, 1)
      for (const bookH of [shortest, tallest]) {
        for (const clip of [false, true]) {
          expect(frameFor(width, height, header, bookH, clip)).toEqual({ fill: 0.6, yShift: 0, xShift: 0 })
        }
      }
    })
  }
})

describe('T-0037 F2: with reduced motion the camera jumps back only once the book is home', () => {
  const step = (reduced: boolean, open: boolean, flyingHome: boolean, held: boolean) => reducedMotionCamera({ reduced, open, flyingHome, held })

  it('opening: straight to the stepped-back place', () => expect(step(true, true, false, false)).toBe('back'))
  it('open: stays back', () => expect(step(true, true, false, true)).toBe('back'))
  it('put back and still flying home: stays back', () => expect(step(true, false, true, true)).toBe('hold'))
  it('home: back to her zoom in one frame, then eases as always', () => {
    expect(step(true, false, false, true)).toBe('zoom')
    expect(step(true, false, false, false)).toBe('ease')
  })
  it('another book opened while the first is flying home: stays back, at the new book’s place', () => {
    expect(step(true, true, true, true)).toBe('back')
  })
  it('reduced motion off: eases, as today', () => {
    for (const open of [false, true]) for (const flying of [false, true]) for (const held of [false, true]) expect(step(false, open, flying, held)).toBe('ease')
  })

  it('a whole put-back, frame by frame: never at her zoom before the book is home', () => {
    const zoomZ = 2.5
    const backZ = 4
    let z = backZ
    let held = false
    let wasOpen = true
    // the book is open, then put back; it is home from frame 40
    const frames = [true, ...Array.from({ length: 60 }, () => false)]
    frames.forEach((open, i) => {
      const flyingHome = !open && i < 40
      const s = reducedMotionCamera({ reduced: true, open, flyingHome: wasOpen || flyingHome, held })
      if (s === 'back' || s === 'hold') z = backZ
      if (s === 'zoom') z = zoomZ
      held = s === 'back' || s === 'hold'
      wasOpen = open
      expect(z, `frame ${i}`).toBe(i < 40 ? backZ : zoomZ)
    })
  })
})
