import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { formatDuration } from '#/lib/listening'
import { amountText } from '#/lib/readingLog'
import { cleanSpice, ratingText } from '#/lib/ratings'
import { readingYears } from '#/lib/stats'
import { medalLine, yearMedals } from '#/lib/medals'
import {
  favouriteAuthors,
  finishEstimates,
  heatmap,
  reviewYear,
  spiceStats,
  yearReview,
} from '#/lib/insightsMore'
import type { HeatDay } from '#/lib/insightsMore'
import { bingoLines, bingoYear, rememberCard } from '#/lib/bingo'
import { StarRating } from './StarRating'
import { BookLine } from './DashboardExtras'
import { Cover, PeriodSelect, PeriodTabs, monthName, periodLabel, toPeriod } from './Dashboard'
import type { PeriodPick, Props } from './Dashboard'

/** More for the dashboard: pace, heatmap, authors, spice, year in review and bingo. */

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`

/** "12 Nov", or with the weekday: "Thu 12 Nov". */
const dayText = (day: string, weekday = false) =>
  new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(weekday && { weekday: 'short' }),
  })

const hours = (minutes: number) => {
  const h = minutes / 60
  return h >= 10 ? `${Math.round(h)} h` : `${h.toFixed(1).replace(/\.0$/, '')} h`
}

/** A year to look at: the years with something finished, and this one. */
function YearSelect({ books, year, onYear }: { books: Book[]; year: number; onYear: (y: number) => void }) {
  const years = useMemo(() => readingYears(books), [books])
  return (
    <select className="input year-select" value={year} onChange={(e) => onYear(Number(e.target.value))} aria-label="Year">
      {(years.includes(year) ? years : [...years, year].sort((a, b) => b - a)).map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  )
}

// ---- finish-by estimate ------------------------------------------------------------

export function PaceCard({ books, onShowBook }: Props) {
  const estimates = useMemo(() => finishEstimates(books), [books])
  return (
    <section className="dash-card" aria-labelledby="pace-title">
      <h2 id="pace-title">Finish by</h2>
      {estimates.length === 0 ? (
        <p className="muted">Nothing on the go right now.</p>
      ) : (
        <ul className="book-list">
          {estimates.map((e) => (
            <BookLine key={e.book.id} book={e.book} onShowBook={onShowBook}>
              {e.known ? (
                <>
                  <span className="pace-when">
                    {e.daysAway === 0 ? 'Today' : e.daysAway === 1 ? 'Tomorrow' : `Around ${dayText(e.day, e.daysAway < 7)}`}
                  </span>
                  {e.perReadingDay > 0 && (
                    <span className="muted small-text">
                      at about {amountText(e.book, e.perReadingDay)} a day, reading {e.readingDays} of the last{' '}
                      {plural(e.days, 'day')}
                    </span>
                  )}
                </>
              ) : (
                <span className="muted small-text">
                  Read a little more over the next few days and this guesses when you'll finish.
                </span>
              )}
            </BookLine>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---- heatmap ------------------------------------------------------------------------

const CELL = 11
const GAP = 2
const STEP = CELL + GAP
const LEFT = 26
const TOP = 14

function heatTitle(d: HeatDay) {
  if (d.books === 0) return `${dayText(d.day, true)}: nothing read`
  const parts = [d.pages > 0 && plural(d.pages, 'page'), d.minutes > 0 && formatDuration(d.minutes)].filter(Boolean)
  const what = parts.length ? parts.join(' and ') : `${Math.round(d.share * 100)}% of a book`
  return `${dayText(d.day, true)}: ${what}${d.books > 1 ? ` in ${d.books} books` : ''}`
}

export function HeatmapCard({ books }: { books: Book[] }) {
  const h = useMemo(() => heatmap(books), [books])
  const scroller = useRef<HTMLDivElement>(null)
  // the newest weeks are on the right: start there
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [h.weeks.length])
  const W = LEFT + h.weeks.length * STEP
  const H = TOP + 7 * STEP
  const summary = [
    h.pages > 0 && `${h.pages.toLocaleString('en-GB')} pages`,
    h.minutes > 0 && `${formatDuration(h.minutes)} listened`,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <section className="dash-card" aria-labelledby="heatmap-title">
      <div className="dash-card-head">
        <h2 id="heatmap-title">A year of reading</h2>
        <span className="muted small-text">{plural(h.readingDays, 'reading day')}</span>
      </div>
      <div className="heatmap-scroll" ref={scroller}>
        <svg
          className="heatmap"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Reading days over the last twelve months: ${plural(h.readingDays, 'day')} with reading${summary ? `, ${summary}` : ''}.`}
        >
          {h.months.map((m) => (
            <text key={`${m.column}-${m.month}`} className="axis" x={LEFT + m.column * STEP} y={9}>
              {monthName(m.month, 'short')}
            </text>
          ))}
          {['Mon', 'Wed', 'Fri'].map((d, i) => (
            <text key={d} className="axis" x={0} y={TOP + (i * 2) * STEP + CELL - 2}>
              {d}
            </text>
          ))}
          {h.weeks.map((week, c) =>
            week.map(
              (d, r) =>
                d && (
                  <rect
                    key={d.day}
                    className={`heat l${d.level}`}
                    x={LEFT + c * STEP}
                    y={TOP + r * STEP}
                    width={CELL}
                    height={CELL}
                    rx={2}
                  >
                    <title>{heatTitle(d)}</title>
                  </rect>
                ),
            ),
          )}
        </svg>
      </div>
      <div className="heat-legend muted small-text" aria-hidden>
        <span>{summary || 'Move a book on to fill this in.'}</span>
        <span className="heat-scale">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <svg key={l} width={CELL} height={CELL}>
              <rect className={`heat l${l}`} width={CELL} height={CELL} rx={2} />
            </svg>
          ))}
          More
        </span>
      </div>
    </section>
  )
}

// ---- favourite authors -----------------------------------------------------------

export function AuthorsCard({ books }: { books: Book[] }) {
  const authors = useMemo(() => favouriteAuthors(books), [books])
  return (
    <section className="dash-card" aria-labelledby="authors-title">
      <h2 id="authors-title">Favourite authors</h2>
      {authors.length === 0 ? (
        <p className="muted">Finish a book and its author shows up here.</p>
      ) : (
        <ol className="top-list">
          {authors.map((a, i) => (
            <li key={a.name}>
              <span className="top-place">{i + 1}</span>
              <span className="top-info">
                <span>{a.name}</span>
                <span className="top-ratings muted small-text">
                  {plural(a.books, 'book')}
                  {a.rating !== undefined && (
                    <span title={`On average ${ratingText(Math.round(a.rating * 2) / 2)}`}>
                      <StarRating value={Math.round(a.rating * 2) / 2} size="small" />
                    </span>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// ---- spice meter -----------------------------------------------------------------

export function SpiceCard({ books, onShowBook }: Props) {
  const now = new Date()
  const [pick, setPick] = useState<PeriodPick>({ kind: 'year', year: now.getFullYear(), month: now.getMonth() + 1 })
  const s = useMemo(() => spiceStats(books, toPeriod(pick)), [books, pick])
  const label = periodLabel(pick)
  return (
    <section className="dash-card" aria-labelledby="spice-title">
      <div className="dash-card-head">
        <h2 id="spice-title">Spice meter</h2>
        <PeriodTabs pick={pick} onPick={setPick} />
      </div>
      <PeriodSelect books={books} pick={pick} onPick={setPick} />
      {s.average === undefined ? (
        <p className="muted small-text">
          {s.read === 0
            ? `Nothing read ${label} yet.`
            : 'Give finished books a spice level (🌶️ or No spice in the book panel) to see how hot your reading runs.'}
        </p>
      ) : (
        <>
          <div className="spice-meter">
            <span className="big-number">
              <strong>{s.average.toFixed(1)}</strong> <span className="muted">of 5</span>
            </span>
            <span
              className="spice-track"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={Math.round(s.average * 10) / 10}
              aria-label={`Average spice ${label}`}
            >
              <span className="spice-fill" style={{ width: `${(s.average / 5) * 100}%` }} />
            </span>
          </div>
          <p className="muted small-text">
            Average of {plural(s.rated, 'book')} with spice scored, read {label}
          </p>
          <ul className="book-list">
            {s.spiciest.map((b) => (
              <BookLine key={b.id} book={b} onShowBook={onShowBook}>
                <StarRating kind="spice" value={cleanSpice(b.spice)} size="small" />
              </BookLine>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

// ---- year in review ----------------------------------------------------------------

export function WrappedCard({ books, onShowBook }: Props) {
  const [year, setYear] = useState(() => reviewYear())
  const r = useMemo(() => yearReview(books, year), [books, year])
  // medals won this year: a book's for each finish, a series' when its last book needed is finished
  const medals = useMemo(() => {
    const m = yearMedals(books, year)
    return [
      ['Medals', medalLine(m.books)],
      ['Series medals', medalLine(m.series)],
    ].filter(([, line]) => line)
  }, [books, year])
  const bookBtn = (b: Book) => (
    <button className="link-btn" onClick={() => onShowBook(b.id)}>
      {b.title}
    </button>
  )
  const facts: Array<[string, React.ReactNode]> = []
  if (r.topRated) facts.push(['Top-rated', bookBtn(r.topRated)])
  if (r.spiciest) facts.push(['Spiciest', bookBtn(r.spiciest)])
  if (r.genre) facts.push(['Favourite genre', r.genre])
  if (r.busiest)
    facts.push(['Busiest month', `${monthName(r.busiest.month)} (${plural(r.busiest.books, 'book')})`])
  if (r.streak > 1) facts.push(['Longest streak', plural(r.streak, 'day')])
  if (r.bingoCards > 0) facts.push(['Bingo cards', `${r.bingoCards} full 🎉`])
  return (
    <section className="dash-card wrapped-card" aria-labelledby="wrapped-title">
      <div className="dash-card-head">
        <h2 id="wrapped-title">
          <span aria-hidden>✨ </span>
          {year} in books
        </h2>
        <YearSelect books={books} year={year} onYear={setYear} />
      </div>
      {r.books === 0 ? (
        <p className="muted">No books finished in {year} yet. The year's story starts with the first one.</p>
      ) : (
        <>
          <div className="wrapped-numbers">
            <p>
              <strong>{r.books}</strong>
              <span>{r.books === 1 ? 'book' : 'books'}</span>
            </p>
            {r.pages > 0 && (
              <p>
                <strong>{r.pages.toLocaleString('en-GB')}</strong>
                <span>pages</span>
              </p>
            )}
            {r.minutes > 0 && (
              <p>
                <strong>{hours(r.minutes).replace(' h', '')}</strong>
                <span>hours listened</span>
              </p>
            )}
          </div>
          {r.topRated && (
            <div className="wrapped-top">
              <button className="cover-btn" aria-label={r.topRated.title} onClick={() => onShowBook(r.topRated!.id)}>
                <Cover book={r.topRated} />
              </button>
              <div>
                <p className="muted small-text">Book of the year</p>
                <p className="next-title">{r.topRated.title}</p>
                <StarRating value={r.topRated.rating} size="small" />
              </div>
            </div>
          )}
          {facts.length > 0 && (
            <dl className="records">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {medals.length > 0 && (
            <dl className="records">
              {medals.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </section>
  )
}

// ---- book bingo ----------------------------------------------------------------------

export function BingoCard({
  books,
  onUpdate,
}: {
  books: Book[]
  onUpdate: (id: string, patch: (book: Book) => Partial<Book>) => void
}) {
  const year = new Date().getFullYear()
  const b = useMemo(() => bingoYear(books, year), [books, year])
  // a card just found full is remembered on the book that filled it, so it stays full (#119)
  useEffect(() => {
    for (const { bookId, card } of b.toRemember) onUpdate(bookId, (book) => rememberCard(book, card))
  }, [b.toRemember, onUpdate])
  const ticked = b.squares.map((s) => s.ticked)
  const done = ticked.filter(Boolean).length
  const lines = bingoLines(ticked)
  const full = b.finished.length
  return (
    <section className="dash-card" aria-labelledby="bingo-title">
      <div className="dash-card-head">
        <h2 id="bingo-title">
          Book bingo {year}
          {b.card > 1 && <span className="muted"> · card {b.card}</span>}
        </h2>
        <span className="muted small-text">
          {done} of {b.squares.length}
          {lines > 0 && ` · ${lines === 1 ? 'Bingo!' : `${lines} bingos!`} 🎉`}
        </span>
      </div>
      {full > 0 && (
        <p className="small-text bingo-full">
          {full === 1 ? '1 full card' : `${full} full cards`} this year 🎉
        </p>
      )}
      <div className="bingo" role="group" aria-label={`Book bingo ${year}, card ${b.card}`}>
        {b.squares.map((s) => {
          const how = s.ticked ? (s.book ? `Done: ${s.book.title}` : 'Done') : 'Ticks itself when a finished book fits'
          return (
            <div
              key={s.id}
              className={`bingo-square${s.ticked ? ' on auto' : ''}`}
              role="img"
              title={how}
              aria-label={`${s.label}. ${how}`}
            >
              {s.book ? (
                <span className="bingo-cover" aria-hidden>
                  <Cover book={s.book} small />
                </span>
              ) : (
                s.ticked && (
                  <span className="bingo-tick" aria-hidden>
                    ✓
                  </span>
                )
              )}
              <span className="bingo-label">{s.label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
