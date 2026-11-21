import { useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { genrePetals, petalLength } from '#/lib/genreFlower'

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
