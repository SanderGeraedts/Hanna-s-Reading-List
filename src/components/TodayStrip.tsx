import { useMemo } from 'react'
import type { Book } from '#/lib/library'
import { readingStreak } from '#/lib/insights'
import { periodStats } from '#/lib/stats'
import { Cover } from './Dashboard'
import { useYearGoal } from './useYearGoal'

/**
 * The strip at the top of the dashboard: what she's reading now with how far
 * along, her reading streak, and the year's goal as a small ring. It replaces
 * the Reading streak block.
 */
export function TodayStrip({
  books,
  accountId,
  onShowBook,
}: {
  books: Book[]
  accountId: string | null
  onShowBook: (id: string) => void
}) {
  const year = new Date().getFullYear()
  const reading = useMemo(() => books.filter((b) => b.status === 'reading').slice(0, 3), [books])
  const streak = useMemo(() => readingStreak(books), [books])
  const read = useMemo(() => periodStats(books, { kind: 'year', year }).books, [books, year])
  const goal = useYearGoal(accountId, year)
  const share = goal ? Math.min(1, read / goal) : 0
  const r = 15
  const c = 2 * Math.PI * r

  return (
    <div className="today-strip" role="group" aria-label="Today">
      {reading.map((b) => {
        const pct = Math.round((b.progress ?? 0) * 100)
        return (
          <button key={b.id} className="today-item today-book" onClick={() => onShowBook(b.id)} aria-label={`${b.title}, ${pct}%`}>
            <Cover book={b} small />
            <span className="today-text">
              <strong>{b.title}</strong>
              <span className="today-progress" aria-hidden>
                <span style={{ width: `${pct}%` }} />
              </span>
              <span className="muted small-text">{pct}%</span>
            </span>
          </button>
        )
      })}
      <div className="today-item" title={streak.best > streak.current ? `Best so far: ${streak.best} days` : undefined}>
        <span className="today-icon" aria-hidden>
          🔥
        </span>
        <span className="today-text">
          <strong>
            {streak.current} {streak.current === 1 ? 'day' : 'days'}
          </strong>
          <span className="muted small-text">
            {streak.current === 0 ? 'read today to start' : streak.today ? 'in a row' : 'read today to keep it'}
          </span>
        </span>
      </div>
      <div className="today-item">
        {goal ? (
          <svg className="today-ring" viewBox="0 0 36 36" aria-hidden>
            <circle cx="18" cy="18" r={r} className="goal-track" />
            <circle
              cx="18"
              cy="18"
              r={r}
              className="goal-fill"
              strokeDasharray={`${c * share} ${c}`}
              transform="rotate(-90 18 18)"
            />
          </svg>
        ) : (
          <span className="today-icon" aria-hidden>
            📚
          </span>
        )}
        <span className="today-text">
          <strong>{goal ? `${read} of ${goal}` : `${read} read`}</strong>
          <span className="muted small-text">{goal ? `goal ${year}` : `in ${year}`}</span>
        </span>
      </div>
    </div>
  )
}
