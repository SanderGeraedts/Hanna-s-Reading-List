import { useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { localDay } from '#/lib/library'
import {
  canChange,
  challengeCalendar,
  challengeFor,
  challengeNow,
  monthKey,
  pickFor,
  pickable,
  thisMonth,
} from '#/lib/monthChallenge'
import type { ShareSpec } from '#/lib/shareImage'
import { Cover, monthName } from './common'
import { ShareButton } from './ShareButton'
import { OpenLink } from './OpenLink'

interface Props {
  books: Book[]
  onShowBook: (id: string) => void
  onUpdate: (id: string, patch: Partial<Book>) => void
  /** the editor is open: the dashboard keeps the block in view meanwhile */
  editing: boolean
  onEditing: (open: boolean) => void
  /** a fixed year, on the Challenges page; earlier years are only shown */
  year?: number
  /** on the dashboard: no share */
  compact?: boolean
  onOpen?: () => void
  /** the today dashboard (T-0124): this month's book only; the year is on the Challenges page */
  thisMonthOnly?: boolean
}

/**
 * The monthly challenge (#144): a calendar of the year with each month's
 * book, done months marked (#154), books carried over from earlier months,
 * a reminder in December, and an editor to pick a book for each month that
 * hasn't started yet. See monthChallenge.ts.
 */
export function ChallengeCard({ books, onShowBook, onUpdate, editing, onEditing, year: forYear, compact = false, onOpen, thisMonthOnly = false }: Props) {
  const today = localDay()
  const year = Number(today.slice(0, 4))
  const now = thisMonth(today)
  const c = useMemo(() => challengeNow(books, today), [books, today])
  // the year to edit: this one while a month is left to change, else next year
  const [editYear, setEditYear] = useState(() => (today.slice(5, 7) === '12' || c.remindNextYear ? year + 1 : year))
  // the year the calendar shows: this one, or next year once it has books
  const [chosenYear, setShowYear] = useState(year)
  const showYear = forYear ?? chosenYear
  const pastYear = showYear < year
  const nextHasBooks = useMemo(() => challengeFor(books, year + 1).size > 0, [books, year])
  const calendar = useMemo(() => challengeCalendar(books, showYear, today), [books, showYear, today])
  const doneCount = calendar.filter((m) => m.item?.doneOn).length
  const pickedCount = calendar.filter((m) => m.item).length

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

  if (thisMonthOnly) {
    const cur = c.current
    const monthName_ = monthName(Number(now.slice(5, 7)))
    const lastDay = new Date(Number(now.slice(0, 4)), Number(now.slice(5, 7)), 0).getDate()
    const left = lastDay - Number(today.slice(8, 10))
    const pct = cur ? Math.round((cur.book.progress ?? 0) * 100) : 0
    return (
      <section className="dash-card challenge-card challenge-today" aria-labelledby="challenge-title">
        <div className="dash-card-head">
          <h2 id="challenge-title">This month’s challenge</h2>
          <OpenLink onOpen={onOpen} label="Monthly challenge" />
        </div>
        {cur ? (
          <div className="challenge-now">
            <button className="cover-btn" aria-label={`Open ${cur.book.title}`} onClick={() => onShowBook(cur.book.id)}>
              <Cover book={cur.book} small />
            </button>
            <div>
              <strong>{cur.book.title}</strong>
              <p className="muted small-text">
                {cur.doneOn ? `✓ Done for ${monthName_}` : `${pct}% · ${left === 0 ? 'last day of' : `${left} ${left === 1 ? 'day' : 'days'} left in`} ${monthName_}`}
              </p>
            </div>
          </div>
        ) : (
          <div className="challenge-actions">
            <p className="small-text">No book picked for {monthName_}.</p>
            <button type="button" className="btn small" onClick={() => onEditing(true)}>
              Set up
            </button>
          </div>
        )}
      </section>
    )
  }

  const carried = c.open.filter((i) => i.month < now)
  const title = `Monthly challenge ${showYear}`
  const share = (): ShareSpec => ({
    title,
    subtitle: `${doneCount} of ${pickedCount || 12} months done`,
    columns: 4,
    aspect: 1.5,
    tiles: calendar.map((m) => ({
      label: monthName(Number(m.month.slice(5, 7)), 'short'),
      caption: m.item?.book.title,
      cover: m.item?.book.coverUrl,
      color: m.item?.book.color,
      on: !!m.item?.doneOn,
    })),
  })

  return (
    <section className="dash-card challenge-card" aria-labelledby="challenge-title">
      <div className="dash-card-head">
        <h2 id="challenge-title">Monthly challenge</h2>
        <OpenLink onOpen={onOpen} label="Monthly challenge" />
        {nextHasBooks && forYear === undefined ? (
          <div className="segmented" role="group" aria-label="Year">
            {[year, year + 1].map((y) => (
              <button key={y} type="button" aria-pressed={showYear === y} onClick={() => setShowYear(y)}>
                {y}
              </button>
            ))}
          </div>
        ) : (
          pickedCount > 0 && (
            <span className="muted small-text">
              {doneCount} of {pickedCount} done
            </span>
          )
        )}
      </div>
      {c.notStarted && !pastYear && (
        <p className="small-text">
          Pick a book for each month, starting {today.slice(5, 7) === '12' ? 'next year' : 'next month'}.
        </p>
      )}
      {/* nothing picked yet: a single line of months instead of twelve empty boxes, a whole
          screen of nothing on a phone (T-0120) */}
      {pickedCount === 0 && !pastYear ? (
        <p className="challenge-months-row" aria-hidden="true">
          {calendar.map((m) => (
            <span key={m.month} className={m.current ? 'current' : undefined}>
              {monthName(Number(m.month.slice(5, 7)), 'short').slice(0, 1)}
            </span>
          ))}
        </p>
      ) : (
      <ol className="challenge-calendar" aria-label={title}>
        {calendar.map((m) => {
          const name = monthName(Number(m.month.slice(5, 7)))
          const state = m.item?.doneOn
            ? `done${m.item.late ? ' (late)' : ''}`
            : m.item
              ? m.current
                ? 'this month'
                : m.past
                  ? 'not finished yet'
                  : 'coming up'
              : 'no book'
          const cls = [
            'challenge-month-tile',
            m.item?.doneOn && 'done',
            m.current && 'current',
            m.past && !m.item?.doneOn && 'past',
          ]
            .filter(Boolean)
            .join(' ')
          const label = `${name}: ${m.item ? `${m.item.book.title}, ` : ''}${state}`
          return (
            <li key={m.month} className={cls}>
              {m.item ? (
                <button className="cover-btn" aria-label={label} title={label} onClick={() => onShowBook(m.item!.book.id)}>
                  <Cover book={m.item.book} small />
                  {m.item.doneOn && (
                    <span className="challenge-tick" aria-hidden>
                      ✓
                    </span>
                  )}
                </button>
              ) : (
                <span className="challenge-empty" role="img" aria-label={label} title={label} />
              )}
              <span className="challenge-month-name" aria-hidden>
                {monthName(Number(m.month.slice(5, 7)), 'short')}
              </span>
            </li>
          )
        })}
      </ol>
      )}
      {!pastYear && carried.length > 0 && (
        <ul className="waiting-list">
          {carried.map((item) => (
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
                  {item.month.slice(0, 4) !== String(year) && ` ${item.month.slice(0, 4)}`} · carried over
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {c.remindNextYear && !pastYear && <p className="small-text challenge-reminder">Set up your challenge for {year + 1}.</p>}
      <div className="challenge-actions">
        {!pastYear && (
          <button type="button" className="btn small" onClick={() => onEditing(true)}>
            {c.notStarted || c.remindNextYear ? 'Set up' : 'Edit challenge'}
          </button>
        )}
        {!compact && pickedCount > 0 && <ShareButton spec={share} label={title} />}
      </div>
    </section>
  )
}
