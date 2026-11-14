import { useEffect, useMemo, useState } from 'react'
import { loadGoals, saveGoal } from '#/server/shelf'
import type { Book } from '#/lib/library'
import { dailyFact } from '#/lib/facts'
import { formatDuration } from '#/lib/listening'
import {
  breakdown,
  goalProgress,
  lentOut,
  monthlyCounts,
  onThisDay,
  paused,
  reading,
  readingStreak,
  records,
  seriesProgress,
  wantPile,
} from '#/lib/insights'
import { goalPace, goalPaceText } from '#/lib/insightsMore'
import type { BreakdownKind } from '#/lib/insights'
import { periodStats } from '#/lib/stats'
import { amountText } from '#/lib/readingLog'
import { addedText, recentlyAdded } from '#/lib/recent'
import type { DayEntry } from '#/lib/readingLog'
import type { Period } from '#/lib/stats'
import { Cover, monthName } from './Dashboard'
import type { Props } from './Dashboard'

/** The dashboard extras (#66). */

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`

export function BookLine({
  book,
  onShowBook,
  children,
}: {
  book: Book
  onShowBook: (id: string) => void
  children?: React.ReactNode
}) {
  return (
    <li className="book-line">
      <button className="cover-btn" aria-label={`Show ${book.title} on the shelf`} onClick={() => onShowBook(book.id)}>
        <Cover book={book} small />
      </button>
      <div className="book-line-text">
        <button className="link-btn" onClick={() => onShowBook(book.id)}>
          {book.title}
        </button>
        {children}
      </div>
    </li>
  )
}

// ---- reading goal ----------------------------------------------------------

/**
 * The goal is kept on the account server, so every device shows the same one,
 * with a copy in this browser for a quick start and for when the server can't
 * be reached. Without an account it lives in this browser only.
 */
const goalKey = (accountId: string | null, year: number) =>
  `hannas-reading-list:goal:${accountId ?? 'local'}:${year}`

function readLocalGoal(key: string): number | null {
  try {
    const n = Number(localStorage.getItem(key))
    return Number.isInteger(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function writeLocalGoal(key: string, goal: number | null) {
  try {
    if (goal) localStorage.setItem(key, String(goal))
    else localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function GoalCard({ books, accountId }: { books: Book[]; accountId: string | null }) {
  const now = new Date()
  const year = now.getFullYear()
  const key = goalKey(accountId, year)
  const [goal, setGoal] = useState(() => readLocalGoal(key))
  const [draft, setDraft] = useState(goal?.toString() ?? '')
  const [editing, setEditing] = useState(false)
  const done = useMemo(() => periodStats(books, { kind: 'year', year }).books, [books, year])

  // the goal on the server wins; a goal only this browser knows is sent up
  useEffect(() => {
    if (!accountId) return
    let live = true
    loadGoals()
      .then((goals) => {
        if (!live || goals === null) return
        const remote = goals[String(year)] ?? null
        const local = readLocalGoal(key)
        if (remote !== null) {
          writeLocalGoal(key, remote)
          setGoal(remote)
          setDraft(String(remote))
        } else if (local !== null) {
          saveGoal({ data: { year, goal: local } }).catch(() => {})
        }
      })
      // offline, or the server doesn't keep goals yet: the copy here will do
      .catch(() => {})
    return () => {
      live = false
    }
  }, [accountId, key, year])

  const save = () => {
    const n = Number(draft)
    const next = Number.isInteger(n) && n > 0 && n <= 1000 ? n : null
    writeLocalGoal(key, next)
    if (accountId) saveGoal({ data: { year, goal: next } }).catch(() => {})
    setGoal(next)
    setEditing(false)
  }

  const form = (
    <form
      className="goal-form"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <label>
        <span className="muted">Books in {year}</span>
        <input
          className="input"
          type="number"
          min={1}
          max={1000}
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus={editing}
        />
      </label>
      <button className="btn small primary">Save</button>
    </form>
  )

  if (!goal || editing) {
    return (
      <section className="dash-card goal-card" aria-labelledby="goal-title">
        <h2 id="goal-title">Reading goal</h2>
        {!goal && <p className="muted">How many books would you like to read this year?</p>}
        {form}
      </section>
    )
  }

  const p = goalProgress(done, goal, year, now)
  const share = Math.min(1, done / goal)
  const r = 42
  const c = 2 * Math.PI * r
  const pace =
    done >= goal
      ? 'Goal reached! 🎉'
      : p.ahead > 0
        ? `You're ${plural(p.ahead, 'book')} ahead of schedule`
        : p.ahead < 0
          ? `You're ${plural(-p.ahead, 'book')} behind schedule`
          : 'Right on schedule'
  const toGo = goalPaceText(goalPace(done, goal, year, now))

  return (
    <section className="dash-card goal-card" aria-labelledby="goal-title">
      <div className="dash-card-head">
        <h2 id="goal-title">Reading goal {year}</h2>
        <button className="btn small" onClick={() => setEditing(true)}>
          Change
        </button>
      </div>
      <div className="goal-body">
        <svg className="goal-ring" viewBox="0 0 100 100" role="img" aria-label={`${done} of ${goal} books read`}>
          <circle className="goal-track" cx="50" cy="50" r={r} />
          <circle
            className="goal-fill"
            cx="50"
            cy="50"
            r={r}
            strokeDasharray={`${c * share} ${c}`}
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="48" textAnchor="middle" className="goal-number">
            {done}
          </text>
          <text x="50" y="64" textAnchor="middle" className="goal-of">
            of {goal}
          </text>
        </svg>
        <div>
          <p className="goal-pace">{pace}</p>
          {toGo && <p className="goal-to-go">{toGo}</p>}
          <p className="muted small-text">By now {Math.floor(p.expected)} at an even pace</p>
        </div>
      </div>
    </section>
  )
}

// ---- currently reading -------------------------------------------------------

export function CurrentlyReadingCard({ books, onShowBook }: Props) {
  const now = reading(books)
  const rest = paused(books)
  return (
    <section className="dash-card" aria-labelledby="reading-title">
      <h2 id="reading-title">Currently reading</h2>
      {now.length === 0 && <p className="muted">Nothing on the go right now.</p>}
      {now.length > 0 && (
        <ul className="book-list">
          {now.map((b) => {
            const pct = Math.round((b.progress ?? 0) * 100)
            return (
              <BookLine key={b.id} book={b} onShowBook={onShowBook}>
                <div
                  className="progress-bar"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${b.title} progress`}
                >
                  <span style={{ width: `${pct}%` }} />
                </div>
                <span className="muted small-text">{pct}%</span>
              </BookLine>
            )
          })}
        </ul>
      )}
      {rest.length > 0 && (
        <>
          <p className="muted small-text">Paused, waiting to be picked up again:</p>
          <ul className="book-list">
            {rest.map((b) => (
              <BookLine key={b.id} book={b} onShowBook={onShowBook}>
                <span className="muted small-text">paused at {Math.round((b.progress ?? 0) * 100)}%</span>
              </BookLine>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

// ---- series progress -----------------------------------------------------------

export function SeriesCard({ books, onShowBook }: Props) {
  const series = useMemo(() => seriesProgress(books), [books])
  const [all, setAll] = useState(false)
  const shown = all ? series : series.slice(0, 6)
  return (
    <section className="dash-card" aria-labelledby="series-title">
      <h2 id="series-title">Series</h2>
      {series.length === 0 && <p className="muted">No series started yet.</p>}
      <ul className="series-list">
        {shown.map((s) => (
          <li key={s.name} className={s.read === s.total ? 'done' : ''}>
            <div className="series-line">
              <span className="series-name">
                {s.read === s.total && <span aria-label="finished">🏅 </span>}
                {s.name}
              </span>
              <span className="muted">
                {s.read}/{s.total}
              </span>
            </div>
            <div className="series-steps" aria-hidden>
              {s.books.map((b) => (
                <button
                  key={b.id}
                  tabIndex={-1}
                  title={b.title}
                  className={
                    b.status === 'read' || (b.readCount ?? 0) > 0
                      ? 'read'
                      : b.status === 'reading' || b.status === 'paused'
                        ? 'on'
                        : ''
                  }
                  onClick={() => onShowBook(b.id)}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
      {series.length > 6 && (
        <button className="btn small" onClick={() => setAll(!all)}>
          {all ? 'Fewer' : `All ${series.length} series`}
        </button>
      )}
    </section>
  )
}

// ---- books per month -------------------------------------------------------------

export function MonthlyChart({ books, year }: { books: Book[]; year: number }) {
  const counts = useMemo(() => monthlyCounts(books, year), [books, year])
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...counts)
  const top = Math.max(4, Math.ceil(max / 2) * 2)
  const ticks = [0, top / 2, top]
  const W = 360
  const H = 160
  const left = 22
  const bottom = 20
  const plotW = W - left - 4
  const plotH = H - bottom - 8
  const slot = plotW / 12
  const barW = slot - 2 // a 2px gap between bars
  const y = (v: number) => 8 + plotH - (v / top) * plotH
  const total = counts.reduce((a, b) => a + b, 0)

  return (
    <section className="dash-card" aria-labelledby="monthly-title">
      <div className="dash-card-head">
        <h2 id="monthly-title">Books per month · {year}</h2>
        <span className="muted small-text">{plural(total, 'book')}</span>
      </div>
      <div className="chart-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="bar-chart"
          role="img"
          aria-label={`Books finished each month in ${year}`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={left} x2={W - 4} y1={y(t)} y2={y(t)} />
              <text className="axis" x={left - 6} y={y(t) + 3} textAnchor="end">
                {t}
              </text>
            </g>
          ))}
          {counts.map((n, i) => {
            const x = left + i * slot + 1
            const h = (n / top) * plotH
            const r = Math.min(4, h / 2, barW / 2)
            const base = 8 + plotH
            return (
              <g key={i}>
                {n > 0 && (
                  <path
                    className={`bar${hover === i ? ' active' : ''}`}
                    // rounded at the data end, square on the baseline
                    d={`M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + barW - r} Q${x + barW},${base - h} ${x + barW},${base - h + r} V${base} Z`}
                  />
                )}
                {n === max && n > 0 && (
                  <text className="bar-label" x={x + barW / 2} y={base - h - 4} textAnchor="middle">
                    {n}
                  </text>
                )}
                <text className="axis" x={x + barW / 2} y={H - 6} textAnchor="middle">
                  {monthName(i + 1, 'short').slice(0, 1)}
                </text>
                {/* hit target: the whole column */}
                <rect
                  x={left + i * slot}
                  y={0}
                  width={slot}
                  height={H}
                  fill="transparent"
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                />
              </g>
            )
          })}
        </svg>
        {hover !== null && (
          <div className="chart-tip" style={{ left: `${((left + hover * slot + slot / 2) / W) * 100}%` }} role="status">
            <strong>{monthName(hover + 1)}</strong>
            <span>{plural(counts[hover], 'book')}</span>
          </div>
        )}
      </div>
      <details className="table-view">
        <summary className="muted small-text">Show as a table</summary>
        <table>
          <tbody>
            {counts.map((n, i) => (
              <tr key={i}>
                <th scope="row">{monthName(i + 1)}</th>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      {total === 0 && <p className="muted hint">Books with a “Finished on” date in {year} show up here.</p>}
    </section>
  )
}

// ---- what I read ---------------------------------------------------------------------

const BREAKDOWNS: Array<{ kind: BreakdownKind; label: string }> = [
  { kind: 'genre', label: 'Genres' },
  { kind: 'language', label: 'Languages' },
  { kind: 'format', label: 'Formats' },
]

export function BreakdownCard({ books, period, label }: { books: Book[]; period: Period; label: string }) {
  const [kind, setKind] = useState<BreakdownKind>('genre')
  const slices = breakdown(books, period, kind)
  const max = Math.max(1, ...slices.map((s) => s.count))
  return (
    <section className="dash-card" aria-labelledby="breakdown-title">
      <div className="dash-card-head">
        <h2 id="breakdown-title">What I read</h2>
        <div className="segmented" role="group" aria-label="Group by">
          {BREAKDOWNS.map((b) => (
            <button
              key={b.kind}
              className={kind === b.kind ? 'active' : ''}
              aria-pressed={kind === b.kind}
              onClick={() => setKind(b.kind)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small-text">Books read {label}</p>
      {slices.length === 0 ? (
        <p className="muted">Nothing read {label} yet.</p>
      ) : (
        <ul className="hbars">
          {slices.map((s) => (
            <li key={s.label} title={`${s.label}: ${plural(s.count, 'book')}`}>
              <span className="hbar-label">{s.label}</span>
              <span className="hbar-track">
                <span className="hbar" style={{ width: `${(s.count / max) * 100}%` }} />
              </span>
              <span className="hbar-value">{s.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---- records ------------------------------------------------------------------------------

export function RecordsCard({ books, period, label, onShowBook }: Props & { period: Period; label: string }) {
  const rec = records(books, period)
  const rows: Array<[string, React.ReactNode]> = []
  const bookBtn = (b: Book, extra: string) => (
    <>
      <button className="link-btn" onClick={() => onShowBook(b.id)}>
        {b.title}
      </button>{' '}
      <span className="muted">{extra}</span>
    </>
  )
  if (rec.longest) rows.push(['Longest', bookBtn(rec.longest, `${rec.longest.pages} pages`)])
  if (rec.shortest) rows.push(['Shortest', bookBtn(rec.shortest, `${rec.shortest.pages} pages`)])
  if (rec.longestListen)
    rows.push(['Longest listen', bookBtn(rec.longestListen, formatDuration(rec.longestListen.minutes!))])
  if (rec.topAuthor)
    rows.push([
      'Most-read author',
      <>
        {rec.topAuthor.name} <span className="muted">{plural(rec.topAuthor.books, 'book')}</span>
      </>,
    ])
  if (rec.mostReread) rows.push(['Most re-read', bookBtn(rec.mostReread.book, `${rec.mostReread.times}×`)])
  return (
    <section className="dash-card" aria-labelledby="records-title">
      <h2 id="records-title">Records</h2>
      <p className="muted small-text">Among the books read {label}</p>
      {rows.length === 0 ? (
        <p className="muted">No records yet.</p>
      ) : (
        <dl className="records">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

// ---- the pile ----------------------------------------------------------------------------------

export function PileCard({ books }: { books: Book[] }) {
  const pile = wantPile(books)
  const time =
    pile.months === undefined
      ? undefined
      : pile.months < 12
        ? plural(pile.months, 'month')
        : `about ${plural(Math.round(pile.months / 12), 'year')}`
  return (
    <section className="dash-card" aria-labelledby="pile-title">
      <h2 id="pile-title">Want-to-read pile</h2>
      <p className="big-number">
        <strong>{pile.books}</strong> {pile.books === 1 ? 'book' : 'books'} <span className="muted">waiting</span>
      </p>
      <p className="muted small-text">
        {[
          pile.pages > 0 && `${pile.pages.toLocaleString('en-GB')} pages`,
          pile.minutes > 0 && `${formatDuration(pile.minutes)} to listen`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
      {time ? (
        <p>
          At your pace of {pile.perMonth.toFixed(1).replace(/\.0$/, '')} a month, that's {time} of reading.
        </p>
      ) : (
        pile.books > 0 && (
          <p className="muted small-text">
            Once some books have a “Finished on” date, this shows how long the pile would take.
          </p>
        )
      )}
    </section>
  )
}

// ---- streak -----------------------------------------------------------------------------------------

export function StreakCard({ books }: { books: Book[] }) {
  const s = readingStreak(books)
  return (
    <section className="dash-card" aria-labelledby="streak-title">
      <h2 id="streak-title">Reading streak</h2>
      <p className="big-number">
        <strong>{s.current}</strong> {s.current === 1 ? 'day' : 'days'} <span className="muted">in a row</span>
      </p>
      <p className="muted small-text">
        {s.current === 0
          ? 'Read a little today to start a streak.'
          : s.best > s.current
            ? `Best so far: ${plural(s.best, 'day')}.`
            : 'Your best streak yet! 🔥'}
        {s.current > 0 && !s.today && ' Read today to keep it going.'}
      </p>
    </section>
  )
}

// ---- book fact (#101) --------------------------------------------------------------------------------

export function FactCard({ books }: { books: Book[] }) {
  const { fact, today } = dailyFact(books)
  return (
    <section className="dash-card fact-card" aria-labelledby="fact-title">
      <h2 id="fact-title">Book fact</h2>
      <p className="fact-text">{fact}</p>
      <p className="muted small-text">
        {today ? 'A new fact comes with your next reading day.' : 'Read today for a new fact.'}
      </p>
    </section>
  )
}

// ---- on this day ------------------------------------------------------------------------------------

export function OnThisDayCard({ books, onShowBook }: Props) {
  const found = onThisDay(books)
  const thisYear = new Date().getFullYear()
  return (
    <section className="dash-card" aria-labelledby="otd-title">
      <h2 id="otd-title">On this day</h2>
      {found.length === 0 ? (
        <p className="muted">Nothing read on this day in earlier years.</p>
      ) : (
        <ul className="book-list">
          {found.map((f) => (
            <BookLine key={`${f.book.id}-${f.year}`} book={f.book} onShowBook={onShowBook}>
              <span className="muted small-text">
                {f.year}: you {dayStory(f)}, {plural(thisYear - f.year, 'year')} ago
              </span>
            </BookLine>
          ))}
        </ul>
      )}
    </section>
  )
}

/** "started it", "read 30 pages", "read 30 pages and finished it". */
export function dayStory(e: DayEntry): string {
  const parts = [
    e.started && 'started it',
    e.amount && `read ${amountText(e.book, e.amount)}`,
    e.finished && 'finished it',
  ].filter((p): p is string => !!p)
  if (parts.length === 0) return 'read in it'
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

// ---- lent out ------------------------------------------------------------------------------------------

export function LentCard({ books, onShowBook }: Props) {
  const lent = lentOut(books)
  return (
    <section className="dash-card" aria-labelledby="lent-title">
      <h2 id="lent-title">Lent out</h2>
      {lent.length === 0 ? (
        <p className="muted">All your books are home.</p>
      ) : (
        <ul className="book-list">
          {lent.map((l) => (
            <BookLine key={l.book.id} book={l.book} onShowBook={onShowBook}>
              <span className="muted small-text">
                with {l.to}
                {l.days !== undefined && (l.days === 0 ? ', since today' : `, for ${plural(l.days, 'day')}`)}
              </span>
            </BookLine>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---- newly added (#132) ---------------------------------------------------------------

/** The covers of the last ten books added to the shelf, newest first; a tap opens one. */
export function RecentCard({ books, onShowBook }: Props) {
  const recent = recentlyAdded(books)
  return (
    <section className="dash-card" aria-labelledby="recent-title">
      <h2 id="recent-title">Newly added</h2>
      {recent.length === 0 ? (
        <p className="muted small-text">Books you add show up here.</p>
      ) : (
        <ul className="recent-covers">
          {recent.map((b) => {
            const label = `${b.title}, ${addedText(b.addedAt)}`
            return (
              <li key={b.id}>
                <button className="cover-btn" title={label} aria-label={label} onClick={() => onShowBook(b.id)}>
                  <Cover book={b} small />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
