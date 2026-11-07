import { useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { FORMAT_LABELS, formatsOf } from '#/lib/library'
import { likelyDuplicates } from '#/lib/merge'
import { searchShelf } from '#/lib/search'

interface Props {
  book: Book
  shelf: Book[]
  /** merge `otherId` into this book */
  onMerge: (otherId: string) => void
  /** stop suggesting `otherId` as a copy of this book */
  onNotDuplicate: (otherId: string) => void
}

/** What tells two copies apart in a list: how she has it, otherwise the author. */
function describe(b: Book) {
  const formats = formatsOf(b).map((f) => FORMAT_LABELS[f])
  return formats.length ? formats.join(' + ') : (b.authors[0] ?? '')
}

/**
 * Duplicates (#14): copies of this book the shelf seems to have twice, and a
 * search to merge any other book into this one.
 */
export function MergeSection({ book, shelf, onMerge, onNotDuplicate }: Props) {
  const suggestions = useMemo(() => likelyDuplicates(book, shelf), [book, shelf])
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')
  /** the book waiting for "Merge" to be confirmed */
  const [confirming, setConfirming] = useState<Book | null>(null)
  const others = useMemo(() => shelf.filter((b) => b.id !== book.id), [shelf, book.id])
  const results = useMemo(() => searchShelf(others, query).slice(0, 6), [others, query])

  if (confirming) {
    return (
      <div className="field merge">
        <span>Merge</span>
        <p className="merge-confirm">
          Merge <strong>{confirming.title}</strong> <small>({describe(confirming)})</small> into this book? This book keeps
          its title and cover. The furthest progress, the most times read, and both books' formats and genres are kept.
          The other copy disappears from the shelf.
        </p>
        <div className="merge-actions">
          <button
            className="btn primary"
            onClick={() => {
              onMerge(confirming.id)
              setConfirming(null)
              setPicking(false)
              setQuery('')
            }}
          >
            Merge
          </button>
          <button className="btn" onClick={() => setConfirming(null)}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="field merge">
      <span>Duplicates</span>
      {suggestions.map((o) => (
        <div className="merge-suggestion" key={o.id}>
          <p>
            Looks like the same book: <strong>{o.title}</strong> <small>({describe(o)})</small>
          </p>
          <div className="merge-actions">
            <button className="btn" onClick={() => setConfirming(o)}>
              Merge…
            </button>
            <button className="link-btn" onClick={() => onNotDuplicate(o.id)}>
              Not the same book
            </button>
          </div>
        </div>
      ))}
      {picking ? (
        <>
          <input
            className="input"
            type="search"
            autoFocus
            placeholder="Find the other copy…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setPicking(false)
                setQuery('')
              }
            }}
          />
          {query.trim() && (
            <ul className="merge-results">
              {results.length === 0 && <li className="muted">No other book matches.</li>}
              {results.map(({ book: o }) => (
                <li key={o.id}>
                  <button onClick={() => setConfirming(o)}>
                    <strong>{o.title}</strong> <small>({describe(o)})</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <button className="link-btn" onClick={() => setPicking(true)}>
          Merge with another book…
        </button>
      )}
    </div>
  )
}
