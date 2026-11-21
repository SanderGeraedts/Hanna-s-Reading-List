import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { finishPatch, parsePosition, position, quickBooks, stepOf, stepPatch } from '#/lib/quickUpdate'
import { Cover } from './Dashboard'
import { sparkle } from './Sparkles'
import { daysLeftText, daysToFinish } from '#/lib/finishEstimate'

type Update = (id: string, patch: Partial<Book> | ((book: Book) => Partial<Book>)) => void

/**
 * Quick update (T-0011): a round 📖 button in the corner of every page. It
 * shows the books she's on as big covers; one tap opens a small card to move
 * on a page at a time (or type where she is), or finish the book, without the
 * full book panel. Hidden while there's nothing on the go or a book is open.
 */
export function QuickUpdate({
  books,
  onUpdate,
  onShowBook,
  hidden,
}: {
  books: Book[]
  onUpdate: Update
  onShowBook: (id: string) => void
  hidden: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const list = useMemo(() => quickBooks(books), [books])
  // with one book on the go, straight to its card
  const id = pickedId ?? (list.length === 1 ? list[0].id : null)
  const picked = id ? books.find((b) => b.id === id) : undefined

  const close = () => {
    setOpen(false)
    setPickedId(null)
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (hidden || (list.length === 0 && !open)) return null

  return (
    <>
      {!open && (
        <button className="quick-fab" aria-label="Quick update" title="Quick update" onClick={() => setOpen(true)}>
          <span aria-hidden>📖</span>
        </button>
      )}
      {open && (
        <div className="quick-backdrop" onClick={close}>
          <section
            className="quick-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={picked ? `Update ${picked.title}` : 'Quick update'}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="quick-head">
              {picked && list.length > 1 ? (
                <button className="btn small" onClick={() => setPickedId(null)}>
                  ‹ Books
                </button>
              ) : (
                <h2>{picked ? 'Quick update' : 'Reading now'}</h2>
              )}
              <button className="btn icon small" aria-label="Close" onClick={close}>
                ×
              </button>
            </div>
            {picked && picked.status !== 'read' ? (
              <QuickCard
                book={picked}
                onUpdate={onUpdate}
                onMore={() => {
                  close()
                  onShowBook(picked.id)
                }}
                onFinished={close}
              />
            ) : (
              <ul className="quick-list">
                {list.map((b) => (
                  <li key={b.id}>
                    <button className="quick-pick" onClick={() => setPickedId(b.id)}>
                      <Cover book={b} />
                      <span className="quick-pick-title">{b.title}</span>
                      <span className="muted small-text">
                        {b.status === 'paused' ? 'Paused · ' : ''}
                        {Math.round((b.progress ?? 0) * 100)}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  )
}

/** One book: where she is in big numbers, − / + (hold to go faster), +10, typing, Finished!, More. */
function QuickCard({
  book,
  onUpdate,
  onMore,
  onFinished,
}: {
  book: Book
  onUpdate: Update
  onMore: () => void
  onFinished: () => void
}) {
  const at = position(book)
  // at her pace over the last two weeks; nothing when there's too little to go on
  const eta = daysToFinish(book)
  const unit = stepOf(book).unit
  const word = unit === 'pages' ? 'page' : unit === 'time' ? 'minute' : 'percent'
  const [typing, setTyping] = useState<string | null>(null)
  const [refused, setRefused] = useState(false)
  const step = (n: number) => onUpdate(book.id, (b) => stepPatch(b, n))

  const save = () => {
    if (typing === null) return
    const p = parsePosition(book, typing)
    if (p === null) {
      setRefused(true)
      return
    }
    onUpdate(book.id, (b) => progressTo(b, p))
    setTyping(null)
    setRefused(false)
  }

  return (
    <div className="quick-card">
      <div className="quick-book">
        <Cover book={book} />
        <div className="quick-book-text">
          <strong>{book.title}</strong>
          {book.authors[0] && <span className="muted small-text">{book.authors[0]}</span>}
          <span className="quick-bar" aria-hidden>
            <span style={{ width: `${Math.round((book.progress ?? 0) * 100)}%` }} />
          </span>
        </div>
      </div>

      {typing === null ? (
        <button className="quick-position" onClick={() => setTyping(at.value.replace('%', ''))} aria-label={`At ${at.value} ${at.of}. Type where you are`}>
          <span className="quick-number">{at.value}</span>
          <span className="muted">{at.of}</span>
        </button>
      ) : (
        <form
          className="quick-type"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <input
            className="input quick-input"
            value={typing}
            inputMode={unit === 'time' ? 'text' : 'decimal'}
            autoFocus
            aria-label={unit === 'pages' ? 'Page' : unit === 'time' ? 'Listening time' : 'Percentage'}
            aria-invalid={refused}
            onChange={(e) => {
              setTyping(e.target.value)
              setRefused(false)
            }}
          />
          <span className="muted">{at.of}</span>
          <button className="btn small primary">Save</button>
        </form>
      )}
      {eta !== null && <p className="quick-eta muted small-text">{daysLeftText(eta)}</p>}

      <div className="quick-steps">
        <HoldButton label={`Back one ${word}`} onStep={() => step(-1)}>
          −
        </HoldButton>
        <HoldButton label={`On one ${word}`} onStep={() => step(1)} big>
          +
        </HoldButton>
        <button className="btn quick-ten" aria-label={`On ten ${word}s`} onClick={() => step(10)}>
          +10
        </button>
      </div>

      <div className="quick-actions">
        <button className="btn small" onClick={onMore}>
          More
        </button>
        <button
          className="btn primary"
          onClick={() => {
            onUpdate(book.id, (b) => finishPatch(b))
            onFinished()
            sparkle()
          }}
        >
          Finished! 🎉
        </button>
      </div>
    </div>
  )
}

/** The change to move straight to `progress` (typed), through stepPatch's log keeping. */
function progressTo(book: Book, progress: number): Partial<Book> {
  const total = Math.round(1 / stepOf(book).one)
  return stepPatch(book, Math.round(progress * total) - Math.round((book.progress ?? 0) * total))
}

/** A button that steps once per tap, and keeps stepping, faster and faster, while held. */
function HoldButton({
  label,
  onStep,
  big,
  children,
}: {
  label: string
  onStep: () => void
  big?: boolean
  children: React.ReactNode
}) {
  const timer = useRef<number | undefined>(undefined)
  const step = useRef(onStep)
  step.current = onStep
  const stop = () => {
    window.clearTimeout(timer.current)
    timer.current = undefined
  }
  useEffect(() => stop, [])
  const start = () => {
    stop()
    step.current()
    let delay = 160
    const again = () => {
      step.current()
      delay = Math.max(40, delay * 0.88)
      timer.current = window.setTimeout(again, delay)
    }
    timer.current = window.setTimeout(again, 450)
  }
  return (
    <button
      type="button"
      className={`btn quick-step${big ? ' big' : ''}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        start()
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      // the keyboard: Enter or Space steps once
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          step.current()
        }
      }}
    >
      {children}
    </button>
  )
}
