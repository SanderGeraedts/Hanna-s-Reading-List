import { useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { localDay } from '#/lib/library'
import {
  canChange,
  challengeFor,
  challengeNow,
  monthKey,
  pickFor,
  pickable,
  thisMonth,
} from '#/lib/monthChallenge'
import { Cover, monthName } from './Dashboard'

interface Props {
  books: Book[]
  onShowBook: (id: string) => void
  onUpdate: (id: string, patch: Partial<Book>) => void
  /** the editor is open: the dashboard keeps the block in view meanwhile */
  editing: boolean
  onEditing: (open: boolean) => void
}

/**
 * The monthly challenge (#144): this month's book (and any carried over)
 * until it's finished, a reminder in December, and an editor to pick a
 * book for each month that hasn't started yet. See monthChallenge.ts.
 */
export function ChallengeCard({ books, onShowBook, onUpdate, editing, onEditing }: Props) {
  const today = localDay()
  const year = Number(today.slice(0, 4))
  const now = thisMonth(today)
  const c = useMemo(() => challengeNow(books, today), [books, today])
  // the year to edit: this one while a month is left to change, else next year
  const [editYear, setEditYear] = useState(() => (today.slice(5, 7) === '12' || c.remindNextYear ? year + 1 : year))

  if (editing) {
    const picks = challengeFor(books, editYear)
    return (
      <section className="dash-card challenge-card" aria-labelledby="challenge-title">
        <div className="dash-card-head">
          <h2 id="challenge-title">Monthly challenge</h2>
          <div className="segmented" role="group" aria-label="Year">
            {[year, year + 1].map((y) => (
              <button key={y} type="button" aria-pressed={editYear === y} onClick={() => setEditYear(y)}>
                {y}
              </button>
            ))}
          </div>
        </div>
        <ul className="challenge-months">
          {Array.from({ length: 12 }, (_, i) => {
            const key = monthKey(editYear, i + 1)
            const picked = picks.get(key)
            const label = monthName(i + 1)
            if (!canChange(key, today)) {
              return (
                <li key={key}>
                  <span className="challenge-month">{label}</span>
                  <span className="muted small-text">{picked ? picked.title : '—'}</span>
                </li>
              )
            }
            const options = pickable(books, key)
            if (picked && !options.some((b) => b.id === picked.id)) options.unshift(picked)
            return (
              <li key={key}>
                <label className="challenge-month" htmlFor={`challenge-${key}`}>
                  {label}
                </label>
                <select
                  id={`challenge-${key}`}
                  className="input"
                  value={picked?.id ?? ''}
                  onChange={(e) => {
                    for (const [id, patch] of pickFor(books, key, e.target.value || null)) onUpdate(id, patch)
                  }}
                >
                  <option value="">No book</option>
                  {options.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </li>
            )
          })}
        </ul>
        <p className="muted small-text">Months that have started can’t be changed. Sleep reads don’t count.</p>
        <button type="button" className="btn small" onClick={() => onEditing(false)}>
          Done
        </button>
      </section>
    )
  }

  return (
    <section className="dash-card challenge-card" aria-labelledby="challenge-title">
      <h2 id="challenge-title">Monthly challenge</h2>
      {c.notStarted && (
        <p className="small-text">
          Pick a book for each month, and read along through the year. You can start with{' '}
          {today.slice(5, 7) === '12' ? 'next year' : 'next month'}.
        </p>
      )}
      {c.open.length > 0 && (
        <ul className="waiting-list">
          {c.open.map((item) => (
            <li key={item.month}>
              <button className="cover-btn" aria-label={`Open ${item.book.title}`} onClick={() => onShowBook(item.book.id)}>
                <Cover book={item.book} small />
              </button>
              <div className="waiting-info">
                <p className="waiting-title">
                  <strong>{item.book.title}</strong>
                </p>
                <p className="muted small-text">
                  {monthName(Number(item.month.slice(5, 7)))}
                  {item.month.slice(0, 4) !== String(year) && ` ${item.month.slice(0, 4)}`}
                  {item.month < now ? ' · carried over' : ' · this month'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {c.remindNextYear && <p className="small-text challenge-reminder">Set up your challenge for {year + 1}.</p>}
      <button type="button" className="btn small" onClick={() => onEditing(true)}>
        {c.notStarted || c.remindNextYear ? 'Set up' : 'Edit challenge'}
      </button>
    </section>
  )
}
