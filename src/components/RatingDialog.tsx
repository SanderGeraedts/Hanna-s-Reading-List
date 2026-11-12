import { useEffect, useRef } from 'react'
import type { Book } from '#/lib/library'
import { ratingText, spiceText } from '#/lib/ratings'
import { StarRating } from './StarRating'

interface Props {
  book: Book
  onUpdate: (patch: Partial<Pick<Book, 'rating' | 'spice'>>) => void
  onClose: () => void
}

/** Asked when Hanna marks a book as read (#100): how many stars? */
export function RatingDialog({ book, onUpdate, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
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
          <h2>You finished it!</h2>
          <button className="icon-btn" onClick={close} aria-label="Close">
            ×
          </button>
        </header>
        {book.coverUrl && <img className="rating-cover" src={book.coverUrl} alt="" />}
        <p>
          How did you like <em>{book.title}</em>?
        </p>
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
          <button className="btn" onClick={close}>
            {book.rating || book.spice ? 'Done' : 'Not now'}
          </button>
        </div>
      </div>
    </dialog>
  )
}
