import { describe, expect, it } from 'vitest'
import { MAP_ZOOM_MAX, MAP_ZOOM_STEP, between, clampView, panView, wholeMap, zoomAround, zoomOf } from './mapZoom'

/** T-0039: zooming and panning the world map, in map units. */

const W = 360
const H = 142
const whole = wholeMap(W, H)
/** Where a point (fraction of the shown area) lands on the map. */
const under = (v: { x: number; y: number; w: number; h: number }, fx: number, fy: number) => [v.x + fx * v.w, v.y + fy * v.h]

describe('map zoom', () => {
  it('zooming around a point keeps that point under the pointer', () => {
    const before = under(whole, 0.3, 0.6)
    const z2 = zoomAround(whole, 2, 0.3, 0.6, W, H)
    expect(zoomOf(z2, W)).toBeCloseTo(2)
    expect(under(z2, 0.3, 0.6)[0]).toBeCloseTo(before[0])
    expect(under(z2, 0.3, 0.6)[1]).toBeCloseTo(before[1])
    // and again, from a zoomed view, at another point
    const p = under(z2, 0.8, 0.2)
    const z4 = zoomAround(z2, 2, 0.8, 0.2, W, H)
    expect(under(z4, 0.8, 0.2)[0]).toBeCloseTo(p[0])
    expect(under(z4, 0.8, 0.2)[1]).toBeCloseTo(p[1])
    // zooming out around the same point brings it back
    const back = zoomAround(z4, 0.5, 0.8, 0.2, W, H)
    expect(under(back, 0.8, 0.2)[0]).toBeCloseTo(p[0])
  })

  it('keeps the map’s proportions at every zoom', () => {
    const v = zoomAround(whole, 3.3, 0.5, 0.5, W, H)
    expect(v.w / v.h).toBeCloseTo(W / H)
  })

  it('the zoom stays between one and the maximum, reached in three presses', () => {
    expect(zoomOf(zoomAround(whole, 0.5, 0.5, 0.5, W, H), W)).toBe(1)
    expect(zoomAround(whole, 0.25, 0.1, 0.9, W, H)).toEqual(whole)
    let v = whole
    for (let i = 0; i < 3; i++) v = zoomAround(v, MAP_ZOOM_STEP, 0.5, 0.5, W, H)
    expect(zoomOf(v, W)).toBeCloseTo(MAP_ZOOM_MAX)
    expect(zoomOf(zoomAround(v, MAP_ZOOM_STEP, 0.5, 0.5, W, H), W)).toBeCloseTo(MAP_ZOOM_MAX)
    expect(zoomOf(zoomAround(whole, 1000, 0.5, 0.5, W, H), W)).toBe(MAP_ZOOM_MAX)
  })

  it('a zoom around a point near the edge never shows anything beyond the map', () => {
    const v = zoomAround(whole, 2, 0, 0, W, H)
    expect(v.x).toBe(0)
    expect(v.y).toBe(0)
    const z = zoomAround(v, 0.5, 1, 1, W, H)
    expect(z).toEqual(whole)
  })

  it('panning is clamped so the view never leaves the map', () => {
    const v = zoomAround(whole, 4, 0.5, 0.5, W, H)
    const far = panView(v, 10000, 10000, W, H)
    expect(far.x + far.w).toBeCloseTo(W)
    expect(far.y + far.h).toBeCloseTo(H)
    const back = panView(v, -10000, -10000, W, H)
    expect(back.x).toBe(0)
    expect(back.y).toBe(0)
    const small = panView(v, 5, -3, W, H)
    expect(small.x).toBeCloseTo(v.x + 5)
    expect(small.y).toBeCloseTo(v.y - 3)
    expect(small.w).toBe(v.w)
  })

  it('at zoom one the view is always the whole map', () => {
    expect(panView(whole, 40, -20, W, H)).toEqual(whole)
    expect(clampView({ x: 50, y: 30, w: W, h: H }, W, H)).toEqual(whole)
    expect(clampView({ x: -5, y: 0, w: W * 2, h: H * 2 }, W, H)).toEqual(whole)
  })

  it('clampView keeps a view inside the map and its zoom within limits', () => {
    const tiny = clampView({ x: 100, y: 50, w: 1, h: 1 }, W, H)
    expect(zoomOf(tiny, W)).toBeCloseTo(MAP_ZOOM_MAX)
    const off = clampView({ x: 400, y: 200, w: W / 2, h: H / 2 }, W, H)
    expect(off.x + off.w).toBeCloseTo(W)
    expect(off.y + off.h).toBeCloseTo(H)
  })

  it('between goes from one view to the other', () => {
    const v = zoomAround(whole, 2, 0.5, 0.5, W, H)
    expect(between(whole, v, 0)).toEqual(whole)
    expect(between(whole, v, 1)).toEqual(v)
    expect(between(whole, v, 0.5).w).toBeCloseTo((W + v.w) / 2)
  })
})
