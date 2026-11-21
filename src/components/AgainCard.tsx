import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { localDay, statusPatch } from '#/lib/library'
import { bookOfTheDay, stoppedAtText } from '#/lib/didNotFinish'
import { Cover } from './Dashboard'

interface Props {
  books: Book[]
  onShowBook: (id: string) => void
  onUpdate: (id: string, patch: Partial<Book> | ((book: Book) => Partial<Book>)) => void
  /** the day the turns follow; today when not given */
  day?: string
}

/**
 * "Give it another try" (#187): one book she didn't finish, a different one
 * each day, with a button that sets it back to Reading.
 */
export function AgainCard({ books, onShowBook, onUpdate, day }: Props) {
  const today = day ?? localDay()
  const book = useMemo(() => bookOfTheDay(books, today), [books, today])
  const [backTitle, setBackTitle] = useState<string | null>(null)
  // after "Try again", focus moves to the next book's button, or to the heading
  const [moveFocus, setMoveFocus] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const tryButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!moveFocus) return
    setMoveFocus(false)
    ;(tryButton.current ?? heading.current)?.focus()
  }, [moveFocus, book])

  const tryAgain = (b: Book) => {
    // keeps the progress: back under Currently reading, with its bookmark
    onUpdate(b.id, (current) => statusPatch(current, 'reading'))
    setBackTitle(b.title)
    setMoveFocus(true)
  }
  const stopped = book && stoppedAtText(book)

  return (
    <section className="dash-card next-card again-card" aria-labelledby="again-title">
      <div className="dash-card-head">
        <h2 id="again-title" ref={heading} tabIndex={-1}>
          Give it another try
        </h2>
      </div>
      <p className="muted small-text again-status" role="status">
        {backTitle ? `“${backTitle}” is back in Currently reading.` : ''}
      </p>
      {book ? (
        <>
          <div className="next-book">
            <button type="button" className="cover-btn" aria-label={`Open ${book.title}`} onClick={() => onShowBook(book.id)}>
              <Cover book={book} />
            </button>
            <div>
              <p className="next-title">
                <button type="button" className="link-btn again-title" onClick={() => onShowBook(book.id)}>
                  {book.title}
                </button>
              </p>
              {book.authors.length > 0 && <p className="muted small-text">{book.authors.join(', ')}</p>}
              {stopped && <p className="muted small-text">{stopped}</p>}
              <div className="next-actions">
                <button ref={tryButton} type="button" className="btn primary" onClick={() => tryAgain(book)}>
                  Try again
                </button>
                <button type="button" className="btn" onClick={() => onShowBook(book.id)}>
                  Show on the shelf
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="muted small-text">No books put aside.</p>
      )}
    </section>
  )
}
