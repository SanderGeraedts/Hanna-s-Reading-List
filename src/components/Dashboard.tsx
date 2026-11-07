import { useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { formatDuration } from '#/lib/listening'
import { pickQuote, quoteChoices } from '#/lib/quotes'
import { pickReadNext, readNextChoices } from '#/lib/readNext'
import { finishedByDay, monthWeeks, periodStats, readingYears } from '#/lib/stats'
import type { Period } from '#/lib/stats'

/**
 * The dashboard (#59): how many books Hanna read, what to read next, a quote
 * from a book she has read, and a calendar of the days she finished them.
 */

const LAST_QUOTE_KEY = 'hannas-reading-list:last-quote'
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthName = (month: number, style: 'long' | 'short' = 'long') =>
  new Date(2000, month - 1, 1).toLocaleDateString('en-GB', { month: style })

interface Props {
  books: Book[]
  /** open a book on the shelf */
  onShowBook: (id: string) => void
}

export function Dashboard({ books, onShowBook }: Props) {
  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <ReadCount books={books} onShowBook={onShowBook} />
        <QuoteCard books={books} />
        <ReadNextCard books={books} onShowBook={onShowBook} />
        <Calendar books={books} onShowBook={onShowBook} />
      </div>
    </div>
  )
}

function Cover({ book, small }: { book: Book; small?: boolean }) {
  return book.coverUrl ? (
    <img className={`dash-cover${small ? ' small' : ''}`} src={book.coverUrl} alt="" loading="lazy" />
  ) : (
    <span className={`dash-cover blank${small ? ' small' : ''}`} style={{ background: book.color }} aria-hidden>
      {small ? '' : book.title}
    </span>
  )
}

// ---------------------------------------------------------------------------

function ReadCount({ books, onShowBook }: Props) {
  const now = new Date()
  const [kind, setKind] = useState<Period['kind']>('year')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const years = useMemo(() => readingYears(books), [books])
  const stats = useMemo(() => {
    const period: Period = kind === 'all' ? { kind } : kind === 'year' ? { kind, year } : { kind, year, month }
    return periodStats(books, period)
  }, [books, kind, year, month])

  const label = kind === 'all' ? 'all time' : kind === 'year' ? `in ${year}` : `in ${monthName(month)} ${year}`
  const step = (by: number) => {
    const d = new Date(year, month - 1 + by, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
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
      {kind !== 'all' && (
        <p className="muted hint">
          Only books with a “Finished on” date count here. Older books can get one in their details.
        </p>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

function QuoteCard({ books }: { books: Book[] }) {
  const choices = useMemo(() => quoteChoices(books), [books])
  // a new quote each time the dashboard opens, not the one from last time
  const [quote] = useState(() => {
    let last: string | null = null
    try {
      last = localStorage.getItem(LAST_QUOTE_KEY)
    } catch {
      /* ignore */
    }
    const q = pickQuote(quoteChoices(books), last)
    try {
      if (q) localStorage.setItem(LAST_QUOTE_KEY, q.text)
    } catch {
      /* ignore */
    }
    return q
  })
  const shown = quote && choices.some((c) => c.text === quote.text) ? quote : choices[0]

  return (
    <section className="dash-card quote-card" aria-label="A quote">
      {shown ? (
        <figure>
          <blockquote>{shown.text}</blockquote>
          <figcaption>
            {shown.by && <>{shown.by}, </>}
            <cite>{shown.book.title}</cite>
            {shown.book.authors[0] && <span className="muted"> · {shown.book.authors[0]}</span>}
          </figcaption>
        </figure>
      ) : (
        <p className="muted">
          Quotes from the books you have read show up here. Add your favourites in a book's details.
        </p>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

function ReadNextCard({ books, onShowBook }: Props) {
  const choices = useMemo(() => readNextChoices(books), [books])
  const [pickedId, setPickedId] = useState<string | null>(null)
  const picked = choices.find((b) => b.id === pickedId)
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
            {choices.length} {choices.length === 1 ? 'book is' : 'books are'} waiting: no re-reads, and only the next
            book of a series.
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

function Calendar({ books, onShowBook }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const byDay = useMemo(() => finishedByDay(books, year, month), [books, year, month])
  const weeks = monthWeeks(year, month)
  const isToday = (d: number) => year === now.getFullYear() && month === now.getMonth() + 1 && d === now.getDate()
  const step = (by: number) => {
    const d = new Date(year, month - 1 + by, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
  }

  return (
    <section className="dash-card calendar-card" aria-labelledby="calendar-title">
      <div className="dash-card-head">
        <h2 id="calendar-title">
          {monthName(month)} {year}
        </h2>
        <div className="period-pick">
          <button className="btn icon small" aria-label="Previous month" onClick={() => step(-1)}>
            ‹
          </button>
          <button
            className="btn small"
            onClick={() => {
              setYear(now.getFullYear())
              setMonth(now.getMonth() + 1)
            }}
          >
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
                const finished = d ? (byDay.get(d) ?? []) : []
                return (
                  <td
                    key={j}
                    className={[!d && 'outside', d && isToday(d) && 'today', finished.length && 'has-books']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {d && (
                      <>
                        <span className="day-number">{d}</span>
                        {finished.map((b) => (
                          <button
                            key={b.id}
                            className="cover-btn"
                            title={`Finished ${b.title}`}
                            aria-label={`${d} ${monthName(month)}: finished ${b.title}`}
                            onClick={() => onShowBook(b.id)}
                          >
                            <Cover book={b} small />
                          </button>
                        ))}
                      </>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {byDay.size === 0 && (
        <p className="muted hint">
          No books finished in {monthName(month)} {year}.
        </p>
      )}
    </section>
  )
}
