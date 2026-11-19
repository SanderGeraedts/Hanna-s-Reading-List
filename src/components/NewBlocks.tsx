import { useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { badges } from '#/lib/badges'
import { rhythm, WEEKDAY_NAMES } from '#/lib/rhythm'
import { sleepReadIds } from '#/lib/sleepSeries'
import type { ShareSpec } from '#/lib/shareImage'
import { Cover, monthName } from './Dashboard'
import { ShareButton } from './ShareButton'

const dayText = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** Milestones & badges: every badge, earned ones with their day, the rest greyed out. */
export function BadgesCard({ books }: { books: Book[] }) {
  const all = useMemo(() => badges(books), [books])
  const earned = all.filter((b) => b.earned).length
  return (
    <section className="dash-card" aria-labelledby="badges-title">
      <div className="dash-card-head">
        <h2 id="badges-title">Badges</h2>
        <span className="muted small-text">
          {earned} of {all.length}
        </span>
      </div>
      <ul className="badges">
        {all.map((b) => (
          <li key={b.id} className={b.earned ? 'badge earned' : 'badge'} title={b.how}>
            <span className="badge-icon" aria-hidden>
              {b.icon}
            </span>
            <span className="badge-text">
              <strong>{b.name}</strong>
              <span className="muted small-text">{b.earned ? (b.on ? dayText(b.on) : 'Earned') : b.how}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The covers of every book finished this year, newest first; sleep reads left out. */
export function CoverWallCard({ books, onShowBook }: { books: Book[]; onShowBook: (id: string) => void }) {
  const year = new Date().getFullYear()
  const wall = useMemo(() => {
    const sleep = sleepReadIds(books)
    return books
      .map((b) => ({ book: b, day: (b.finished ?? []).filter((d) => d.startsWith(`${year}-`)).sort().at(-1) }))
      .filter((x): x is { book: Book; day: string } => !!x.day && !sleep.has(x.book.id))
      .sort((a, b) => b.day.localeCompare(a.day))
      .map((x) => x.book)
  }, [books, year])
  const title = `${year} in covers`
  const share = (): ShareSpec => ({
    title,
    subtitle: `${wall.length} ${wall.length === 1 ? 'book' : 'books'} finished`,
    columns: 6,
    aspect: 1.5,
    tiles: wall.map((b) => ({ label: '', cover: b.coverUrl, color: b.color, on: true })),
  })
  return (
    <section className="dash-card" aria-labelledby="coverwall-title">
      <div className="dash-card-head">
        <h2 id="coverwall-title">{title}</h2>
        <span className="muted small-text">{wall.length}</span>
      </div>
      {wall.length === 0 ? (
        <p className="muted small-text">The covers of the books you finish this year show up here.</p>
      ) : (
        <ul className="cover-wall">
          {wall.map((b) => (
            <li key={b.id}>
              <button className="cover-btn" title={b.title} aria-label={b.title} onClick={() => onShowBook(b.id)}>
                <Cover book={b} small />
              </button>
            </li>
          ))}
        </ul>
      )}
      {wall.length > 0 && (
        <div className="challenge-actions">
          <ShareButton spec={share} label={title} />
        </div>
      )}
    </section>
  )
}

/** When I read most: reading days per weekday (last twelve months) and per month (this year). */
export function RhythmCard({ books }: { books: Book[] }) {
  const year = new Date().getFullYear()
  const r = useMemo(() => rhythm(books, year), [books, year])
  const [view, setView] = useState<'week' | 'year'>('week')
  const values = view === 'week' ? r.weekdays : r.months
  const labels = view === 'week' ? WEEKDAY_NAMES.map((d) => d.slice(0, 2)) : Array.from({ length: 12 }, (_, i) => monthName(i + 1, 'short').slice(0, 1))
  const max = Math.max(1, ...values)
  return (
    <section className="dash-card" aria-labelledby="rhythm-title">
      <div className="dash-card-head">
        <h2 id="rhythm-title">When I read most</h2>
        <div className="segmented" role="group" aria-label="Weekdays or months">
          {(['week', 'year'] as const).map((k) => (
            <button key={k} type="button" className={view === k ? 'active' : undefined} aria-pressed={view === k} onClick={() => setView(k)}>
              {k === 'week' ? 'Weekdays' : 'Months'}
            </button>
          ))}
        </div>
      </div>
      {r.line ? <p className="small-text">{r.line}</p> : <p className="muted small-text">Your reading days show up here.</p>}
      <div className="rhythm-bars" role="img" aria-label={values.map((v, i) => `${labels[i]}: ${v}`).join(', ')}>
        {values.map((v, i) => (
          <span key={i} className="rhythm-bar">
            <span className="rhythm-fill" style={{ height: `${(v / max) * 100}%` }} />
            <span className="rhythm-label muted">{labels[i]}</span>
          </span>
        ))}
      </div>
      <p className="muted small-text">
        {view === 'week' ? 'Reading days per weekday, the last twelve months.' : `Reading days per month, ${year}.`}
      </p>
    </section>
  )
}
