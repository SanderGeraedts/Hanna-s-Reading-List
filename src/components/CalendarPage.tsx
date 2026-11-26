import { useEffect, useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { localDay } from '#/lib/library'
import { finishedIn, monthEntries } from '#/lib/readingLog'
import type { DayEntry } from '#/lib/readingLog'
import { monthWeeks } from '#/lib/stats'
import { sleepReadIds } from '#/lib/sleepSeries'
import { monthReleases, monthSummary, summaryText, yearLevels } from '#/lib/calendarPage'
import { Cover, WEEKDAYS, dayPile, mark, monthName } from './common'
import { WrapUpCard } from './WrapUpCard'
import { dayStory } from './DashboardExtras'
import { JournalNote } from './JournalNote'
import { hasNote } from '#/lib/journal'
import { factForDay } from '#/lib/facts'
import { AddBookForDay, ChangeButton, DayChangeEditor } from './DayEditor'

interface Props {
  books: Book[]
  onShowBook: (id: string) => void
  /** for the reading journal: a note is kept on the book */
  onUpdate: (id: string, patch: Partial<Book>) => void
  /** the month to open on (yyyy-mm), from "Open ›" on the dashboard */
  startMonth?: string
}

/**
 * The Calendar page: a big month of what Hanna read, started and finished
 * each day and what comes out, with a summary line; or the whole year as
 * reading-day dots with each month's finished covers. Only for looking:
 * dates are changed in the book panel.
 */
export function CalendarPage({ books, onShowBook, onUpdate, startMonth }: Props) {
  const now = new Date()
  const today = localDay(now)
  const [mode, setMode] = useState<'month' | 'year'>('month')
  const [year, setYear] = useState(() => (startMonth ? Number(startMonth.slice(0, 4)) : now.getFullYear()))
  const [month, setMonth] = useState(() => (startMonth ? Number(startMonth.slice(5, 7)) : now.getMonth() + 1))
  const [picked, setPicked] = useState<number | null>(null)
  const [wrapping, setWrapping] = useState(false)
  /** which book is on top of each day's pile; new each time the page opens */
  const [shuffle] = useState(() => Math.floor(Math.random() * 1000))
  const sleep = useMemo(() => sleepReadIds(books), [books])

  const show = (y: number, m: number) => {
    setYear(y)
    setMonth(m)
    setPicked(null)
  }
  const step = (by: number) => {
    if (mode === 'year') return show(year + by, month)
    const d = new Date(year, month - 1 + by, 1)
    show(d.getFullYear(), d.getMonth() + 1)
  }

  return (
    <div className="dashboard">
      <div className="calendar-page">
        <header className="challenges-head">
          <h1>Calendar</h1>
          <div className="segmented" role="group" aria-label="Month or year">
            {(['month', 'year'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={mode === m ? 'active' : undefined}
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                {m === 'month' ? 'Month' : 'Year'}
              </button>
            ))}
          </div>
        </header>
        <div className="calendar-nav">
          <button className="btn icon small" aria-label={mode === 'year' ? 'Previous year' : 'Previous month'} onClick={() => step(-1)}>
            ‹
          </button>
          <h2>{mode === 'year' ? year : `${monthName(month)} ${year}`}</h2>
          <button className="btn icon small" aria-label={mode === 'year' ? 'Next year' : 'Next month'} onClick={() => step(1)}>
            ›
          </button>
          <button className="btn small" onClick={() => show(now.getFullYear(), now.getMonth() + 1)}>
            Today
          </button>
          {/* the month's wrap-up, for this month and the ones before it */}
          {mode === 'month' && (year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth() + 1)) && (
            <button className="btn small" onClick={() => setWrapping(true)}>
              ✨ Wrap-up
            </button>
          )}
        </div>
        {wrapping && <WrapUpCard books={books} year={year} month={month} onShowBook={onShowBook} onClose={() => setWrapping(false)} />}
        {mode === 'month' ? (
          <MonthView
            books={books}
            year={year}
            month={month}
            today={today}
            sleep={sleep}
            shuffle={shuffle}
            picked={picked}
            onPick={setPicked}
            onShowBook={onShowBook}
            onUpdate={onUpdate}
          />
        ) : (
          <YearView
            books={books}
            year={year}
            today={today}
            onOpenMonth={(m) => {
              show(year, m)
              setMode('month')
            }}
          />
        )}
      </div>
    </div>
  )
}

function MonthView({
  books,
  year,
  month,
  today,
  sleep,
  shuffle,
  picked,
  onPick,
  onShowBook,
  onUpdate,
}: {
  books: Book[]
  year: number
  month: number
  today: string
  sleep: Set<string>
  shuffle: number
  picked: number | null
  onPick: (day: number | null) => void
  onShowBook: (id: string) => void
  onUpdate: (id: string, patch: Partial<Book>) => void
}) {
  const byDay = useMemo(() => monthEntries(books, year, month), [books, year, month])
  const releases = useMemo(() => monthReleases(books, year, month, today), [books, year, month, today])
  const summary = useMemo(() => monthSummary(books, year, month), [books, year, month])
  const weeks = monthWeeks(year, month)
  const name = monthName(month)
  const dayKey = (d: number) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const pickedEntries = picked ? (byDay.get(picked) ?? []) : []
  const pickedReleases = picked ? (releases.byDay.get(picked) ?? []) : []

  return (
    <>
      <p className="muted small-text calendar-summary">
        {name}: {summaryText(summary)}
      </p>
      {releases.vague.length > 0 && (
        <ul className="calendar-coming" aria-label="Coming, day not known yet">
          {releases.vague.map(({ book, text }) => (
            <li key={book.id}>
              <button className="cover-btn" title={`${book.title}, ${text}`} aria-label={`${book.title}, ${text}`} onClick={() => onShowBook(book.id)}>
                <Cover book={book} small />
              </button>
              <span className="small-text">
                <strong>{book.title}</strong> <span className="muted">· {text}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="calendar-month">
        <table className="calendar calendar-big">
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
                  if (!d) return <td key={j} className="outside" />
                  const all = byDay.get(d) ?? []
                  // sleep reads only as a moon, so real reads stay in front
                  const entries = all.filter((e) => !sleep.has(e.book.id))
                  const moon = all.length > entries.length
                  const noted = hasNote(all.map((e) => e.book), dayKey(d))
                  const coming = releases.byDay.get(d) ?? []
                  const story = [
                    ...all.map((e) => `${e.book.title}, you ${dayStory(e)}`),
                    ...coming.map((b) => `${b.title} comes out`),
                  ].join('; ')
                  return (
                    <td
                      key={j}
                      className={[
                        dayKey(d) === today && 'today',
                        (all.length > 0 || coming.length > 0) && 'has-books',
                        d === picked && 'picked',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <button
                        className="day-cell"
                        aria-pressed={d === picked}
                        aria-label={`${d} ${name}${story ? `: ${story}` : ''}`}
                        onClick={() => onPick(d === picked ? null : d)}
                      >
                        <span className="day-number">
                          {d}
                          {(moon || noted) && (
                            <span className="day-marks" aria-hidden>
                              {noted && '✎'}
                              {moon && '🌙'}
                            </span>
                          )}
                        </span>
                        <DayCovers entries={entries} day={d} shuffle={shuffle} />
                        {entries.length === 0 && coming.length > 0 && (
                          <span className="day-cover release">
                            <Cover book={coming[0]} small />
                          </span>
                        )}
                        {coming.length > 0 && (
                          <span className="day-out" aria-hidden>
                            out
                          </span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <CalendarDayAside
          books={books}
          picked={picked}
          name={name}
          dayKey={dayKey}
          pickedEntries={pickedEntries}
          pickedReleases={pickedReleases}
          sleep={sleep}
          onShowBook={onShowBook}
          onUpdate={onUpdate}
          isFuture={(d) => new Date(year, month - 1, d) > new Date()}
        />
      </div>
    </>
  )
}

function CalendarDayAside({
  books,
  picked,
  name,
  dayKey,
  pickedEntries,
  pickedReleases,
  sleep,
  onShowBook,
  onUpdate,
  isFuture,
}: {
  books: Book[]
  picked: number | null
  name: string
  dayKey: (d: number) => string
  pickedEntries: DayEntry[]
  pickedReleases: Book[]
  sleep: Set<string>
  onShowBook: (id: string) => void
  onUpdate: (id: string, patch: Partial<Book>) => void
  isFuture: (d: number) => boolean
}) {
  const [editing, setEditing] = useState<string | null>(null)
  // close any open editor when the day changes
  useEffect(() => {
    setEditing(null)
  }, [picked])
  const future = picked !== null && isFuture(picked)
  if (picked === null) {
    return (
      <aside className="calendar-day" aria-live="polite">
        <p className="muted small-text">Tap a day to see what happened.</p>
      </aside>
    )
  }
  const day = dayKey(picked)
  const dayFact = factForDay(books, day)
  return (
    <aside className="calendar-day" aria-live="polite">
      <h3 className="waiting-subtitle">
        {picked} {name}
      </h3>
      {pickedEntries.length === 0 && pickedReleases.length === 0 && !future && (
        <p className="muted small-text">Nothing on {picked} {name} yet.</p>
      )}
      {pickedEntries.length > 0 && (
        <ul className="waiting-list">
          {pickedEntries.map((e) => (
            <li key={e.book.id}>
              <button className="cover-btn" aria-label={`Open ${e.book.title}`} onClick={() => onShowBook(e.book.id)}>
                <Cover book={e.book} small />
              </button>
              <div className="waiting-info">
                <p className="waiting-title">
                  <strong>{e.book.title}</strong>
                  {sleep.has(e.book.id) && <span aria-label="sleep read"> 🌙</span>}
                </p>
                {editing === e.book.id ? (
                  <DayChangeEditor
                    book={e.book}
                    day={day}
                    entry={e}
                    onUpdate={onUpdate}
                    onClose={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <p className="muted small-text">You {dayStory(e)}</p>
                    {!future && <ChangeButton book={e.book} open={false} onOpen={() => setEditing(e.book.id)} />}
                  </>
                )}
                <JournalNote book={e.book} day={day} onUpdate={onUpdate} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {/* the fact this reading day gave her (D-0079): a day she didn't read on has none */}
      {dayFact && (
        <p className="calendar-fact small-text">
          <span aria-hidden>💡</span> <span className="muted">Your fact that day:</span> {dayFact}
        </p>
      )}
      {pickedReleases.length > 0 && (
        <ul className="waiting-list">
          {pickedReleases.map((b) => (
            <li key={`out-${b.id}`}>
              <button className="cover-btn" aria-label={`Open ${b.title}`} onClick={() => onShowBook(b.id)}>
                <Cover book={b} small />
              </button>
              <div className="waiting-info">
                <p className="waiting-title">
                  <strong>{b.title}</strong>
                </p>
                <p className="muted small-text">Comes out</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!future && (
        editing === '__add' ? (
          <AddBookForDay
            books={books}
            day={day}
            entries={pickedEntries}
            onUpdate={onUpdate}
            onClose={() => setEditing(null)}
          />
        ) : (
          <button
            type="button"
            className="btn small day-add-btn"
            onClick={() => setEditing('__add')}
            aria-expanded={false}
          >
            + Add a book
          </button>
        )
      )}
    </aside>
  )
}

/** One cover, or a pile when several books were read that day (as on the dashboard). */
function DayCovers({ entries, day, shuffle }: { entries: DayEntry[]; day: number; shuffle: number }) {
  if (entries.length === 0) return null
  if (entries.length === 1) {
    return (
      <span className={`day-cover${mark(entries[0])}`}>
        <Cover book={entries[0].book} small />
      </span>
    )
  }
  const pile = dayPile(entries, day, shuffle)
  const top = pile[pile.length - 1]
  return (
    <span className={`day-cover day-pile${mark(top)}`} aria-hidden>
      {pile.map((e, i) => (
        <span
          key={e.book.id}
          className={i === pile.length - 1 ? 'pile-sheet pile-top' : 'pile-sheet'}
          style={{ '--layer': pile.length - 1 - i } as React.CSSProperties}
        >
          <Cover book={e.book} small />
        </span>
      ))}
      {entries.length > 1 && <span className="pile-more">+{entries.length - 1}</span>}
    </span>
  )
}

function YearView({
  books,
  year,
  today,
  onOpenMonth,
}: {
  books: Book[]
  year: number
  today: string
  onOpenMonth: (month: number) => void
}) {
  const levels = useMemo(() => yearLevels(books, year), [books, year])
  return (
    <ol className="calendar-year">
      {Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const finished = finishedIn(books, year, m)
        const key = `${year}-${String(m).padStart(2, '0')}`
        return (
          <li key={m}>
            <button className="calendar-mini" onClick={() => onOpenMonth(m)} aria-label={`Open ${monthName(m)} ${year}`}>
              <span className="calendar-mini-name">{monthName(m)}</span>
              <span className="calendar-dots" aria-hidden>
                {monthWeeks(year, m)
                  .flat()
                  .map((d, j) =>
                    d ? (
                      <span
                        key={j}
                        className={`calendar-dot level-${levels.get(`${key}-${String(d).padStart(2, '0')}`) ?? 0}${
                          `${key}-${String(d).padStart(2, '0')}` === today ? ' today' : ''
                        }`}
                      />
                    ) : (
                      <span key={j} />
                    ),
                  )}
              </span>
            </button>
            {finished.length > 0 && (
              <span className="calendar-mini-covers" aria-label={`${finished.length} finished in ${monthName(m)}`}>
                {finished.slice(0, 8).map((f) => (
                  <Cover key={`${f.book.id}-${f.day}`} book={f.book} small />
                ))}
                {finished.length > 8 && <span className="muted small-text">+{finished.length - 8}</span>}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
