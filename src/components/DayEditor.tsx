import { useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { localDay } from '#/lib/library'
import { amountText, amountUnit, setDayAmountPatch } from '#/lib/readingLog'
import type { DayEntry } from '#/lib/readingLog'
import { progressFromPage, progressFromPercent, progressFromTime } from '#/lib/progress'
import { searchShelf } from '#/lib/search'
import { sleepReadIds } from '#/lib/sleepSeries'
import { Cover } from './common'

/**
 * Fix a past day (T-0045): the day panel on the dashboard's Calendar block
 * and on the Calendar page gets a Change control on every book listed and a
 * + Add a book button, so she can type how much she read without moving the
 * book's progress (progress stays where it is; only `book.readingLog[day]`
 * changes). Future days stay disabled on the calendar, so this never opens
 * on one.
 */

export type DayUpdate = (id: string, patch: Partial<Book>) => void

interface ChangeRowProps {
  book: Book
  day: string
  /** the current share for this day (0..1), or undefined for a new entry */
  share?: number
  onSave: (share: number) => void
  onCancel: () => void
  /** when this is a new entry (from + Add a book), Remove is hidden */
  isNew?: boolean
}

/** The in-place amount editor for one book on one day. */
function ChangeRow({ book, day: _day, share, onSave, onCancel, isNew }: ChangeRowProps) {
  const unit = amountUnit(book)
  const starting = share !== undefined ? startText(book, share, unit) : ''
  const [raw, setRaw] = useState(starting)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const parsed = parseAmount(book, raw, unit)
  const error = touched && raw.trim() !== '' && parsed === null
  const willRemove = raw.trim() === '' || parsed === 0

  const label = unit === 'pages' ? 'Pages read' : unit === 'time' ? 'Minutes listened' : 'Percent read'
  const placeholder = unit === 'pages' ? 'e.g. 30' : unit === 'time' ? 'e.g. 45 min or 1:20' : 'e.g. 10'
  const suffix = unit === 'pages' ? 'pages' : unit === 'percent' ? '%' : ''

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (parsed === null && raw.trim() !== '') {
      setTouched(true)
      return
    }
    onSave(parsed ?? 0)
  }

  return (
    <form className="day-editor" onSubmit={submit}>
      <label className="day-amount">
        <span className="small-text muted">Read:</span>
        <input
          ref={inputRef}
          type="text"
          inputMode={unit === 'pages' ? 'numeric' : 'text'}
          aria-label={label}
          placeholder={placeholder}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              onCancel()
            }
          }}
          autoFocus
        />
        {suffix && <span className="small-text muted">{suffix}</span>}
      </label>
      <div className="day-editor-actions">
        <button type="submit" className="btn small" disabled={error}>
          Save
        </button>
        {!isNew && (
          <button type="button" className="btn small" onClick={() => onSave(0)}>
            Remove
          </button>
        )}
        <button type="button" className="link-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <p className="hint small-text" aria-live="polite">
        {error
          ? unit === 'pages'
            ? 'Pages must be 0 or more'
            : unit === 'time'
              ? 'Not a time'
              : 'Not a number'
          : willRemove && !isNew
            ? 'Save with 0 takes this book off the day'
            : parsed !== null && parsed === 1
              ? "That's the whole book."
              : ''}
      </p>
    </form>
  )
}

interface DayControlsProps {
  books: Book[]
  day: string
  entries: DayEntry[]
  onUpdate: DayUpdate
  /** the id of the book whose Change editor is open, or 'add' for the + Add a book panel */
  openId: string | null
  onOpen: (id: string | null) => void
}

/** The Change buttons on each row plus the shared state for the editor. */
export function ChangeButton({ book, open, onOpen }: { book: Book; open: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="btn small day-change"
      aria-expanded={open}
      aria-label={`Change how much you read of ${book.title}`}
      onClick={onOpen}
    >
      Change
    </button>
  )
}

export function DayChangeEditor({
  book,
  day,
  entry,
  onUpdate,
  onClose,
}: {
  book: Book
  day: string
  entry?: DayEntry
  onUpdate: DayUpdate
  onClose: () => void
}) {
  return (
    <ChangeRow
      book={book}
      day={day}
      share={entry?.amount}
      onSave={(share) => {
        onUpdate(book.id, setDayAmountPatch(book, day, share))
        onClose()
      }}
      onCancel={onClose}
    />
  )
}

/** + Add a book panel: a search box with Reading + Recently finished on top. */
export function AddBookForDay({
  books,
  day,
  entries,
  onUpdate,
  onClose,
}: {
  books: Book[]
  day: string
  entries: DayEntry[]
  onUpdate: DayUpdate
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Book | null>(null)
  const already = useMemo(() => new Set(entries.map((e) => e.book.id)), [entries])
  const sleep = useMemo(() => sleepReadIds(books), [books])

  const trimmed = query.trim()
  const suggestions = useMemo(() => {
    if (trimmed) {
      return searchShelf(books, trimmed)
        .map((h) => h.book)
        .filter((b) => !already.has(b.id))
        .slice(0, 20)
    }
    return []
  }, [books, trimmed, already])

  const now = Date.now()
  const reading = useMemo(
    () =>
      books
        .filter((b) => (b.status === 'reading' || b.status === 'paused') && !sleep.has(b.id) && !already.has(b.id))
        .sort((a, b) => lastStart(b) - lastStart(a))
        .slice(0, 6),
    [books, already, sleep],
  )
  const finished = useMemo(
    () =>
      books
        .filter((b) => b.status === 'read' && (b.finished?.length ?? 0) > 0 && !sleep.has(b.id) && !already.has(b.id))
        .sort((a, b) => lastFinish(b) - lastFinish(a))
        .filter((b) => now - lastFinishDate(b) < 1000 * 60 * 60 * 24 * 60)
        .slice(0, 6),
    [books, already, now, sleep],
  )

  if (picked) {
    return (
      <div className="day-add" role="group" aria-label={`Add ${picked.title} for this day`}>
        <div className="day-add-picked">
          <Cover book={picked} small />
          <div>
            <p className="waiting-title">
              <strong>{picked.title}</strong>
            </p>
            <p className="muted small-text">{picked.authors.join(', ')}</p>
          </div>
        </div>
        <ChangeRow
          book={picked}
          day={day}
          share={undefined}
          onSave={(share) => {
            if (share > 0) onUpdate(picked.id, setDayAmountPatch(picked, day, share))
            onClose()
          }}
          onCancel={() => setPicked(null)}
          isNew
        />
      </div>
    )
  }

  return (
    <div className="day-add" role="group" aria-label="Add a book for this day">
      <div className="day-add-head">
        <input
          type="search"
          className="day-add-search"
          aria-label="Find a book"
          placeholder="Find a book"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button type="button" className="link-btn" onClick={onClose}>
          Close
        </button>
      </div>
      {trimmed ? (
        <BookPicks books={suggestions} onPick={setPicked} empty="No matches." />
      ) : (
        <>
          <BookGroup label="Reading" books={reading} onPick={setPicked} />
          <BookGroup label="Recently finished" books={finished} onPick={setPicked} />
          {reading.length === 0 && finished.length === 0 && (
            <p className="muted small-text">Type to find any book on the shelf.</p>
          )}
        </>
      )}
    </div>
  )
}

function BookGroup({ label, books, onPick }: { label: string; books: Book[]; onPick: (b: Book) => void }) {
  if (books.length === 0) return null
  return (
    <div className="day-add-group">
      <h4 className="muted small-text">{label}</h4>
      <BookPicks books={books} onPick={onPick} />
    </div>
  )
}

function BookPicks({ books, onPick, empty }: { books: Book[]; onPick: (b: Book) => void; empty?: string }) {
  if (books.length === 0) return empty ? <p className="muted small-text">{empty}</p> : null
  return (
    <ul className="day-add-list">
      {books.map((b) => (
        <li key={b.id}>
          <button type="button" className="day-add-pick" onClick={() => onPick(b)}>
            <Cover book={b} small />
            <span className="day-add-text">
              <strong>{b.title}</strong>
              <span className="muted small-text">{b.authors.join(', ')}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// ---- helpers --------------------------------------------------------------

function startText(book: Book, share: number, unit: ReturnType<typeof amountUnit>): string {
  // use amountText, then strip the unit so just the number is in the field
  const text = amountText(book, share)
  if (unit === 'pages') return text.replace(/\s*pages?$/, '')
  if (unit === 'percent') return text.replace(/%$/, '')
  return text // "1 h 20 min" stays as is for listen-only
}

function parseAmount(book: Book, raw: string, unit: ReturnType<typeof amountUnit>): number | null {
  const s = raw.trim()
  if (s === '') return 0
  if (unit === 'pages') {
    const pages = book.pages ?? 0
    const n = Number(s.replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) return null
    // typed as whole pages; "0" is remove
    if (pages > 0) {
      const share = progressFromPage(String(Math.round(n)), pages)
      return share
    }
    return n === 0 ? 0 : null
  }
  if (unit === 'time') {
    const minutes = book.minutes ?? 0
    if (minutes <= 0) return null
    return progressFromTime(s, minutes)
  }
  return progressFromPercent(s)
}

const lastStart = (b: Book) => (b.started && b.started.length ? Date.parse(b.started[b.started.length - 1]) || 0 : b.addedAt)
const lastFinish = (b: Book) => (b.finished && b.finished.length ? Date.parse(b.finished[b.finished.length - 1]) || 0 : 0)
const lastFinishDate = (b: Book) => lastFinish(b)

/** The day today in local time, as yyyy-mm-dd — re-exported so callers don't import it twice. */
export const today = () => localDay()

/** A convenience state hook for a day panel: null, a book id, or 'add'. */
export function useDayEditor(): [string | null, (v: string | null) => void] {
  return useState<string | null>(null)
}

// `DayControlsProps` and `ChangeButton` currently unused on their own; exported for completeness.
export type { DayControlsProps }
