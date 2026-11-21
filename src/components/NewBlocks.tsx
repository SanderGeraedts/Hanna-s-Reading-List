import { useEffect, useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { badges } from '#/lib/badges'
import type { Badge } from '#/lib/badges'
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
  // like Steam: unlocked first (newest on top), then the locked ones closest to done;
  // secret badges stay hidden until unlocked: a locked "?" tile, with a riddle when tapped
  const earned = all
    .filter((b) => b.earned)
    .sort((a, b) => (b.on ?? '').localeCompare(a.on ?? ''))
  const locked = all
    .filter((b) => !b.earned && !b.secret)
    .sort((a, b) => share(b) - share(a))
  const hidden = all.filter((b) => !b.earned && b.secret)
  const [shownRiddle, setShownRiddle] = useState<string | null>(null)
  const [folded, setFolded] = useFolded('badges')
  const percent = Math.round((earned.length / Math.max(1, all.length)) * 100)
  return (
    <section className={`dash-card${folded ? ' folded' : ''}`} aria-labelledby="badges-title">
      <div className="dash-card-head">
        {/* the title folds the list away; the count and the bar stay */}
        <button
          type="button"
          className="card-fold"
          aria-expanded={!folded}
          aria-controls="badges-list"
          onClick={() => setFolded(!folded)}
        >
          <h2 id="badges-title">Badges</h2>
          <span className="card-fold-mark" aria-hidden>
            {folded ? '▸' : '▾'}
          </span>
        </button>
        <span className="muted small-text">
          {earned.length} of {all.length} unlocked ({percent}%)
        </span>
      </div>
      <div
        className="progress-bar badges-total"
        role="progressbar"
        aria-label="Badges unlocked"
        aria-valuemin={0}
        aria-valuemax={all.length}
        aria-valuenow={earned.length}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <div id="badges-list" hidden={folded}>
      <ul className="badges">
        {earned.map((b) => (
          <li key={b.id} className="badge earned" title={b.how}>
            <span className="badge-icon" aria-hidden>
              {b.icon}
            </span>
            <span className="badge-text">
              <strong>{b.name}</strong>
              <span className="muted small-text">{b.how}</span>
              <span className="badge-on small-text">
                {b.secret && <span className="badge-secret">secret · </span>}
                {b.on ? `Unlocked ${dayText(b.on)}` : 'Unlocked'}
              </span>
            </span>
          </li>
        ))}
        {locked.map((b) => (
          <li key={b.id} className="badge locked" title={b.how}>
            <span className="badge-icon" aria-hidden>
              {b.icon}
            </span>
            <span className="badge-text">
              <strong>{b.name}</strong>
              <span className="muted small-text">{b.how}</span>
              {b.progress && b.progress.done > 0 && (
                <span className="badge-progress">
                  <span className="progress-bar" aria-hidden>
                    <span style={{ width: `${(b.progress.done / b.progress.goal) * 100}%` }} />
                  </span>
                  <span className="muted small-text">
                    {b.progress.done.toLocaleString('en')} / {b.progress.goal.toLocaleString('en')}
                  </span>
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {hidden.length > 0 && (
        <>
          <p className="badges-hidden muted small-text">
            <span aria-hidden>🔒</span> {hidden.length} hidden {hidden.length === 1 ? 'badge' : 'badges'}. Tap one for a riddle.
          </p>
          <ul className="badges hidden-badges">
            {hidden.map((b) => {
              const open = shownRiddle === b.id
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    className={`badge secret-tile${open ? ' open' : ''}`}
                    aria-expanded={open}
                    aria-label={open ? `Hidden badge: ${b.riddle}` : 'Hidden badge: show its riddle'}
                    onClick={() => setShownRiddle(open ? null : b.id)}
                  >
                    <span className="badge-icon" aria-hidden>
                      {open ? '🔮' : '?'}
                    </span>
                    <span className="badge-text">
                      <strong>???</strong>
                      <span className="muted small-text">{open ? b.riddle : 'Tap for a riddle'}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
      </div>
    </section>
  )
}

/** Whether a block is folded, remembered on this device (like the dashboard's folded sections). */
function useFolded(id: string) {
  const key = `hannas-reading-list:folded-block:${id}`
  const [folded, setState] = useState(() => {
    try {
      return localStorage.getItem(key) === '1'
    } catch {
      return false
    }
  })
  const set = (next: boolean) => {
    setState(next)
    try {
      if (next) localStorage.setItem(key, '1')
      else localStorage.removeItem(key)
    } catch {
      /* storage blocked: it still holds for this visit */
    }
  }
  return [folded, set] as const
}

/** How close a locked badge is to done, 0 to 1. */
const share = (b: Badge) => (b.progress ? b.progress.done / b.progress.goal : 0)

/**
 * "Badge unlocked": a small Steam-like toast in the corner when a badge is
 * earned, a few seconds each, at most three in a row. Each device remembers
 * which badges it has already shown; the very first time it shows none (so
 * the badges she already had don't all pop up at once).
 */
export function BadgeToasts({ books, accountId, ready }: { books: Book[]; accountId: string | null; ready: boolean }) {
  const key = `hannas-reading-list:badges-shown:${accountId ?? 'local'}`
  const [queue, setQueue] = useState<Badge[]>([])
  const earnedIds = useMemo(() => (ready ? badges(books).filter((b) => b.earned) : null), [books, ready])

  useEffect(() => {
    if (!earnedIds) return
    let shown: string[] | null = null
    try {
      const raw = localStorage.getItem(key)
      shown = raw ? (JSON.parse(raw) as string[]) : null
    } catch {
      shown = null
    }
    const fresh = shown ? earnedIds.filter((b) => !shown!.includes(b.id)) : []
    try {
      localStorage.setItem(key, JSON.stringify(earnedIds.map((b) => b.id)))
    } catch {
      /* storage blocked: then no toasts, rather than the same ones every visit */
      return
    }
    if (fresh.length) setQueue((q) => [...q, ...fresh].slice(0, 3))
  }, [earnedIds, key])

  // each toast stays a few seconds, then the next one
  useEffect(() => {
    if (!queue.length) return
    const t = window.setTimeout(() => setQueue((q) => q.slice(1)), 5000)
    return () => window.clearTimeout(t)
  }, [queue])

  const b = queue[0]
  if (!b) return null
  return (
    <div className="badge-toast" role="status" key={b.id} onClick={() => setQueue((q) => q.slice(1))}>
      <span className="badge-toast-icon" aria-hidden>
        {b.icon}
      </span>
      <span className="badge-toast-text">
        <span className="small-text">{b.secret ? 'Secret badge unlocked!' : 'Badge unlocked'}</span>
        <strong>{b.name}</strong>
        <span className="small-text muted">{b.how}</span>
      </span>
    </div>
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
