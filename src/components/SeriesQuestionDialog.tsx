import { useEffect, useRef } from 'react'
import type { Book } from '#/lib/library'
import type { SeriesChoice, SeriesQuestion } from '#/lib/sleepSeries'

interface Props {
  questions: SeriesQuestion[]
  onJoin: (book: Book, choice: SeriesChoice) => void
  onNotInSeries: (book: Book) => void
  /** ask again next time */
  onLater: () => void
}

/**
 * "Is this part of …?": new books by an author who has a series on the shelf,
 * in one list. Each book is answered on its own; Later closes the list until
 * the next visit (see sleepSeries.ts).
 */
export function SeriesQuestionDialog({ questions, onJoin, onNotInSeries, onLater }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal()
  }, [])

  return (
    <dialog ref={dialog} className="dialog series-question" onClose={onLater} aria-labelledby="series-question-title">
      <div className="dialog-body">
        <header className="dialog-header">
          <h2 id="series-question-title">{questions.length === 1 ? 'Part of a series?' : 'Part of a series? (' + questions.length + ')'}</h2>
          <button className="icon-btn" onClick={() => dialog.current?.close()} aria-label="Later">
            ×
          </button>
        </header>
        <p className="muted small-text">
          {questions.length === 1 ? 'This new book is' : 'These new books are'} by an author with a series on your shelf.
        </p>
        <ul className="series-question-list">
          {questions.map(({ book, choices }) => (
            <li key={book.id}>
              <p className="series-question-book">
                <strong>{book.title}</strong>
                {book.authors.length > 0 && <span className="muted small-text"> · {book.authors.join(', ')}</span>}
              </p>
              <div className="chips">
                {choices.map((c) => (
                  <button key={c.key} type="button" className="btn small" onClick={() => onJoin(book, c)}>
                    {c.sleep && '🌙 '}
                    {c.name}
                  </button>
                ))}
                <button type="button" className="btn small" onClick={() => onNotInSeries(book)}>
                  Not in a series
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button className="btn" onClick={() => dialog.current?.close()}>
            Later
          </button>
        </div>
      </div>
    </dialog>
  )
}
