import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { Book } from '#/lib/library'
import { SHELF, computeLayout, fitShelf } from '#/lib/shelfLayout'
import { FOV, cameraZ, frameCase } from './cameraAim'
import { MATCH_FORWARD } from './BookMesh'
import { SHEET_MAX, SHEET_MIN_PX } from './BookPanel'
import { HEADER_SHARE, INSPECT_MARGIN, inspectDistance, inspectPlacement, portraitInspect } from './inspectPlacement'

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
      const frame = { fill: 0, yShift: 0 }
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
