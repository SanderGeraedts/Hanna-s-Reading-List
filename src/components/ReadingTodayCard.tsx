import { useMemo } from 'react'
import type { Book } from '#/lib/library'
import { localDay } from '#/lib/library'
import { readingStreak } from '#/lib/insights'
import { position, quickBooks, stepOf, stepPatch } from '#/lib/quickUpdate'
import { dayText, daysToFinish } from '#/lib/finishEstimate'
import { placeLine, streakLine, weekDots } from '#/lib/todayDashboard'
import { Cover } from './common'
import { OpenLink } from './OpenLink'

type Update = (id: string, patch: Partial<Book> | ((book: Book) => Partial<Book>)) => void

/**
 * Reading today (T-0124, D-0093): the one card about the books she is on, in place of the strip
 * at the top, Currently reading, Finish by and the week calendar. This week as seven dots, the
 * streak in a line, and per book: progress, the finish day, where it is set, and + to log today's
 * reading without opening the book (the same steps as the 📖 quick update).
 */
export function ReadingTodayCard({
  books,
  onShowBook,
  onUpdate,
  onOpenCalendar,
  onOpenMap,
}: {
  books: Book[]
  onShowBook: (id: string) => void
  onUpdate: Update
  onOpenCalendar?: () => void
  onOpenMap?: () => void
}) {
  const today = localDay()
  const dots = useMemo(() => weekDots(books, today), [books, today])
  const streak = useMemo(() => readingStreak(books), [books])
  const all = useMemo(() => quickBooks(books), [books])
  const reading = all.filter((b) => b.status === 'reading')
  const paused = all.filter((b) => b.status === 'paused')

  return (
    <section className="dash-card reading-today" aria-labelledby="reading-today-title">
      <div className="dash-card-head">
        <h2 id="reading-today-title">Reading today</h2>
        <OpenLink onOpen={onOpenCalendar} label="Calendar" />
      </div>
      <button type="button" className="week-dots" onClick={onOpenCalendar} aria-label={`This week: read on ${dots.filter((d) => d.read).length} of ${dots.filter((d) => !d.future).length} days. Open the calendar`}>
        {dots.map((d) => (
          <span key={d.day} className={['week-dot', d.read && 'read', d.today && 'today', d.future && 'future'].filter(Boolean).join(' ')} aria-hidden>
            <span className="week-dot-mark" />
            <span className="week-dot-label">{d.label}</span>
          </span>
        ))}
      </button>
      <p className="small-text reading-streak">{streakLine(streak)}</p>

      {reading.length === 0 ? (
        <p className="muted small-text">Nothing on the go right now.</p>
      ) : (
        <ul className="reading-today-list">
          {reading.map((b) => (
            <ReadingRow key={b.id} book={b} onShowBook={onShowBook} onUpdate={onUpdate} onOpenMap={onOpenMap} />
          ))}
        </ul>
      )}
      {paused.length > 0 && (
        <p className="muted small-text">
          Paused:{' '}
          {paused.map((b, i) => (
            <span key={b.id}>
              {i > 0 && ', '}
              <button type="button" className="link-btn" onClick={() => onShowBook(b.id)}>
                {b.title}
              </button>
            </span>
          ))}
        </p>
      )}
    </section>
  )
}

function ReadingRow({ book, onShowBook, onUpdate, onOpenMap }: { book: Book; onShowBook: (id: string) => void; onUpdate: Update; onOpenMap?: () => void }) {
  const pct = Math.round((book.progress ?? 0) * 100)
  const eta = daysToFinish(book)
  const at = position(book)
  const unit = stepOf(book).unit
  const step = unit === 'pages' ? 10 : unit === 'time' ? 15 : 5
  const stepWord = unit === 'pages' ? `${step} pages` : unit === 'time' ? `${step} minutes` : `${step}%`
  const place = placeLine(book)
  return (
    <li className="reading-row">
      <button type="button" className="cover-btn" onClick={() => onShowBook(book.id)} aria-label={`Open ${book.title}`}>
        <Cover book={book} small />
      </button>
      <div className="reading-row-text">
        <strong>{book.title}</strong>
        <span className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${book.title} progress`}>
          <span style={{ width: `${pct}%` }} />
        </span>
        <span className="muted small-text">
          {at.value} {at.of}
          {eta !== null && <> · done ≈ {dayText(eta)}</>}
        </span>
        {place &&
          (onOpenMap ? (
            <button type="button" className="link-btn small-text reading-place" onClick={onOpenMap}>
              📍 {place}
            </button>
          ) : (
            <span className="small-text reading-place">📍 {place}</span>
          ))}
      </div>
      <div className="reading-row-steps">
        <button type="button" className="btn small" onClick={() => onUpdate(book.id, (b) => stepPatch(b, 1))} aria-label={`${book.title}: one ${unit === 'pages' ? 'page' : unit === 'time' ? 'minute' : 'percent'} on`}>
          +1
        </button>
        <button type="button" className="btn small" onClick={() => onUpdate(book.id, (b) => stepPatch(b, step))} aria-label={`${book.title}: ${stepWord} on`}>
          +{step}
        </button>
      </div>
    </li>
  )
}
