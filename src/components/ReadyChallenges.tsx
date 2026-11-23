import { useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { localDay } from '#/lib/library'
import { worldChallenge } from '#/lib/worldChallenge'
import { seasonChallenge, seasonsDone } from '#/lib/seasonChallenge'
import { MINUTES_GOAL, minutesMonth, minutesYear } from '#/lib/minutesChallenge'
import { newSeriesPick, pickableSeries, seriesDone, seriesRows } from '#/lib/seriesChallenge'
import type { OwnChallenge } from '#/lib/ownChallenges'
import { monthName } from './Dashboard'

/**
 * The four ready-made challenges added in T-0091 (D-0061). Each is an ordinary
 * `.dash-card` in the Challenges page's grid, so it arranges, hides and anchors
 * like every other challenge. Nothing here opens a dialog or looks anything up.
 */

function Bar({ done, goal, label }: { done: number; goal: number; label: string }) {
  const share = goal > 0 ? Math.min(1, done / goal) : 0
  return (
    <div className="progress-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(done, goal)}>
      <span style={{ width: `${share * 100}%` }} />
    </div>
  )
}

// ---- around the world ---------------------------------------------------------------

export function WorldChallengeCard({ books, year }: { books: Book[]; year: number }) {
  const w = useMemo(() => worldChallenge(books, year), [books, year])
  return (
    <section className="dash-card world-challenge" aria-labelledby="challenge-world-title">
      <div className="dash-card-head">
        <h2 id="challenge-world-title">Around the world</h2>
        <span className="muted small-text">{`${w.done} of ${w.goal}${w.complete ? ' · Done! 🎉' : ''}`}</span>
      </div>
      <Bar done={w.done} goal={w.goal} label={`Around the world: ${w.done} of ${w.goal} countries`} />
      {w.countries.length === 0 ? (
        <p className="muted small-text">No countries yet this year.</p>
      ) : (
        <ul className="world-countries" aria-label={`Countries in ${year}`}>
          {w.countries.map((c) => (
            <li key={c.country} className="chip">
              {c.country}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---- seasonal -----------------------------------------------------------------------

export function SeasonChallengeCard({ books, year, today = localDay() }: { books: Book[]; year: number; today?: string }) {
  const seasons = useMemo(() => seasonChallenge(books, year, today), [books, year, today])
  const done = seasonsDone(seasons)
  return (
    <section className="dash-card season-challenge" aria-labelledby="challenge-season-title">
      <div className="dash-card-head">
        <h2 id="challenge-season-title">Seasonal</h2>
        <span className="muted small-text">{`${done} of 4`}</span>
      </div>
      <ul className="season-rows" aria-label={`Seasonal ${year}`}>
        {seasons.map((s) => {
          const label = `${s.label}: ${s.done} of ${s.target} ${s.what}${s.complete ? ', done' : ''}${s.current ? ', now' : ''}`
          return (
            <li key={s.season} className={`season-row${s.current ? ' current' : ''}${s.complete ? ' done' : ''}`} aria-label={label} title={label}>
              <span className="season-name">
                <span aria-hidden>{s.icon}</span> {s.label}
              </span>
              <Bar done={s.done} goal={s.target} label={label} />
              <span className="muted small-text season-count" aria-hidden>{`${s.done} of ${s.target}${s.complete ? ' ✓' : ''}`}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---- minutes a day --------------------------------------------------------------------

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
/** Monday = 0 … Sunday = 6, for a `yyyy-mm-dd` day, without a time zone. */
const weekdayOf = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7

export function MinutesChallengeCard({ books, year, today = localDay() }: { books: Book[]; year: number; today?: string }) {
  const thisYear = Number(today.slice(0, 4))
  const [month, setMonth] = useState(() => (year === thisYear ? Number(today.slice(5, 7)) : 12))
  const grid = useMemo(() => minutesMonth(books, year, month, today), [books, year, month, today])
  const score = useMemo(() => minutesYear(books, year, today), [books, year, today])
  const name = monthName(month)
  const pad = weekdayOf(grid.days[0].day)
  const nothing = grid.days.every((d) => d.minutes === 0)
  return (
    <section className="dash-card minutes-challenge" aria-labelledby="challenge-minutes-title">
      <div className="dash-card-head">
        <h2 id="challenge-minutes-title">Minutes a day</h2>
        <div className="period-pick" role="group" aria-label="Month">
          <button className="btn icon small" aria-label="Previous month" disabled={month <= 1} onClick={() => setMonth(month - 1)}>
            ‹
          </button>
          <strong className="minutes-month">{name}</strong>
          <button className="btn icon small" aria-label="Next month" disabled={month >= 12} onClick={() => setMonth(month + 1)}>
            ›
          </button>
        </div>
      </div>
      <p className="muted small-text">{`${score.done} of ${score.goal} days · ${MINUTES_GOAL} min a day`}</p>
      <div className="minutes-weekdays" aria-hidden>
        {WEEKDAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="minutes-grid" role="group" aria-label={`${name} ${year}`}>
        {Array.from({ length: pad }, (_, i) => (
          <span key={`pad${i}`} className="minutes-pad" aria-hidden />
        ))}
        {grid.days.map((d) => {
          const minutes = Math.round(d.minutes)
          const label = d.future
            ? `${d.date} ${name}: still to come`
            : `${d.date} ${name}: ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}${d.reached ? ', reached' : ''}`
          const cls = ['minutes-day', d.reached && 'on', d.future && 'future', d.today && 'today'].filter(Boolean).join(' ')
          return <span key={d.day} className={cls} role="img" aria-label={label} title={label} />
        })}
      </div>
      {nothing && <p className="muted small-text">Nothing read yet in {name}.</p>}
    </section>
  )
}

// ---- read the series --------------------------------------------------------------------

export function SeriesChallengeCard({
  books,
  year,
  own,
  editable,
  onAdd,
  onRemove,
}: {
  books: Book[]
  year: number
  own: OwnChallenge[]
  /** this year's: series can be picked and removed */
  editable: boolean
  onAdd: (c: OwnChallenge) => void
  onRemove: (id: string) => void
}) {
  const rows = useMemo(() => seriesRows(own, books, year), [own, books, year])
  const options = useMemo(() => pickableSeries(books, own, year), [books, own, year])
  const [adding, setAdding] = useState(false)
  const [pick, setPick] = useState('')
  const lastRow = useRef<HTMLButtonElement>(null)
  const done = seriesDone(rows)
  return (
    <section className="dash-card series-challenge" aria-labelledby="challenge-series-title">
      <div className="dash-card-head">
        <h2 id="challenge-series-title">Read the series</h2>
        <span className="muted small-text">{`${done} of ${rows.length}`}</span>
      </div>
      {rows.length === 0 ? (
        <p className="muted small-text">Pick a series to finish this year.</p>
      ) : (
        <ul className="series-rows" aria-label={`Series in ${year}`}>
          {rows.map((r) => {
            const label = `${r.name}: ${r.done} of ${r.total}${r.complete ? ', done' : ''}`
            return (
              <li key={r.challenge.id} className={r.complete ? 'series-row done' : 'series-row'}>
                <span className="series-name">{r.name}</span>
                <Bar done={r.done} goal={r.total} label={label} />
                <span className="muted small-text series-count" aria-hidden>{`${r.done} of ${r.total}${r.complete ? ' ✓' : ''}`}</span>
                {editable && (
                  <button
                    ref={lastRow}
                    className="btn icon small"
                    aria-label={`Remove ${r.name} from the challenge`}
                    title="Remove"
                    onClick={() => {
                      if (window.confirm(`Remove "${r.name}" from the challenge?`)) onRemove(r.challenge.id)
                    }}
                  >
                    ×
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {editable && options.length > 0 && !adding && (
        <button className="btn small" onClick={() => setAdding(true)}>
          ＋ Add a series
        </button>
      )}
      {editable && adding && (
        <form
          className="series-add"
          onSubmit={(e) => {
            e.preventDefault()
            const chosen = options.find((o) => o.value === pick)
            if (!chosen) return
            onAdd(newSeriesPick(chosen.value, chosen.label, books, year))
            setPick('')
            setAdding(false)
          }}
        >
          <label>
            <span className="muted small-text">Which series</span>
            <select className="input" value={pick} onChange={(e) => setPick(e.target.value)} autoFocus>
              <option value="">Pick one…</option>
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <div className="dashboard-bar-actions">
            <button type="button" className="btn small" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button className="btn small primary" disabled={!options.some((o) => o.value === pick)}>
              Add
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
