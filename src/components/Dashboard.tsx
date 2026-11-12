import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { formatDuration } from '#/lib/listening'
import {
  BookLine,
  BreakdownCard,
  CurrentlyReadingCard,
  GoalCard,
  LentCard,
  MonthlyChart,
  FactCard,
  OnThisDayCard,
  PileCard,
  RecordsCard,
  SeriesCard,
  StreakCard,
  dayStory,
} from './DashboardExtras'
import { pickReadNext, readNextChoices } from '#/lib/readNext'
import { storytelLink } from '#/lib/storytelLink'
import { monthWeeks, periodStats, readingYears } from '#/lib/stats'
import { amountText, amountUnit, finishedIn, monthEntries, startedIn } from '#/lib/readingLog'
import type { DayEntry } from '#/lib/readingLog'
import { percentText } from '#/lib/progress'
import {
  BLOCKS,
  DEFAULT_LAYOUT,
  cleanLayout,
  hideBlock,
  moveBlock,
  placeOf,
  showBlock,
  singleColumn,
} from '#/lib/dashboardLayout'
import type { BlockId, DashboardLayout } from '#/lib/dashboardLayout'
import type { Period } from '#/lib/stats'

/**
 * The dashboard (#59): how many books Hanna read, what to read next, and a
 * calendar of what she read each day (#76). The extras (#66) are in
 * DashboardExtras. She arranges the blocks herself (#85): see dashboardLayout.ts.
 */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const monthName = (month: number, style: 'long' | 'short' = 'long') =>
  new Date(2000, month - 1, 1).toLocaleDateString('en-GB', { month: style })

export interface Props {
  books: Book[]
  /** open a book on the shelf */
  onShowBook: (id: string) => void
}

interface DashboardProps extends Props {
  /** the signed-in account, or null when the shelf lives in this browser only */
  accountId: string | null
}

export interface PeriodPick {
  kind: Period['kind']
  year: number
  month: number
}

export const toPeriod = ({ kind, year, month }: PeriodPick): Period =>
  kind === 'all' ? { kind } : kind === 'year' ? { kind, year } : { kind, year, month }

export const periodLabel = ({ kind, year, month }: PeriodPick) =>
  kind === 'all' ? 'all time' : kind === 'year' ? `in ${year}` : `in ${monthName(month)} ${year}`

const layoutKey = (accountId: string | null) => `hannas-reading-list:dashboard:${accountId ?? 'local'}`

/** The layout, remembered on this device for this account (#85). */
function useLayout(accountId: string | null) {
  const key = layoutKey(accountId)
  const [layout, setState] = useState<DashboardLayout>(() => {
    try {
      return cleanLayout(JSON.parse(localStorage.getItem(key) ?? 'null'))
    } catch {
      return DEFAULT_LAYOUT
    }
  })
  const setLayout = useCallback(
    (next: DashboardLayout) => {
      setState(next)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* storage blocked: it still holds for this visit */
      }
    },
    [key],
  )
  return [layout, setLayout] as const
}

const NARROW = '(max-width: 860px)'

function useNarrow() {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(NARROW).matches)
  useEffect(() => {
    const m = window.matchMedia(NARROW)
    const on = () => setNarrow(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return narrow
}

/** Where a dragged block would land, and which block (or column end) shows the drop line. */
interface Drop {
  column: 0 | 1
  index: number
  /** the block it goes before, or `end:<n>` for the end of visual column n */
  marker: string
}

interface Drag {
  id: BlockId
  dx: number
  dy: number
  drop: Drop | null
}

export function Dashboard({ books, onShowBook, accountId }: DashboardProps) {
  const now = new Date()
  // the period picked under "Books read"; the charts and records follow it
  const [pick, setPick] = useState<PeriodPick>({ kind: 'year', year: now.getFullYear(), month: now.getMonth() + 1 })
  const period = toPeriod(pick)
  const [layout, setLayout] = useLayout(accountId)
  const [arranging, setArranging] = useState(false)
  const [drag, setDrag] = useState<Drag | null>(null)
  const narrow = useNarrow()
  const grid = useRef<HTMLDivElement>(null)
  const start = useRef({ x: 0, y: 0, scroll: 0 })

  const blocks: Record<BlockId, React.ReactNode> = {
    count: <ReadCount books={books} onShowBook={onShowBook} pick={pick} onPick={setPick} />,
    goal: <GoalCard books={books} accountId={accountId} />,
    next: <ReadNextCard books={books} onShowBook={onShowBook} />,
    reading: <CurrentlyReadingCard books={books} onShowBook={onShowBook} />,
    series: <SeriesCard books={books} onShowBook={onShowBook} />,
    monthly: <MonthlyChart books={books} year={pick.year} />,
    calendar: <Calendar books={books} onShowBook={onShowBook} />,
    breakdown: <BreakdownCard books={books} period={period} label={periodLabel(pick)} />,
    records: <RecordsCard books={books} period={period} label={periodLabel(pick)} onShowBook={onShowBook} />,
    pile: <PileCard books={books} />,
    streak: <StreakCard books={books} />,
    onthisday: <OnThisDayCard books={books} onShowBook={onShowBook} />,
    lent: <LentCard books={books} onShowBook={onShowBook} />,
    fact: <FactCard books={books} />,
  }

  const columns: BlockId[][] = narrow ? [singleColumn(layout)] : layout.columns
  const scroller = () => grid.current?.closest<HTMLElement>('.dashboard') ?? null

  /** The drop place under the pointer: before the first block whose middle is below it, in the column it is over. */
  const dropAt = (x: number, y: number, id: BlockId): Drop | null => {
    const cols = [...(grid.current?.querySelectorAll<HTMLElement>(':scope > .dash-column') ?? [])]
    if (!cols.length) return null
    const dist = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      return x < r.left ? r.left - x : x > r.right ? x - r.right : 0
    }
    const visual = cols.reduce((best, el, i) => (dist(el) < dist(cols[best]) ? i : best), 0)
    const others = [...cols[visual].querySelectorAll<HTMLElement>(':scope > .dash-block')].filter(
      (el) => el.dataset.block !== id,
    )
    const rest = hideBlock(layout, id)
    const before = others.find((el) => {
      const r = el.getBoundingClientRect()
      return y < r.top + r.height / 2
    })
    if (before) {
      const place = placeOf(rest, before.dataset.block as BlockId)
      return place && { ...place, marker: before.dataset.block! }
    }
    const last = others.at(-1)
    if (last) {
      const place = placeOf(rest, last.dataset.block as BlockId)
      return place && { column: place.column, index: place.index + 1, marker: `end:${visual}` }
    }
    return { column: visual as 0 | 1, index: 0, marker: `end:${visual}` }
  }

  const handleProps = (id: BlockId) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      start.current = { x: e.clientX, y: e.clientY, scroll: scroller()?.scrollTop ?? 0 }
      setDrag({ id, dx: 0, dy: 0, drop: null })
    },
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (drag?.id !== id) return
      // scroll along near the top and bottom edges
      const el = scroller()
      if (el) {
        if (e.clientY < 80) el.scrollTop -= 14
        else if (e.clientY > window.innerHeight - 60) el.scrollTop += 14
      }
      const scrolled = (el?.scrollTop ?? 0) - start.current.scroll
      setDrag({
        id,
        dx: e.clientX - start.current.x,
        dy: e.clientY - start.current.y + scrolled,
        drop: dropAt(e.clientX, e.clientY, id),
      })
    },
    onPointerUp: () => {
      if (drag?.id === id && drag.drop) setLayout(moveBlock(layout, id, drag.drop.column, drag.drop.index))
      setDrag(null)
    },
    onPointerCancel: () => setDrag(null),
    // without a pointer: arrow keys move the block
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const place = placeOf(layout, id)
      if (!place) return
      const to =
        e.key === 'ArrowUp'
          ? { column: place.column, index: place.index - 1 }
          : e.key === 'ArrowDown'
            ? { column: place.column, index: place.index + 1 }
            : e.key === 'ArrowLeft' && !narrow
              ? { column: 0 as const, index: place.index }
              : e.key === 'ArrowRight' && !narrow
                ? { column: 1 as const, index: place.index }
                : null
      if (!to || to.index < 0) return
      e.preventDefault()
      setLayout(moveBlock(layout, id, to.column, to.index))
    },
  })

  const shown = columns.some((c) => c.length > 0)
  return (
    <div className="dashboard">
      <div className={`dashboard-bar${arranging ? ' arranging' : ''}`}>
        {arranging ? (
          <>
            <p className="small-text">Drag a block by ⠿ to move it anywhere. × hides it until you add it back.</p>
            <div className="dashboard-bar-actions">
              <button className="btn small" onClick={() => setLayout(DEFAULT_LAYOUT)}>
                Reset
              </button>
              <button className="btn small primary" onClick={() => setArranging(false)}>
                Done
              </button>
            </div>
            {layout.hidden.length > 0 && (
              <div className="hidden-blocks">
                <span className="muted small-text">Hidden:</span>
                {layout.hidden.map((id) => (
                  <button key={id} className="btn small" onClick={() => setLayout(showBlock(layout, id))}>
                    + {BLOCKS[id]}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <button className="btn small" onClick={() => setArranging(true)}>
            <span aria-hidden>⠿</span> Arrange
          </button>
        )}
      </div>
      {!shown && <p className="muted dashboard-empty">Every block is hidden. Press Arrange to add some back.</p>}
      <div className={`dashboard-grid${arranging ? ' arranging' : ''}${drag ? ' dragging' : ''}`} ref={grid}>
        {columns.map((ids, visual) => (
          <div className="dash-column" key={visual}>
            {ids.map((id) => {
              const moving = drag?.id === id
              return (
                <div
                  key={id}
                  data-block={id}
                  className={`dash-block${moving ? ' moving' : ''}${drag?.drop?.marker === id ? ' drop-before' : ''}`}
                  style={moving ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
                >
                  {arranging && (
                    <div className="block-tools">
                      <button
                        className="btn icon small block-handle"
                        aria-label={`Move ${BLOCKS[id]}: drag it, or use the arrow keys`}
                        title="Drag to move"
                        {...handleProps(id)}
                      >
                        <span aria-hidden>⠿</span>
                      </button>
                      <button
                        className="btn icon small"
                        aria-label={`Hide ${BLOCKS[id]}`}
                        title="Hide"
                        onClick={() => setLayout(hideBlock(layout, id))}
                      >
                        ×
                      </button>
                    </div>
                  )}
                  {blocks[id]}
                </div>
              )
            })}
            {drag?.drop?.marker === `end:${visual}` && <div className="drop-end" aria-hidden />}
          </div>
        ))}
      </div>
    </div>
  )
}

export function Cover({ book, small }: { book: Book; small?: boolean }) {
  return book.coverUrl ? (
    <img className={`dash-cover${small ? ' small' : ''}`} src={book.coverUrl} alt="" loading="lazy" />
  ) : (
    <span className={`dash-cover blank${small ? ' small' : ''}`} style={{ background: book.color }} aria-hidden>
      {small ? '' : book.title}
    </span>
  )
}

// ---------------------------------------------------------------------------

function ReadCount({
  books,
  onShowBook,
  pick,
  onPick,
}: Props & { pick: PeriodPick; onPick: (pick: PeriodPick) => void }) {
  const { kind, year, month } = pick
  const setKind = (k: Period['kind']) => onPick({ ...pick, kind: k })
  const setYear = (y: number) => onPick({ ...pick, year: y })
  const setMonth = (m: number) => onPick({ ...pick, month: m })
  const years = useMemo(() => readingYears(books), [books])
  const stats = useMemo(() => periodStats(books, toPeriod({ kind, year, month })), [books, kind, year, month])

  const label = periodLabel(pick)
  const step = (by: number) => {
    const d = new Date(year, month - 1 + by, 1)
    onPick({ ...pick, year: d.getFullYear(), month: d.getMonth() + 1 })
  }

  return (
    <section className="dash-card count-card" aria-labelledby="count-title">
      <div className="dash-card-head">
        <h2 id="count-title">Books read</h2>
        <div className="segmented" role="group" aria-label="Period">
          {(['month', 'year', 'all'] as const).map((k) => (
            <button key={k} className={kind === k ? 'active' : ''} aria-pressed={kind === k} onClick={() => setKind(k)}>
              {k === 'all' ? 'All time' : k === 'year' ? 'Year' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {kind !== 'all' && (
        <div className="period-pick">
          {kind === 'month' && (
            <button className="btn icon small" aria-label="Previous month" onClick={() => step(-1)}>
              ‹
            </button>
          )}
          {kind === 'month' && (
            <select
              className="input"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              aria-label="Month"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {monthName(i + 1)}
                </option>
              ))}
            </select>
          )}
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
            {(years.includes(year) ? years : [...years, year].sort((a, b) => b - a)).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {kind === 'month' && (
            <button className="btn icon small" aria-label="Next month" onClick={() => step(1)}>
              ›
            </button>
          )}
        </div>
      )}

      <p className="big-number" aria-live="polite">
        <strong>{stats.books}</strong> {stats.books === 1 ? 'book' : 'books'} <span className="muted">{label}</span>
      </p>
      <p className="muted count-details">
        {[
          stats.reads > stats.books &&
            `${stats.reads - stats.books} re-read${stats.reads - stats.books === 1 ? '' : 's'}`,
          stats.pages > 0 && `${stats.pages.toLocaleString('en-GB')} pages`,
          stats.minutes > 0 && `${formatDuration(stats.minutes)} listened`,
        ]
          .filter(Boolean)
          .join(' · ') || (kind === 'all' ? 'Nothing finished yet.' : 'Nothing finished with a date here yet.')}
      </p>

      {stats.list.length > 0 && (
        <ul className="cover-row" aria-label={`Books read ${label}`}>
          {stats.list.slice(0, 40).map((b) => (
            <li key={b.id}>
              <button className="cover-btn" title={b.title} aria-label={b.title} onClick={() => onShowBook(b.id)}>
                <Cover book={b} small />
              </button>
            </li>
          ))}
          {stats.list.length > 40 && <li className="muted more">+{stats.list.length - 40}</li>}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

function ReadNextCard({ books, onShowBook }: Props) {
  const choices = useMemo(() => readNextChoices(books), [books])
  const [pickedId, setPickedId] = useState<string | null>(null)
  const picked = choices.find((b) => b.id === pickedId)
  // on a phone this opens the Storytel app (#65)
  const storytel = picked && storytelLink(picked)
  const pick = () => setPickedId(pickReadNext(choices, pickedId)?.id ?? null)

  return (
    <section className="dash-card next-card" aria-labelledby="next-title">
      <div className="dash-card-head">
        <h2 id="next-title">What next?</h2>
      </div>
      {picked ? (
        <div className="next-book">
          <Cover book={picked} />
          <div>
            <p className="next-title">{picked.title}</p>
            {picked.authors.length > 0 && <p className="muted">{picked.authors.join(', ')}</p>}
            <div className="next-actions">
              <button className="btn primary" onClick={() => onShowBook(picked.id)}>
                Show on the shelf
              </button>
              {storytel && (
                <a className="btn storytel-link" href={storytel} target="_blank" rel="noopener noreferrer">
                  <span aria-hidden>▶</span> Open in Storytel
                </a>
              )}
              {choices.length > 1 && (
                <button className="btn" onClick={pick}>
                  🎲 Another
                </button>
              )}
            </div>
          </div>
        </div>
      ) : choices.length ? (
        <>
          <p className="muted">
            {choices.length} {choices.length === 1 ? 'book is' : 'books are'} waiting.
          </p>
          <button className="btn primary" onClick={pick}>
            🎲 Pick my next book
          </button>
        </>
      ) : (
        <p className="muted">No unread books waiting on the shelf.</p>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

/**
 * The calendar (#59, #76, #82, #89, #92): what Hanna read, started and
 * finished on each day of a month. Tapping a day (anywhere in it) shows that
 * day; below are the books started and finished that month.
 */
function Calendar({ books, onShowBook }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  /** the day picked, in the month shown */
  const [picked, setPicked] = useState<number | null>(null)
  const byDay = useMemo(() => monthEntries(books, year, month), [books, year, month])
  const started = useMemo(() => startedIn(books, year, month), [books, year, month])
  const finished = useMemo(() => finishedIn(books, year, month), [books, year, month])
  const weeks = monthWeeks(year, month)
  const isToday = (d: number) => year === now.getFullYear() && month === now.getMonth() + 1 && d === now.getDate()
  const isFuture = (d: number) => new Date(year, month - 1, d) > now
  const show = (y: number, m: number) => {
    setYear(y)
    setMonth(m)
    setPicked(null)
  }
  const step = (by: number) => {
    const d = new Date(year, month - 1 + by, 1)
    show(d.getFullYear(), d.getMonth() + 1)
  }
  const name = monthName(month)

  return (
    <section className="dash-card calendar-card" aria-labelledby="calendar-title">
      <div className="dash-card-head">
        <h2 id="calendar-title">
          {name} {year}
        </h2>
        <div className="period-pick">
          <button className="btn icon small" aria-label="Previous month" onClick={() => step(-1)}>
            ‹
          </button>
          <button className="btn small" onClick={() => show(now.getFullYear(), now.getMonth() + 1)}>
            Today
          </button>
          <button className="btn icon small" aria-label="Next month" onClick={() => step(1)}>
            ›
          </button>
        </div>
      </div>
      <table className="calendar">
        <thead>
          <tr>
            {WEEKDAYS.map((d) => (
              <th key={d} scope="col">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((d, j) => {
                const entries = d ? (byDay.get(d) ?? []) : []
                const story = entries.map((e) => `${e.book.title}, you ${dayStory(e)}`).join('; ')
                return (
                  <td
                    key={j}
                    className={[
                      !d && 'outside',
                      d && isToday(d) && 'today',
                      entries.length && 'has-books',
                      d && d === picked && 'picked',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {d && (
                      // the whole day is the button; the covers don't lead to the shelf (#82, #89)
                      <button
                        className="day-cell"
                        disabled={isFuture(d)}
                        aria-pressed={d === picked}
                        aria-label={`${d} ${name}${story ? `: ${story}` : ''}`}
                        onClick={() => setPicked(d === picked ? null : d)}
                      >
                        <span className="day-number">{d}</span>
                        {entries.map((e) => (
                          <span
                            key={e.book.id}
                            className={`day-cover${e.finished ? ' finished' : e.started ? ' started' : ''}`}
                          >
                            <Cover book={e.book} small />
                          </span>
                        ))}
                      </button>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {picked !== null ? (
        <DayDetails
          entries={byDay.get(picked) ?? []}
          label={`${picked} ${name}`}
          onShowBook={onShowBook}
          onClose={() => setPicked(null)}
        />
      ) : (
        <p className="muted hint">
          {byDay.size === 0 ? `Nothing read in ${name} ${year}.` : 'Tap a day to see what you read.'}
        </p>
      )}
      <MonthList
        title={`Started in ${name}`}
        empty={`No books started in ${name} ${year}.`}
        items={started}
        month={month}
        onShowBook={onShowBook}
      />
      <MonthList
        title={`Finished in ${name}`}
        empty={`No books finished in ${name} ${year}.`}
        items={finished}
        month={month}
        onShowBook={onShowBook}
      />
    </section>
  )
}

function MonthList({
  title,
  empty,
  items,
  month,
  onShowBook,
}: {
  title: string
  empty: string
  items: Array<{ book: Book; day: string }>
  month: number
  onShowBook: (id: string) => void
}) {
  return (
    <div className="month-list">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="muted small-text">{empty}</p>
      ) : (
        <ul className="book-list">
          {items.map(({ book, day }) => (
            <BookLine key={`${book.id}-${day}`} book={book} onShowBook={onShowBook}>
              <span className="muted small-text">
                {Number(day.slice(8, 10))} {monthName(month)}
              </span>
            </BookLine>
          ))}
        </ul>
      )}
    </div>
  )
}

/** What happened on one day (#89): how much she read of each book, and what she started or finished. */
function DayDetails({
  entries,
  label,
  onShowBook,
  onClose,
}: {
  entries: DayEntry[]
  label: string
  onShowBook: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="day-log" role="group" aria-labelledby="day-log-title">
      <div className="dash-card-head">
        <h3 id="day-log-title">{label}</h3>
        <button className="btn icon small" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="muted small-text">Nothing read on this day.</p>
      ) : (
        <ul className="book-list">
          {entries.map((e) => (
            <BookLine key={e.book.id} book={e.book} onShowBook={onShowBook}>
              <span className="day-facts small-text">
                {e.started && <span className="day-tag">Started on this day</span>}
                {e.finished && <span className="day-tag">Finished on this day</span>}
                {e.amount !== undefined && (
                  <span>
                    Read {amountText(e.book, e.amount)}
                    {amountUnit(e.book) !== 'percent' && (
                      <span className="muted"> · {percentText(e.amount)}% of the book</span>
                    )}
                  </span>
                )}
              </span>
            </BookLine>
          ))}
        </ul>
      )}
    </div>
  )
}
