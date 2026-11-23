import { useEffect, useRef } from 'react'
import type { Book } from '#/lib/library'
import { AddFollowUp } from './AddFollowUp'
import type { FollowUpHandle } from './AddFollowUp'

/**
 * The after-adding steps on their own, for a book that joined the shelf from
 * somewhere other than the add dialog: a wish she has just bought (T-0072,
 * "I bought it ›"). It asks exactly what the add dialog asks — how she has it
 * and what it cost — with the wish's price already in the field.
 *
 * It is a dialog she opened by pressing a button, so D-0013 (no pop-ups) holds.
 */
export function FollowUpDialog({
  book,
  onUpdate,
  onClose,
  returnFocusId,
}: {
  book: Book | null
  onUpdate: (id: string, patch: Partial<Book>) => void
  onClose: () => void
  /** the id of the element focus goes back to; the row it was opened from has gone to the shelf */
  returnFocusId?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const handle = useRef<FollowUpHandle>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  if (!book) return null
  return (
    <dialog
      ref={dialog}
      className="dialog"
      onClose={() => {
        // closing early keeps what was valid in the price field
        handle.current?.flush()
        onClose()
        if (returnFocusId) document.getElementById(returnFocusId)?.focus()
      }}
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current?.close()
      }}
    >
      <div className="dialog-body">
        <header className="dialog-header">
          <h2>Add a book</h2>
          <button className="icon-btn" onClick={() => dialog.current?.close()} aria-label="Close">
            ×
          </button>
        </header>
        <AddFollowUp
          book={book}
          from="bought"
          onUpdate={onUpdate}
          handle={handle}
          initialPrice={book.price}
          onDone={() => dialog.current?.close()}
        />
      </div>
    </dialog>
  )
}
