import { Fragment, useCallback, useEffect, useId, useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { genrePetals, petalLength } from '#/lib/genreFlower'
import { monthlyAmounts, niceMax } from '#/lib/monthlyPages'
import type { MonthAmount } from '#/lib/monthlyPages'
import { monthName } from './Dashboard'
import { byBooks, worldMap } from '#/lib/places'
import { coverAtSize } from '#/lib/cover'

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
  /** top-left corner of its bounding box, in map units */
  x: number
  y: number
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

/** A tiny cover in an imaginary land's row; a missing or broken cover is a spine-colour chip. */
function LandCover({ book }: { book: Book }) {
  const [broken, setBroken] = useState(false)
  if (!book.coverUrl || broken)
    return <span className="cover-chip" role="img" aria-label={book.title} title={book.title} style={{ background: book.color }} />
  return (
    <img
      src={coverAtSize(book.coverUrl, 'M')}
      alt={book.title}
      title={book.title}
      loading="lazy"
      style={{ background: book.color }}
      onError={() => setBroken(true)}
    />
  )
}

/**
 * The world as SVG paths (equirectangular, Antarctica left out), loaded once when the block first shows.
 * The far north and south fall outside the picture's frame (cut off, not squashed onto its edge).
 */
let worldShapes: Promise<CountryShape[]> | null = null
const MAP_W = 360
const LAT_TOP = 84
const LAT_BOTTOM = -58
const MAP_H = LAT_TOP - LAT_BOTTOM

function loadWorld(): Promise<CountryShape[]> {
  worldShapes ??= Promise.all([import('world-atlas/countries-110m.json'), import('topojson-client')]).then(([data, topo]) => {
    const world = (data as { default?: unknown }).default ?? data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = topo.feature(world as any, (world as any).objects.countries) as unknown as {
      features: Array<{ properties: { name: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } | null }>
    }
    // a ring that crosses the date line (Russia, Fiji) jumps across the map: lift the pen there
    const ring = (pts: number[][]) =>
      pts
        .map(([lon, lat], k) => {
          const jump = k > 0 && Math.abs(lon - pts[k - 1][0]) > 180
          return `${k === 0 || jump ? 'M' : 'L'}${(lon + 180).toFixed(1)},${(LAT_TOP - lat).toFixed(1)}`
        })
        .join('') + 'Z'
    return fc.features
      .filter((f) => f.geometry && f.properties.name !== 'Antarctica')
      .map((f) => {
        const g = f.geometry!
        const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as number[][][][]
        // the top-left corner of its points, where its cover tiles start (T-0018)
        let x = MAP_W
        let y = MAP_H
        for (const poly of polys)
          for (const r of poly)
            for (const [lon, lat] of r) {
              x = Math.min(x, lon + 180)
              y = Math.min(y, LAT_TOP - lat)
            }
        return { name: f.properties.name, d: polys.map((poly) => poly.map(ring).join('')).join(''), x, y }
      })
  })
  return worldShapes
}

export function BooksWorldMapCard({ books }: { books: Book[] }) {
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
  // covers that failed to load: Chrome draws a broken-image sign for them, so they're left out and the spine colour shows
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set())
  const markBroken = useCallback((url: string) => setBroken((s) => (s.has(url) ? s : new Set(s).add(url))), [])
  const litShapes = shapes?.filter((s) => map.countries.has(s.name)) ?? []
  const label = lit.length ? `World map of where your books are set: ${lit.map(([c]) => c).join(', ')}` : 'World map'

  return (
    <section className="dash-card world-card" aria-labelledby="world-title">
      <div className="dash-card-head">
        <h2 id="world-title">Where your books are set</h2>
      </div>
      {failed ? (
        <p className="muted small-text">The map couldn't be loaded right now.</p>
      ) : !shapes ? (
        <p className="muted small-text">Unfolding the map…</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="world-map" role="img" aria-label={label}>
            <defs>
              {shapes.map((s, i) => {
                const list = map.countries.get(s.name)
                return list && <CoverPattern key={s.name} id={`${uid}-covers-${i}`} x={s.x} y={s.y} books={list} broken={broken} onBroken={markBroken} />
              })}
            </defs>
            {shapes.map((s, i) => {
              const list = map.countries.get(s.name)
              return (
                <path key={s.name} d={s.d} className={list ? 'world-country lit' : 'world-country'} style={list ? { fill: `url(#${uid}-covers-${i})` } : undefined}>
                  <title>{list ? [s.name, ...list.map((b) => b.title)].join('\n') : s.name}</title>
                </path>
              )
            })}
            {/* lit countries' outlines above every filled country, so a lit neighbour can't paint over one */}
            <g className="world-outlines" aria-hidden>
              {litShapes.map((s) => (
                <Fragment key={s.name}>
                  <path d={s.d} className="world-outline-edge" />
                  <path d={s.d} className="world-outline" />
                </Fragment>
              ))}
            </g>
          </svg>
          {top.length > 0 && (
            <ul className="world-top">
              {top.map(([c]) => (
                <li key={c}>{c}</li>
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
                          <LandCover book={b} />
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
