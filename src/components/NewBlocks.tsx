import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import type { Book } from '#/lib/library'
import { badges } from '#/lib/badges'
import type { Badge, Tier } from '#/lib/badges'
import { birthdayOf, clearBirthday, daysInMonth, readBirthday, subscribeBirthday, writeBirthday } from '#/lib/birthday'
import { rhythm, WEEKDAY_NAMES } from '#/lib/rhythm'
import { sleepReadIds } from '#/lib/sleepSeries'
import type { ShareSpec } from '#/lib/shareImage'
import { Cover, monthName } from './Dashboard'
import { ShareButton } from './ShareButton'

const dayText = (day: string) =>
  new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Milestones & badges (T-0042, D-0038): every badge as a round medal in one grid, earned
 * (newest first, bronze/silver/gold rim), then locked (grey, closest to done first), then
 * hidden (a dark "?"). Tapping a medal opens one card under the grid.
 */
export function BadgesCard({ books }: { books: Book[] }) {
  const birthday = useBirthday()
  const all = useMemo(() => badges(books, undefined, { birthday }), [books, birthday])
  // like Steam: unlocked first (newest on top), then the locked ones closest to done;
  // secret badges stay hidden until unlocked: a "?" medal at the end, with a riddle when tapped
  const earned = all.filter((b) => b.earned).sort((a, b) => (b.on ?? '').localeCompare(a.on ?? ''))
  const locked = all.filter((b) => !b.earned && !b.secret).sort((a, b) => share(b) - share(a))
  const hidden = all.filter((b) => !b.earned && b.secret)
  const order = [...earned, ...locked, ...hidden]
  const [folded, setFolded] = useFolded('badges')
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const medals = useRef(new Map<string, HTMLButtonElement>())
  const gridRef = useRef<HTMLUListElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const percent = Math.round((earned.length / Math.max(1, all.length)) * 100)

  // the card follows its badge by id; a badge that is gone closes it
  const chosen = order.find((b) => b.id === chosenId) ?? null
  useEffect(() => {
    if (chosenId && !chosen) setChosenId(null)
  }, [chosenId, chosen])

  // on a phone the card is brought into view when it opens or switches
  useEffect(() => {
    if (!chosenId) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    cardRef.current?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [chosenId])

  // a medal that moves (earned while its card is open) keeps the focus it had
  const focusedBefore =
    typeof document !== 'undefined' && gridRef.current?.contains(document.activeElement)
      ? (document.activeElement as HTMLElement).dataset.id
      : undefined
  useLayoutEffect(() => {
    if (!focusedBefore) return
    const el = medals.current.get(focusedBefore)
    if (el && document.activeElement !== el) el.focus({ preventScroll: true })
  })

  // one Tab stop: the chosen medal, else the last focused one, else the first
  const tabId = chosen?.id ?? (order.some((b) => b.id === focusId) ? focusId : order[0]?.id)

  const close = () => {
    const id = chosenId
    setChosenId(null)
    if (id) medals.current.get(id)?.focus()
  }

  const onGridKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const i = order.findIndex((b) => b.id === (e.target as HTMLElement).dataset.id)
    if (i < 0) return
    const last = order.length - 1
    // columns shown right now, read from the layout: the medals on the first row
    const tops = order.map((b) => medals.current.get(b.id)?.offsetTop ?? 0)
    const cols = Math.max(1, tops.filter((t) => t === tops[0]).length)
    let to: number | null = null
    if (e.key === 'Enter' || e.key === ' ') {
      // handled here (not by the button's own click), so holding Enter toggles once; Space's
      // keyup is cancelled too (onKeyUp below), since some browsers (Firefox) click a button on
      // Space's keyup, which would open the card and close it at once
      e.preventDefault()
      if (!e.repeat) setChosenId(chosenId === order[i].id ? null : order[i].id)
      return
    }
    if (e.key === 'ArrowRight') to = Math.min(last, i + 1)
    else if (e.key === 'ArrowLeft') to = Math.max(0, i - 1)
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = last
    else if (e.key === 'ArrowUp') to = i - cols >= 0 ? i - cols : i
    else if (e.key === 'ArrowDown') to = i + cols <= last ? i + cols : Math.floor(i / cols) < Math.floor(last / cols) ? last : i
    if (to === null) return
    e.preventDefault()
    medals.current.get(order[to].id)?.focus()
  }

  return (
    <section
      className={`dash-card${folded ? ' folded' : ''}`}
      aria-labelledby="badges-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && chosenId) {
          e.preventDefault()
          close()
        }
      }}
    >
      <div className="dash-card-head">
        {/* the title folds the list away; the count and the bar stay */}
        <button
          type="button"
          className="card-fold"
          aria-expanded={!folded}
          aria-controls="badges-list"
          onClick={() => {
            setChosenId(null)
            setFolded(!folded)
          }}
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
      <div id="badges-list" className="badges-body" hidden={folded}>
        <ul
          className="medals"
          aria-label="Badges"
          ref={gridRef}
          onKeyDown={onGridKey}
          onKeyUp={(e) => {
            if (e.key === ' ') e.preventDefault()
          }}
        >
          {order.map((b) => {
            const state = b.earned ? 'earned' : b.secret ? 'hidden' : 'locked'
            const open = b.id === chosenId
            return (
              <li key={b.id}>
                <button
                  type="button"
                  ref={(el) => {
                    if (el) medals.current.set(b.id, el)
                    else medals.current.delete(b.id)
                  }}
                  data-id={b.id}
                  data-state={state}
                  data-tier={b.earned ? b.tier : undefined}
                  className={`medal ${state}${b.earned ? ` ${b.tier}` : ''}${open ? ' chosen' : ''}`}
                  title={state === 'hidden' ? 'Hidden badge' : b.name}
                  aria-label={medalName(b)}
                  aria-expanded={open}
                  aria-controls="badges-card"
                  tabIndex={b.id === tabId ? 0 : -1}
                  onFocus={() => setFocusId(b.id)}
                  onClick={() => setChosenId(open ? null : b.id)}
                >
                  <span className="medal-icon" aria-hidden>
                    {state === 'hidden' ? '?' : b.icon}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {/* always in the page, so opening or switching the card is read out */}
        <section
          id="badges-card"
          ref={cardRef}
          className={`badges-card${chosen ? ' open bingo-suggest' : ''}`}
          // labelled only while open: closed, it points at no heading (T-0043 F11)
          aria-labelledby={chosen ? 'badges-card-title' : undefined}
        >
          <div className="badges-card-body" aria-live="polite" aria-atomic="true">
            {chosen && <MedalCardText b={chosen} />}
          </div>
          {chosen && (
            <button type="button" className="btn icon small bingo-suggest-close" aria-label="Close" onClick={close}>
              ×
            </button>
          )}
        </section>
        {/* remounted on folding, so unsaved picks are dropped */}
        <BirthdayRow key={folded ? 'folded' : 'open'} />
      </div>
    </section>
  )
}

/** This device's birthday (`MM-DD`, D-0039), kept up to date when it's set, changed or cleared. */
export function useBirthday(): string | undefined {
  return useSyncExternalStore(subscribeBirthday, readBirthday, () => undefined)
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)
const birthdayText = (b: string) => `${Number(b.slice(3))} ${monthName(Number(b.slice(0, 2)))}`

/**
 * The birthday row at the end of the Badges block (T-0043, D-0039): day and month, kept on this
 * device only. Empty: two selects and Save; set: "14 May" with Change and Clear. It never shows
 * the secret badge's name or emoji, and never asks for a year.
 */
function BirthdayRow() {
  const birthday = useBirthday()
  const [editing, setEditing] = useState(false)
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [error, setError] = useState<string | null>(null)
  const changeRef = useRef<HTMLButtonElement>(null)
  const dayRef = useRef<HTMLSelectElement>(null)
  const focusNext = useRef<'change' | 'day' | null>(null)
  const showForm = !birthday || editing

  // focus moves on purpose after a state change, never lost
  useEffect(() => {
    const to = focusNext.current
    focusNext.current = null
    if (to === 'change') changeRef.current?.focus()
    else if (to === 'day') dayRef.current?.focus()
  })

  const pick = (set: (v: string) => void) => (v: string) => {
    set(v)
    setError(null)
  }
  const startChange = () => {
    setDay(birthday ? String(Number(birthday.slice(3))) : '')
    setMonth(birthday ? birthday.slice(0, 2) : '')
    setError(null)
    setEditing(true)
    focusNext.current = 'day'
  }
  const cancel = () => {
    setEditing(false)
    setError(null)
    focusNext.current = 'change'
  }
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!day || !month) return setError('Pick a day and a month.')
    const d = Number(day)
    const m = Number(month)
    if (d > daysInMonth(m)) return setError(`There is no ${d} ${monthName(m)}.`)
    writeBirthday(birthdayOf(d, m))
    setEditing(false)
    setError(null)
    focusNext.current = 'change'
  }
  const clear = () => {
    clearBirthday()
    setDay('')
    setMonth('')
    setEditing(false)
    setError(null)
    focusNext.current = 'day'
  }

  return (
    <div className="birthday-row" role="group" aria-labelledby="birthday-label">
      {showForm ? (
        <form
          className="birthday-controls"
          onSubmit={save}
          onKeyDown={(e) => {
            // Escape in Change is Cancel, and stops here (an open medal card stays open)
            if (e.key === 'Escape' && editing) {
              e.preventDefault()
              e.stopPropagation()
              cancel()
            }
          }}
        >
          <span id="birthday-label" className="small-text muted">
            Birthday
          </span>
          <select
            ref={dayRef}
            className="input"
            aria-label="Day"
            value={day}
            onChange={(e) => pick(setDay)(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'birthday-error' : undefined}
          >
            <option value="">Day</option>
            {DAYS.map((d) => (
              <option key={d} value={String(d)}>
                {d}
              </option>
            ))}
          </select>
          <select
            className="input"
            aria-label="Month"
            value={month}
            onChange={(e) => pick(setMonth)(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'birthday-error' : undefined}
          >
            <option value="">Month</option>
            {MONTHS.map((m) => (
              <option key={m} value={String(m).padStart(2, '0')}>
                {monthName(m)}
              </option>
            ))}
          </select>
          <button type="submit" className="btn small">
            Save
          </button>
          {editing && (
            <button type="button" className="btn quiet small" onClick={cancel}>
              Cancel
            </button>
          )}
        </form>
      ) : (
        <div className="birthday-controls">
          <span id="birthday-label" className="small-text muted">
            Birthday
          </span>
          <span id="birthday-date" className="birthday-date small-text">
            {birthdayText(birthday)}
          </span>
          <button
            ref={changeRef}
            type="button"
            className="btn quiet small"
            aria-label="Change birthday"
            aria-describedby="birthday-date"
            onClick={startChange}
          >
            Change
          </button>
          <button type="button" className="btn quiet small" aria-label="Clear birthday" onClick={clear}>
            Clear
          </button>
        </div>
      )}
      {error && (
        <p id="birthday-error" className="birthday-error small-text" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const tierWord = (t: Tier) => t[0].toUpperCase() + t.slice(1)
const count = (n: number) => n.toLocaleString('en')

/** What a screen reader hears for a medal: never a hidden badge's name. */
function medalName(b: Badge): string {
  if (b.earned) return `${b.name}, ${b.tier}, unlocked${b.secret ? ', secret badge' : ''}`
  if (b.secret) return 'Hidden badge'
  return b.progress ? `${b.name}, locked, ${count(b.progress.done)} of ${count(b.progress.goal)}` : `${b.name}, locked`
}

/** The medal card's contents: name, what it takes, and its day or progress (a hidden one's riddle). */
function MedalCardText({ b }: { b: Badge }) {
  if (!b.earned && b.secret) {
    return (
      <>
        <div className="bingo-suggest-top">
          <h3 id="badges-card-title">
            <span className="medal-card-q" aria-hidden>
              ?
            </span>{' '}
            Hidden badge
          </h3>
        </div>
        <p className="medal-riddle small-text">{b.riddle}</p>
      </>
    )
  }
  return (
    <>
      <div className="bingo-suggest-top">
        <h3 id="badges-card-title">
          <span className={b.earned ? undefined : 'medal-card-grey'} aria-hidden>
            {b.icon}
          </span>{' '}
          {b.name}
        </h3>
      </div>
      <p className="muted small-text">{b.how}</p>
      {b.earned ? (
        <p className="badge-on small-text">
          {tierWord(b.tier)} · {b.secret && <><span className="badge-secret">secret</span> · </>}
          {b.on ? `Unlocked ${dayText(b.on)}` : 'Unlocked'}
        </p>
      ) : b.progress ? (
        <div className="badge-progress">
          <span className="progress-bar" aria-hidden>
            <span style={{ width: `${(b.progress.done / b.progress.goal) * 100}%` }} />
          </span>
          <span className="muted small-text">
            {count(b.progress.done)} / {count(b.progress.goal)}
          </span>
        </div>
      ) : (
        <p className="muted small-text">Locked</p>
      )}
    </>
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
  const birthday = useBirthday()
  const earnedIds = useMemo(() => (ready ? badges(books, undefined, { birthday }).filter((b) => b.earned) : null), [books, ready, birthday])

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
      // shown badges stay shown, so clearing and setting the birthday again doesn't toast twice
      localStorage.setItem(key, JSON.stringify([...new Set([...(shown ?? []), ...earnedIds.map((b) => b.id)])]))
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
