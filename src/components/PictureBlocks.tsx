import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import type { Book } from '#/lib/library'
import { genrePetals, petalLength } from '#/lib/genreFlower'
import { monthlyAmounts, niceMax } from '#/lib/monthlyPages'
import type { MonthAmount } from '#/lib/monthlyPages'
import { monthName } from './Dashboard'
import { byBooks, worldMap } from '#/lib/places'
import { coverAtSize } from '#/lib/cover'
import { LAT_TOP, polygonsToPath } from '#/lib/worldPath'
import { MAP_ZOOM_MAX, MAP_ZOOM_STEP, between, panView, wholeMap, zoomAround, zoomOf } from '#/lib/mapZoom'
import type { MapView } from '#/lib/mapZoom'

/** Petal colours: soft and warm, readable on the walnut cards, one per genre. */
export const PETAL_COLOURS = ['#e8a0b4', '#f2c46d', '#9fc9e6', '#b8d98f', '#c9a6e6', '#f2a37a', '#8fd1c4', '#d9c9a6']

/** Your genres as a flower (reading in pictures, part 2). */
export function GenreFlowerCard({ books }: { books: Book[] }) {
  const year = new Date().getFullYear()
  const [which, setWhich] = useState<'year' | 'all'>('year')
  const { petals, books: count } = useMemo(() => genrePetals(books, which === 'year' ? year : 'all'), [books, which, year])
  const max = Math.max(0, ...petals.map((p) => p.count))
  const n = petals.length
  return (
    <section className="dash-card flower-card" aria-labelledby="flower-title">
      <div className="dash-card-head">
        <h2 id="flower-title">Genre flower</h2>
        <div className="segmented" role="group" aria-label="Period">
          {(['year', 'all'] as const).map((k) => (
            <button key={k} className={which === k ? 'active' : ''} aria-pressed={which === k} onClick={() => setWhich(k)}>
              {k === 'year' ? String(year) : 'All time'}
            </button>
          ))}
        </div>
      </div>
      {n === 0 ? (
        <p className="muted small-text">No genres yet {which === 'year' ? `in ${year}` : ''}: they bloom once finished books have genres.</p>
      ) : (
        <div className="flower-body">
          <svg viewBox="-110 -110 220 220" className="flower" role="img" aria-label={petals.map((p) => `${p.genre}: ${p.count}`).join(', ')}>
            {petals.map((p, i) => {
              const len = 88 * petalLength(p.count, max)
              const angle = (360 / n) * i - 90
              const width = Math.min(30, (Math.PI * 2 * 40) / n / 1.6)
              return (
                <ellipse
                  key={p.genre}
                  cx={0}
                  cy={-len / 2 - 8}
                  rx={width}
                  ry={len / 2 + 4}
                  transform={`rotate(${angle + 90})`}
                  fill={PETAL_COLOURS[i % PETAL_COLOURS.length]}
                  stroke="rgba(0,0,0,0.18)"
                  strokeWidth={1}
                />
              )
            })}
            <circle r={22} fill="#f2c46d" stroke="#a87a22" strokeWidth={2} />
            <text y={6} textAnchor="middle" className="flower-count">
              {count}
            </text>
          </svg>
          <ul className="flower-legend">
            {petals.map((p, i) => (
              <li key={p.genre}>
                <span className="flower-dot" style={{ background: PETAL_COLOURS[i % PETAL_COLOURS.length] }} aria-hidden />
                <span>{p.genre}</span>
                <span className="muted small-text">{p.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Pages (or listening hours) per month, this year next to last year (reading in pictures, part 3). */
export function PagesPerMonthCard({ books }: { books: Book[] }) {
  const now = new Date()
  const year = now.getFullYear()
  const [unit, setUnit] = useState<'pages' | 'hours'>('pages')
  const thisYear = useMemo(() => monthlyAmounts(books, year), [books, year])
  const lastYear = useMemo(() => monthlyAmounts(books, year - 1), [books, year])
  const value = (m: MonthAmount) => (unit === 'pages' ? m.pages : Math.round(m.minutes / 60))
  const top = niceMax(Math.max(...thisYear.map(value), ...lastYear.map(value)))
  const hasListening = [...thisYear, ...lastYear].some((m) => m.minutes > 0)
  const total = thisYear.reduce((a, m) => a + value(m), 0)
  const W = 300
  const H = 140
  const slot = W / 12
  const bar = slot * 0.36
  return (
    <section className="dash-card months-card" aria-labelledby="months-title">
      <div className="dash-card-head">
        <h2 id="months-title">{unit === 'pages' ? 'Pages per month' : 'Hours listened per month'}</h2>
        {hasListening && (
          <div className="segmented" role="group" aria-label="Show">
            {(['pages', 'hours'] as const).map((k) => (
              <button key={k} className={unit === k ? 'active' : ''} aria-pressed={unit === k} onClick={() => setUnit(k)}>
                {k === 'pages' ? 'Pages' : 'Hours'}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="muted small-text">
        {total.toLocaleString('en-GB')} {unit === 'pages' ? 'pages' : 'hours'} in {year} so far
      </p>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="months-chart" role="img" aria-label={thisYear.map((m) => `${monthName(m.month, 'short')}: ${value(m)}`).join(', ')}>
        {[0.5, 1].map((f) => (
          <g key={f}>
            <line x1={0} x2={W} y1={H - H * f} y2={H - H * f} className="months-grid" />
            {/* under its line, so the top number stays inside the picture */}
            <text x={W} y={H - H * f + 10} textAnchor="end" className="months-scale">
              {Math.round(top * f).toLocaleString('en-GB')}
            </text>
          </g>
        ))}
        {thisYear.map((m, i) => {
          const last = lastYear[i]
          const x = i * slot + slot / 2
          const hNow = (value(m) / top) * H
          const hLast = (value(last) / top) * H
          return (
            <g key={m.month}>
              <rect x={x - bar - 1} y={H - hLast} width={bar} height={hLast} rx={2} className="months-last" />
              <rect x={x + 1} y={H - hNow} width={bar} height={hNow} rx={2} className="months-now" />
              <text x={x} y={H + 13} textAnchor="middle" className="months-label">
                {monthName(m.month, 'short').slice(0, 1)}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="months-key small-text">
        <span className="months-swatch now" aria-hidden /> {year} <span className="months-swatch last" aria-hidden /> {year - 1}
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Where your books are set (reading in pictures, part 4)
// ---------------------------------------------------------------------------

interface CountryShape {
  name: string
  d: string
  /** its bounding box, in map units: the top-left corner is where its cover tiles start */
  x: number
  y: number
  w: number
  h: number
}

/** One cover tile on the map, in map units (2:3, a book's shape; T-0018). */
export const TILE_W = 8
export const TILE_H = 12

/**
 * A lit country's patchwork: one tile per book in tile order, about square
 * (`ceil(√n)` columns), the last row filled on from the first book so a
 * repeat never leaves a hole.
 */
function CoverPattern({
  id,
  x,
  y,
  books,
  broken,
  onBroken,
}: {
  id: string
  x: number
  y: number
  books: Book[]
  /** covers that failed to load: their tiles show only the spine colour */
  broken: ReadonlySet<string>
  onBroken: (url: string) => void
}) {
  const cols = Math.ceil(Math.sqrt(books.length))
  const rows = Math.ceil(books.length / cols)
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" x={x} y={y} width={cols * TILE_W} height={rows * TILE_H}>
      {Array.from({ length: cols * rows }, (_, i) => {
        const b = books[i % books.length]
        const tx = (i % cols) * TILE_W
        const ty = Math.floor(i / cols) * TILE_H
        return (
          <g key={i} className="world-tile">
            {/* the spine colour behind every tile: shows while the cover loads, when it fails, and for a book without one */}
            <rect x={tx} y={ty} width={TILE_W} height={TILE_H} fill={b.color} />
            {b.coverUrl && !broken.has(b.coverUrl) && (
              <image href={coverAtSize(b.coverUrl, 'S')} x={tx} y={ty} width={TILE_W} height={TILE_H} preserveAspectRatio="xMidYMid slice" onError={() => onBroken(b.coverUrl!)} />
            )}
          </g>
        )
      })}
    </pattern>
  )
}

/**
 * A cover that opens its book (T-0039): in the country card and in an imaginary land's row.
 * The button carries the title; a missing or broken cover is a spine-colour chip.
 */
function CoverButton({ book, onShowBook }: { book: Book; onShowBook?: (id: string) => void }) {
  const [broken, setBroken] = useState(false)
  return (
    <button type="button" className="world-cover" aria-label={book.title} title={book.title} onClick={() => onShowBook?.(book.id)}>
      {!book.coverUrl || broken ? (
        <span className="cover-chip" style={{ background: book.color }} />
      ) : (
        <img src={coverAtSize(book.coverUrl, 'M')} alt="" loading="lazy" style={{ background: book.color }} onError={() => setBroken(true)} />
      )}
    </button>
  )
}

/**
 * The world as SVG paths (equirectangular, Antarctica left out), loaded once when the block first shows.
 * The far north and south fall outside the picture's frame (cut off, not squashed onto its edge).
 */
let worldShapes: Promise<CountryShape[]> | null = null
const MAP_W = 360
const LAT_BOTTOM = -58
const MAP_H = LAT_TOP - LAT_BOTTOM

function loadWorld(): Promise<CountryShape[]> {
  worldShapes ??= Promise.all([import('world-atlas/countries-110m.json'), import('topojson-client')]).then(([data, topo]) => {
    const world = (data as { default?: unknown }).default ?? data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = topo.feature(world as any, (world as any).objects.countries) as unknown as {
      features: Array<{ properties: { name: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } | null }>
    }
    return fc.features
      .filter((f) => f.geometry && f.properties.name !== 'Antarctica')
      .map((f) => {
        const g = f.geometry!
        const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as number[][][][]
        // the top-left corner of its points, where its cover tiles start (T-0018), and its size (T-0039's tap zones)
        let x = MAP_W
        let y = MAP_H
        let x2 = 0
        let y2 = 0
        for (const poly of polys)
          for (const r of poly)
            for (const [lon, lat] of r) {
              x = Math.min(x, lon + 180)
              y = Math.min(y, LAT_TOP - lat)
              x2 = Math.max(x2, lon + 180)
              y2 = Math.max(y2, LAT_TOP - lat)
            }
        return { name: f.properties.name, d: polygonsToPath(polys), x, y, w: x2 - x, h: y2 - y }
      })
  })
  return worldShapes
}

/** A press that moves less than this on screen is a tap (the shelf's own threshold). */
const TAP_SLOP = 6
/** Every lit country is at least this big a target on screen (T-0039's tap zones). */
const TAP_ZONE = 44
const GLIDE_MS = 150

const countryAt = (t: EventTarget | null): string | null => (t instanceof Element ? (t.closest('[data-country]')?.getAttribute('data-country') ?? null) : null)
const isFocusVisible = (el: Element) => {
  try {
    return el.matches(':focus-visible')
  } catch {
    return true
  }
}
const reducedMotion = () => typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function BooksWorldMapCard({ books, onShowBook }: { books: Book[]; onShowBook?: (id: string) => void }) {
  const [shapes, setShapes] = useState<CountryShape[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    loadWorld()
      .then((s) => live && setShapes(s))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])
  const known = useMemo(() => new Set((shapes ?? []).map((s) => s.name)), [shapes])
  const map = useMemo(() => worldMap(books, known), [books, known])
  const lit = useMemo(() => byBooks(map.countries), [map])
  const top = lit.slice(0, 6)
  const lands = useMemo(() => byBooks(map.imaginary), [map])
  const uid = 'world' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const cardId = `${uid}-card`
  // covers that failed to load: Chrome draws a broken-image sign for them, so they're left out and the spine colour shows
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set())
  const markBroken = useCallback((url: string) => setBroken((s) => (s.has(url) ? s : new Set(s).add(url))), [])
  // the lit countries in alphabetical order: drawn above the plain ones, and their Tab order
  const litShapes = useMemo(
    () => (shapes ?? []).filter((s) => map.countries.has(s.name)).sort((a, b) => a.name.localeCompare(b.name)),
    [shapes, map],
  )
  const patternOf = useMemo(() => new Map((shapes ?? []).map((s, i) => [s.name, `${uid}-covers-${i}`])), [shapes, uid])
  const label = lit.length ? `World map of where your books are set: ${lit.map(([c]) => c).join(', ')}` : 'World map'

  // ---- zoom: the part of the map that is shown (the svg's viewBox) ------------------------------
  const [view, setView] = useState<MapView>(() => wholeMap(MAP_W, MAP_H))
  const shown = useRef(view)
  shown.current = view
  /** where the view is going: gestures and presses start from here, also during a glide */
  const target = useRef(view)
  const glideFrame = useRef<number | null>(null)
  const stopGlide = () => {
    if (glideFrame.current !== null) cancelAnimationFrame(glideFrame.current)
    glideFrame.current = null
  }
  const jump = useCallback((v: MapView) => {
    stopGlide()
    target.current = v
    setView(v)
  }, [])
  const glide = (v: MapView) => {
    stopGlide()
    target.current = v
    if (reducedMotion() || typeof requestAnimationFrame !== 'function') return setView(v)
    const from = shown.current
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / GLIDE_MS)
      setView(t >= 1 ? v : between(from, v, 1 - (1 - t) ** 3))
      glideFrame.current = t < 1 ? requestAnimationFrame(step) : null
    }
    glideFrame.current = requestAnimationFrame(step)
  }
  useEffect(() => stopGlide, [])
  const zoom = zoomOf(view, MAP_W)
  const zoomed = zoom > 1 + 1e-6
  const atMax = zoom >= MAP_ZOOM_MAX - 1e-6
  const zoomBy = (factor: number) => glide(zoomAround(target.current, factor, 0.5, 0.5, MAP_W, MAP_H))

  // the map's width on screen, for the tap zones
  const [svgEl, setSvgEl] = useState<SVGSVGElement | null>(null)
  const [pxWide, setPxWide] = useState(0)
  useEffect(() => {
    if (!svgEl) return
    const measure = () => setPxWide(svgEl.getBoundingClientRect().width)
    measure()
    if (typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(measure)
    ro.observe(svgEl)
    return () => ro.disconnect()
  }, [svgEl])
  const pxPerUnit = pxWide / view.w
  // lit countries smaller than a fingertip get an invisible 44 px wide edge to tap; the largest first, so the smallest wins
  const zones = litShapes.filter((s) => s.w * pxPerUnit < TAP_ZONE || s.h * pxPerUnit < TAP_ZONE).sort((a, b) => b.w * b.h - a.w * a.h)

  // ---- the chosen country and its card -----------------------------------------------------------
  const [chosen, setChosen] = useState<string | null>(null)
  const opener = useRef<Element | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [focusTick, setFocusTick] = useState(0)
  const [focused, setFocused] = useState<string | null>(null)
  /** a drag or a pinch just happened: the click that may follow it isn't a tap */
  const notATap = useRef(false)
  const openCard = (name: string, from: Element | null) => {
    setChosen(name)
    opener.current = from
    setFocusTick((t) => t + 1)
  }
  const closeCard = (refocus: boolean) => {
    const from = opener.current
    setChosen(null)
    opener.current = null
    if (!refocus) return
    const back = from && from.isConnected ? from : document.getElementById('world-title')
    ;(back as HTMLElement | SVGElement | null)?.focus()
  }
  const toggle = (name: string, from: Element | null, refocus: boolean) => (name === chosen ? closeCard(refocus) : openCard(name, from))
  useEffect(() => {
    if (!focusTick) return
    const h = headingRef.current
    if (!h) return
    h.focus({ preventScroll: true })
    h.closest('.world-pick')?.scrollIntoView?.({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [focusTick])
  const litPath = (name: string) => [...(svgEl?.querySelectorAll('path.world-country.lit') ?? [])].find((p) => p.getAttribute('data-country') === name) ?? null

  // ---- gestures: tap, drag to pan, pinch, Ctrl+scroll ------------------------------------------
  const [grabbing, setGrabbing] = useState(false)
  useEffect(() => {
    const el = svgEl
    if (!el) return
    const points = new Map<number, { x: number; y: number }>()
    let press: { id: number; x0: number; y0: number; x: number; y: number; drag: boolean; mouse: boolean } | null = null
    let pinch: { dist: number; mx: number; my: number } | null = null
    const box = () => el.getBoundingClientRect()
    const fraction = (cx: number, cy: number): [number, number] => {
      const r = box()
      return r.width > 0 && r.height > 0 ? [(cx - r.left) / r.width, (cy - r.top) / r.height] : [0.5, 0.5]
    }
    const unitsPerPx = () => {
      const r = box()
      return r.width > 0 ? target.current.w / r.width : 0
    }
    const pair = () => {
      const [a, b] = [...points.values()]
      return { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
    }
    const isZoomed = () => zoomOf(target.current, MAP_W) > 1 + 1e-6
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      points.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (points.size === 1) {
        notATap.current = false
        press = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, drag: false, mouse: e.pointerType === 'mouse' }
      } else if (points.size === 2) {
        // a second finger turns the press into a pinch: no tap, no card
        pinch = pair()
        press = null
        notATap.current = true
      }
    }
    const move = (e: PointerEvent) => {
      if (!points.has(e.pointerId)) return
      points.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pinch && points.size === 2) {
        const p = pair()
        const [fx, fy] = fraction(p.mx, p.my)
        const zoomedView = zoomAround(target.current, p.dist / Math.max(1, pinch.dist), fx, fy, MAP_W, MAP_H)
        const r = box()
        const u = r.width > 0 ? zoomedView.w / r.width : 0
        jump(panView(zoomedView, -(p.mx - pinch.mx) * u, -(p.my - pinch.my) * u, MAP_W, MAP_H))
        pinch = p
        return
      }
      if (!press || e.pointerId !== press.id) return
      if (!press.drag) {
        if (Math.hypot(e.clientX - press.x0, e.clientY - press.y0) < TAP_SLOP) return
        press.drag = true
        notATap.current = true
        if (press.mouse && isZoomed()) {
          el.setPointerCapture?.(e.pointerId)
          setGrabbing(true)
        }
      }
      // zoomed in: the map follows the mouse or finger; at zoom one a drag does nothing (on touch the page scrolls)
      if (isZoomed()) {
        const u = unitsPerPx()
        jump(panView(target.current, -(e.clientX - press.x) * u, -(e.clientY - press.y) * u, MAP_W, MAP_H))
      }
      press.x = e.clientX
      press.y = e.clientY
    }
    const up = (e: PointerEvent) => {
      if (!points.delete(e.pointerId)) return
      if (points.size < 2) pinch = null
      if (press && e.pointerId === press.id) {
        if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId)
        press = null
        setGrabbing(false)
      }
    }
    // Ctrl+scroll, and a trackpad pinch (which comes as Ctrl+scroll), zooms around the pointer; a plain wheel scrolls the page
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const unit = e.deltaMode === 1 ? 16 : 1
      const [fx, fy] = fraction(e.clientX, e.clientY)
      jump(zoomAround(target.current, Math.exp(-e.deltaY * unit * 0.01), fx, fy, MAP_W, MAP_H))
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('wheel', wheel)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [svgEl, jump])

  const onMapClick = (e: ReactMouseEvent) => {
    if (notATap.current) {
      notATap.current = false
      return
    }
    let name = countryAt(e.target)
    // the sea does nothing
    if (!name) return
    // a tap zone never steals a tap from a lit country's own shape under it (UK next to the Netherlands)
    if (e.target instanceof Element && e.target.classList.contains('world-zone') && typeof document.elementsFromPoint === 'function') {
      const own = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.matches('path.world-country.lit'))
      name = own?.getAttribute('data-country') ?? name
    }
    toggle(name, map.countries.has(name) ? litPath(name) : null, false)
  }
  const zoomKeys = (e: ReactKeyboardEvent) => {
    if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      if (!atMax) zoomBy(MAP_ZOOM_STEP)
      return true
    }
    if (e.key === '-' || e.key === '−') {
      e.preventDefault()
      if (zoomed) zoomBy(1 / MAP_ZOOM_STEP)
      return true
    }
    return false
  }
  const onMapKey = (e: ReactKeyboardEvent) => {
    if (zoomKeys(e)) return
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const dir = arrows[e.key]
    if (dir) {
      // at zoom one the page scrolls as usual
      if (!zoomed) return
      e.preventDefault()
      const v = target.current
      jump(panView(v, (dir[0] * v.w) / 5, (dir[1] * v.h) / 5, MAP_W, MAP_H))
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      const t = e.target instanceof Element ? e.target : null
      const name = t?.getAttribute('data-country')
      if (!t || !name || t.getAttribute('role') !== 'button') return
      e.preventDefault()
      toggle(name, t, true)
    }
  }
  const onBlockKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape' && chosen) {
      e.preventDefault()
      closeCard(true)
    }
  }

  // the plain countries and the cover patterns don't change while zooming: drawn once
  const defs = useMemo(
    () =>
      shapes && (
        <defs>
          {litShapes.map((s) => (
            <CoverPattern key={s.name} id={patternOf.get(s.name)!} x={s.x} y={s.y} books={map.countries.get(s.name)!} broken={broken} onBroken={markBroken} />
          ))}
        </defs>
      ),
    [shapes, litShapes, patternOf, map, broken, markBroken],
  )
  const plain = useMemo(
    () =>
      (shapes ?? [])
        .filter((s) => !map.countries.has(s.name))
        .map((s) => (
          <path key={s.name} d={s.d} className="world-country" data-country={s.name}>
            <title>{s.name}</title>
          </path>
        )),
    [shapes, map],
  )
  const chosenShape = chosen ? shapes?.find((s) => s.name === chosen) : undefined
  const chosenLit = !!chosen && map.countries.has(chosen)
  const focusShape = focused && focused !== chosen ? litShapes.find((s) => s.name === focused) : undefined
  const chosenBooks = (chosen && map.countries.get(chosen)) || []

  return (
    <section className="dash-card world-card" aria-labelledby="world-title" onKeyDown={onBlockKey}>
      <div className="dash-card-head">
        <h2 id="world-title" tabIndex={-1}>
          Where your books are set
        </h2>
      </div>
      {failed ? (
        <p className="muted small-text">The map couldn't be loaded right now.</p>
      ) : !shapes ? (
        <p className="muted small-text">Unfolding the map…</p>
      ) : (
        <>
          <div className="world-map-frame">
            <svg
              ref={setSvgEl}
              viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
              className={`world-map${zoomed ? ' zoomed' : ''}${grabbing ? ' grabbing' : ''}`}
              style={{ touchAction: zoomed ? 'none' : 'pan-x pan-y' }}
              role="group"
              aria-label={label}
              tabIndex={zoomed ? 0 : undefined}
              onClick={onMapClick}
              onKeyDown={onMapKey}
              onFocus={(e) => {
                const name = e.target.getAttribute('data-country')
                setFocused(name && e.target.getAttribute('role') === 'button' && isFocusVisible(e.target) ? name : null)
              }}
              onBlur={() => setFocused(null)}
            >
              {defs}
              {plain}
              {litShapes.map((s) => (
                <path
                  key={s.name}
                  d={s.d}
                  className="world-country lit"
                  data-country={s.name}
                  style={{ fill: `url(#${patternOf.get(s.name)})` }}
                  role="button"
                  tabIndex={0}
                  aria-label={s.name}
                  aria-expanded={chosen === s.name}
                  aria-controls={cardId}
                >
                  <title>{[s.name, ...map.countries.get(s.name)!.map((b) => b.title)].join('\n')}</title>
                </path>
              ))}
              {/* lit countries' outlines above every filled country, so a lit neighbour can't paint over one */}
              <g className="world-outlines" aria-hidden>
                {litShapes.map((s) => (
                  <Fragment key={s.name}>
                    <path d={s.d} className="world-outline-edge" />
                    <path d={s.d} className="world-outline" />
                  </Fragment>
                ))}
              </g>
              {/* tap zones: tiny lit countries reach 22 px beyond their edge on screen */}
              <g className="world-zones" aria-hidden>
                {zones.map((s) => (
                  <path key={s.name} d={s.d} className="world-zone" data-country={s.name} />
                ))}
              </g>
              {/* the chosen country (solid gold) and the Tab-focused one (dashed), above everything */}
              <g className="world-marks" aria-hidden>
                {focusShape && (
                  <>
                    <path d={focusShape.d} className="world-mark-edge" />
                    <path d={focusShape.d} className="world-mark focus" />
                  </>
                )}
                {chosenShape && (
                  <>
                    <path d={chosenShape.d} className={chosenLit ? 'world-mark-edge' : 'world-mark-edge plain'} />
                    <path d={chosenShape.d} className="world-mark" />
                  </>
                )}
              </g>
            </svg>
            <div className="world-zoom" role="group" aria-label="Zoom" onKeyDown={zoomKeys}>
              <button type="button" className="btn" aria-label="Zoom in" title="Zoom in (Ctrl + scroll)" disabled={atMax} onClick={() => zoomBy(MAP_ZOOM_STEP)}>
                +
              </button>
              <button type="button" className="btn" aria-label="Zoom out" title="Zoom out" disabled={!zoomed} onClick={() => zoomBy(1 / MAP_ZOOM_STEP)}>
                −
              </button>
              <button type="button" className="btn" aria-label="Show the whole map" title="Show the whole map" disabled={!zoomed} onClick={() => glide(wholeMap(MAP_W, MAP_H))}>
                ⤢
              </button>
            </div>
          </div>
          {chosen && (
            <section className="bingo-suggest world-pick" id={cardId} aria-labelledby={`${cardId}-title`}>
              <div className="bingo-suggest-top">
                <h3 id={`${cardId}-title`} ref={headingRef} tabIndex={-1}>
                  {chosen}
                </h3>
              </div>
              {chosenBooks.length > 0 ? (
                <ul className="world-covers">
                  {chosenBooks.map((b) => (
                    <li key={b.id}>
                      <CoverButton book={b} onShowBook={onShowBook} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No books set here yet.</p>
              )}
              {/* last in tab order, drawn top right */}
              <button type="button" className="btn icon small bingo-suggest-close" aria-label="Close" onClick={() => closeCard(true)}>
                ×
              </button>
            </section>
          )}
          {top.length > 0 && (
            <ul className="world-top">
              {top.map(([c]) => (
                <li key={c}>
                  <button
                    type="button"
                    className={chosen === c ? 'world-name chosen' : 'world-name'}
                    aria-expanded={chosen === c}
                    aria-controls={cardId}
                    onClick={(e) => toggle(c, e.currentTarget, true)}
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {lands.length > 0 && (
            <div className="world-lands-block">
              <h3 className="world-lands-title">
                <span aria-hidden>🗺️ </span>Imaginary lands
              </h3>
              <ul className="world-lands">
                {lands.map(([land, list]) => (
                  <li key={land}>
                    <span className="world-land-name">{land}</span>
                    <ul className="world-land-books" aria-label={land}>
                      {list.map((b) => (
                        <li key={b.id}>
                          <CoverButton book={b} onShowBook={onShowBook} />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {map.waiting > 0 && <p className="muted small-text">Looking up where more of your books are set…</p>}
          {map.waiting === 0 && top.length === 0 && lands.length === 0 && (
            <p className="muted small-text">Open Library doesn't know where your finished books are set yet.</p>
          )}
        </>
      )}
    </section>
  )
}
