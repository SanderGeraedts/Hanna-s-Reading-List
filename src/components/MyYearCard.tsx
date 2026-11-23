import { useMemo } from 'react'
import type { Book } from '#/lib/library'
import { formatDuration } from '#/lib/listening'
import { periodStats } from '#/lib/stats'
import { useYearGoal } from './useYearGoal'
import { OpenLink } from './OpenLink'

/**
 * "My year" (T-0070, D-0060): the one block about her reading that stays on
 * the dashboard. Books, pages, hours and the goal ring for this year, and
 * "Open ›" to the Stats page, where the charts now live. "Books read" and
 * "Reading goal" became part of it; the goal is still set on the Challenges
 * page, so this only shows the ring.
 */
export function MyYearCard({
  books,
  accountId,
  onOpen,
  year: forYear,
}: {
  books: Book[]
  accountId: string | null
  /** "Open ›": the Stats page */
  onOpen?: () => void
  /** another year than this one (tests and screenshots) */
  year?: number
}) {
  const year = forYear ?? new Date().getFullYear()
  const stats = useMemo(() => periodStats(books, { kind: 'year', year }), [books, year])
  const goal = useYearGoal(accountId, year)
  const share = goal ? Math.min(1, stats.books / goal) : 0
  const r = 42
  const c = 2 * Math.PI * r
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
        <p className="myyear-numbers">
          {stats.books === 0 ? `Nothing finished in ${year} yet.` : numbers.join(' · ')}
        </p>
      </div>
    </section>
  )
}
