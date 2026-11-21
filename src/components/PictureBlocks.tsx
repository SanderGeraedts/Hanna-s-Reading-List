import { Fragment, useEffect, useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { genrePetals, petalLength } from '#/lib/genreFlower'
import { monthlyAmounts, niceMax } from '#/lib/monthlyPages'
import type { MonthAmount } from '#/lib/monthlyPages'
import { monthName } from './Dashboard'
import { byCount, worldMap } from '#/lib/places'

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
        return { name: f.properties.name, d: polys.map((poly) => poly.map(ring).join('')).join('') }
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
  const max = Math.max(1, ...map.countries.values())
  const top = [...map.countries].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const lands = byCount(map.imaginary)
  const shade = (n: number) => 0.3 + 0.7 * Math.sqrt(n / max)

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
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="world-map" role="img" aria-label={top.map(([c, n]) => `${c}: ${n}`).join(', ') || 'World map'}>
            {shapes.map((s) => {
              const n = map.countries.get(s.name)
              return (
                <path key={s.name} d={s.d} className={n ? 'world-country lit' : 'world-country'} style={n ? { fillOpacity: shade(n) } : undefined}>
                  <title>{n ? `${s.name}: ${n} ${n === 1 ? 'book' : 'books'}` : s.name}</title>
                </path>
              )
            })}
          </svg>
          {top.length > 0 && (
            <ul className="world-top">
              {top.map(([c, n]) => (
                <li key={c}>
                  <span>{c}</span>
                  <span className="muted small-text">{n}</span>
                </li>
              ))}
            </ul>
          )}
          {lands.length > 0 && (
            <p className="world-lands">
              <span aria-hidden>🗺️ </span>
              <strong>Imaginary lands:</strong>{' '}
              {lands.map(([land, n], i) => (
                <Fragment key={land}>
                  {i > 0 && (
                    <>
                      <span className="visually-hidden">,</span>
                      <span aria-hidden> · </span>
                    </>
                  )}
                  {/* a non-breaking space: the count never starts a line on its own */}
                  {land}
                  {' '}
                  <span className="muted">{n}</span>
                </Fragment>
              ))}
            </p>
          )}
          {map.waiting > 0 && <p className="muted small-text">Looking up where {map.waiting} more {map.waiting === 1 ? 'book is' : 'books are'} set…</p>}
          {map.waiting === 0 && top.length === 0 && lands.length === 0 && (
            <p className="muted small-text">Open Library doesn't know where your finished books are set yet.</p>
          )}
        </>
      )}
    </section>
  )
}
