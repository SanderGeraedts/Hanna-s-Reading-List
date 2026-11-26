import { useMemo } from 'react'
import type React from 'react'
import type { Book } from '#/lib/library'
import { formatDuration } from '#/lib/listening'
import { periodStats } from '#/lib/stats'
import { monthlyCounts } from '#/lib/insights'
import { goalPace, goalPaceText } from '#/lib/insightsMore'
import { useYearGoal } from './useYearGoal'
import { OpenLink } from './OpenLink'
import { Cover, monthName } from './common'

/**
 * "My year" (T-0080, D-0060): the one block about her reading that stays on
 * the dashboard. Books, pages, hours and the goal ring for this year, and
 * "Open ›" to the Stats page, where the charts now live. "Books read" and
 * "Reading goal" became part of it; the goal is still set on the Challenges
 * page, so this only shows the ring.
 */
export function MyYearCard({
  books,
  accountId,
  onOpen,
  onShowBook,
  year: forYear,
}: {
  books: Book[]
  accountId: string | null
  /** "Open ›": the Stats page */
  onOpen?: () => void
  /** another year than this one (tests and screenshots) */
  year?: number
  /** open a book from the row of covers */
  onShowBook?: (id: string) => void
}) {
  const year = forYear ?? new Date().getFullYear()
  const stats = useMemo(() => periodStats(books, { kind: 'year', year }), [books, year])
  const goal = useYearGoal(accountId, year)
  const share = goal ? Math.min(1, stats.books / goal) : 0
  const r = 42
  const c = 2 * Math.PI * r
  /** how she is doing against the goal: the line the Reading goal used to keep to itself */
  const pace = goal ? goalPaceText(goalPace(stats.books, goal, year)) : ''
  /** books finished per month, as twelve little bars */
  const months = useMemo(() => monthlyCounts(books, year), [books, year])
  const busiest = Math.max(1, ...months)
  /** the books she finished this year, newest first; the block shows a handful */
  const covers = stats.list.slice(0, 12)
  const numbers = [
    `${stats.books.toLocaleString('en-GB')} ${stats.books === 1 ? 'book' : 'books'}`,
    stats.pages > 0 && `${stats.pages.toLocaleString('en-GB')} pages`,
    stats.minutes > 0 && `${formatDuration(stats.minutes)} listened`,
  ].filter(Boolean) as string[]

  return (
    <section className="dash-card myyear-card" aria-labelledby="myyear-title">
      <div className="dash-card-head">
        <h2 id="myyear-title">My year</h2>
        <OpenLink onOpen={onOpen} label="My year" />
      </div>
      <div className="myyear-body">
        {goal !== null && (
          <svg className="goal-ring" viewBox="0 0 100 100" role="img" aria-label={`${stats.books} of ${goal} books read`}>
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
              {stats.books}
            </text>
            <text x="50" y="64" textAnchor="middle" className="goal-of">
              of {goal}
            </text>
          </svg>
        )}
        <div className="myyear-said">
          <p className="myyear-numbers">
            {stats.books === 0 ? `Nothing finished in ${year} yet.` : numbers.join(' · ')}
          </p>
          {/* the goal line, which only the Reading goal used to show (T-0080) */}
          {pace && <p className="muted small-text myyear-pace">{pace}</p>}
        </div>
      </div>

      {/* a bar per month, so the quiet and busy stretches show without opening Stats */}
      {stats.books > 0 && (
        <ol className="myyear-months" aria-label={`Books finished each month of ${year}`}>
          {months.map((n, i) => (
            <li key={i} title={`${monthName(i + 1)}: ${n === 1 ? '1 book' : `${n} books`}`}>
              <span
                className={n > 0 ? 'myyear-bar' : 'myyear-bar none'}
                // a share of the tallest month, 0 to 1; the height itself is in the stylesheet
                style={{ '--share': n / busiest } as React.CSSProperties}
                aria-label={`${monthName(i + 1)}: ${n === 1 ? '1 book' : `${n} books`}`}
              />
              <span aria-hidden className="myyear-month">
                {monthName(i + 1, 'short').slice(0, 1)}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* what the year was actually made of */}
      {covers.length > 0 && (
        <ul className="myyear-covers" aria-label={`What you finished in ${year}`}>
          {covers.map((b) => (
            <li key={b.id}>
              {onShowBook ? (
                <button className="cover-btn" aria-label={`Open ${b.title}`} onClick={() => onShowBook(b.id)}>
                  <Cover book={b} small />
                </button>
              ) : (
                <Cover book={b} small />
              )}
            </li>
          ))}
          {stats.books > covers.length && <li className="myyear-more">+{stats.books - covers.length}</li>}
        </ul>
      )}
    </section>
  )
}
