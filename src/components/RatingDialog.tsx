import { useEffect, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { ratingText, spiceText } from '#/lib/ratings'
import { StarRating } from './StarRating'

interface Props {
  book: Book
  onUpdate: (patch: Partial<Pick<Book, 'rating' | 'spice'>>) => void
  onClose: () => void
}

/**
 * Asked when Hanna marks a book as read (#100): how many stars? A re-read
 * keeps its rating; the pop-up shows it and asks whether it is still the same.
 */
export function RatingDialog({ book, onUpdate, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  // what it had before this read, so a re-read can keep it in one tap
  const [before] = useState(() => ({ rating: book.rating, spice: book.spice }))
  const reread = !!(before.rating || before.spice)
  const changed = book.rating !== before.rating || book.spice !== before.spice
  useEffect(() => {
    dialog.current?.showModal()
    dialog.current?.querySelector<HTMLElement>('[role="slider"]')?.focus()
  }, [])
  const close = () => dialog.current?.close()

  return (
    <dialog
      ref={dialog}
      className="dialog rating-dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) close()
      }}
    >
      <div className="dialog-body">
        <header className="dialog-header">
          <h2>{reread ? 'You read it again!' : 'You finished it!'}</h2>
          <button className="icon-btn" onClick={close} aria-label="Close">
            ×
          </button>
        </header>
        {book.coverUrl && <img className="rating-cover" src={book.coverUrl} alt="" />}
        {reread ? (
          <p>
            Still the same for <em>{book.title}</em>? Tap the stars or peppers to change them.
          </p>
        ) : (
          <p>
            How did you like <em>{book.title}</em>?
          </p>
        )}
        <StarRating
          value={book.rating}
          onChange={(rating) => onUpdate({ rating })}
          size="large"
          label={`Rating for ${book.title}`}
        />
        <p className="muted small-text" aria-live="polite">
          {ratingText(book.rating)}
        </p>
        <p className="rating-question">How spicy was it?</p>
        <StarRating
          kind="spice"
          value={book.spice}
          onChange={(spice) => onUpdate({ spice })}
          size="large"
          label={`Spice level for ${book.title}`}
        />
        <p className="muted small-text" aria-live="polite">
          {spiceText(book.spice)}
        </p>
        <div className="dialog-actions">
          {reread && changed && (
            <button
              className="btn"
              onClick={() => {
                onUpdate({ rating: before.rating, spice: before.spice })
                close()
              }}
            >
              Keep the old one
            </button>
          )}
          <button className="btn" onClick={close}>
            {reread ? (changed ? 'Done' : 'Still the same') : book.rating || book.spice ? 'Done' : 'Not now'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
