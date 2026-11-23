/**
 * Zooming and panning the world map (T-0039): the part of the map that is shown, as an SVG
 * `viewBox` in map units. Zoom 1 is the whole map; the view keeps the map's own proportions,
 * so the picture never changes size on the page, and it never leaves the map.
 */

export interface MapView {
  x: number
  y: number
  w: number
  h: number
}

/** About 8×: the Netherlands grows from a few pixels to a comfortable tap on a phone. */
export const MAP_ZOOM_MAX = 8
/** One press of + or − doubles or halves the zoom: 1, 2, 4, 8. */
export const MAP_ZOOM_STEP = 2

export const wholeMap = (mapW: number, mapH: number): MapView => ({ x: 0, y: 0, w: mapW, h: mapH })

/** How far the view is zoomed in: 1 for the whole map. */
export const zoomOf = (view: MapView, mapW: number): number => mapW / view.w

export const clampZoom = (z: number): number => Math.min(MAP_ZOOM_MAX, Math.max(1, Number.isFinite(z) ? z : 1))

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** The view kept inside the map, at a zoom between 1 and the maximum. */
export function clampView(view: MapView, mapW: number, mapH: number): MapView {
  const z = clampZoom(mapW / view.w)
  const w = mapW / z
  const h = mapH / z
  // keep the middle where it was when the size had to change
  const cx = view.x + view.w / 2
  const cy = view.y + view.h / 2
  return {
    x: clamp(cx - w / 2, 0, mapW - w),
    y: clamp(cy - h / 2, 0, mapH - h),
    w,
    h,
  }
}

/**
 * Zoom by `factor` around a point given as a fraction of the shown area (0..1 across, 0..1 down):
 * the map point under it stays under it, unless the map's edge has to stop it.
 */
export function zoomAround(view: MapView, factor: number, fx: number, fy: number, mapW: number, mapH: number): MapView {
  const px = view.x + clamp(fx, 0, 1) * view.w
  const py = view.y + clamp(fy, 0, 1) * view.h
  const z = clampZoom(zoomOf(view, mapW) * factor)
  const w = mapW / z
  const h = mapH / z
  return {
    x: clamp(px - clamp(fx, 0, 1) * w, 0, mapW - w),
    y: clamp(py - clamp(fy, 0, 1) * h, 0, mapH - h),
    w,
    h,
  }
}

/** Move the view by (dx, dy) map units, clamped to the map's edges. */
export function panView(view: MapView, dx: number, dy: number, mapW: number, mapH: number): MapView {
  return {
    ...view,
    x: clamp(view.x + dx, 0, mapW - view.w),
    y: clamp(view.y + dy, 0, mapH - view.h),
  }
}

/** Part of the way from one view to another (for the buttons' short animation). */
export const between = (a: MapView, b: MapView, t: number): MapView => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
})
