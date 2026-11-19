import { useEffect, useState } from 'react'
import type { Book } from '#/lib/library'
import { MAX_NOTE, journalPatch } from '#/lib/journal'

/**
 * A note about a book on a day (the reading journal), written in place: a
 * "✎ Add a note" link, or the note itself, which opens a small text box.
 * Saved when she leaves the box.
 */
export function JournalNote({
  book,
  day,
  onUpdate,
}: {
  book: Book
  day: string
  onUpdate: (id: string, patch: Partial<Book>) => void
}) {
  const saved = book.journal?.[day] ?? ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(saved)
  useEffect(() => setDraft(saved), [saved])

  const save = () => {
    setEditing(false)
    if (draft.trim() !== saved) onUpdate(book.id, journalPatch(book, day, draft))
  }

  if (editing) {
    return (
      <div className="journal-edit">
        <textarea
          className="input"
          rows={3}
          maxLength={MAX_NOTE}
          autoFocus
          aria-label={`Note about ${book.title}`}
          placeholder="How was it today?"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDraft(saved)
              setEditing(false)
            }
          }}
        />
        <small className="muted">
          {draft.length}/{MAX_NOTE}
        </small>
      </div>
    )
  }
  return saved ? (
    <button type="button" className="journal-note" onClick={() => setEditing(true)} title="Change the note">
      ✎ {saved}
    </button>
  ) : (
    <button type="button" className="link-btn small-text" onClick={() => setEditing(true)}>
      ✎ Add a note
    </button>
  )
}
