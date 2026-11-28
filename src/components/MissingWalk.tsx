import type { Book } from '#/lib/library'
import { DETAILS, DETAIL_LABEL, DETAIL_TAB, misses, onShelf } from '#/lib/missingDetails'
import { openNextBookOn } from './BookPanel'

/**
 * Going through the books one at a time (T-0129): the books that still miss something, in title
 * order; each opens on the tab of its first missing detail, and this bar says what is still
 * missing, with Next book › and Stop. A book she completes drops out by itself.
 */

/** The books still missing anything, in title order. */
export function walkList(books: readonly Book[]): Book[] {
  return onShelf(books)
    .filter((b) => DETAILS.some((d) => misses(b, d)))
    .sort((a, b) => a.title.localeCompare(b.title))
}

/** Opens one book on the tab of its first missing detail. */
export function openForWalk(book: Book, onShowBook: (id: string) => void) {
  const first = DETAILS.find((d) => misses(book, d))
  if (first) openNextBookOn(DETAIL_TAB[first])
  onShowBook(book.id)
}

export function MissingWalk({
  books,
  currentId,
  onShowBook,
  onStop,
}: {
  books: Book[]
  currentId: string
  onShowBook: (id: string) => void
  onStop: () => void
}) {
  const list = walkList(books)
  const current = books.find((b) => b.id === currentId)
  const left = current ? DETAILS.filter((d) => misses(current, d)) : []
  // the next book after this one in title order, still missing something
  const next = list.find((b) => current && b.title.localeCompare(current.title) > 0 && b.id !== current.id) ?? list.find((b) => b.id !== currentId)
  const at = current ? list.filter((b) => b.title.localeCompare(current.title) < 0).length + 1 : 0
  return (
    <div className="missing-walk" role="region" aria-label="Going through missing details">
      <span className="small-text">
        {current ? (
          left.length ? (
            <>
              <strong>{current.title}</strong> still misses {left.map((d) => DETAIL_LABEL[d].toLowerCase()).join(', ')}
            </>
          ) : (
            <>
              <strong>{current.title}</strong> is complete ✓
            </>
          )
        ) : (
          'All done ✓'
        )}
        {list.length > 0 && <span className="muted"> · {at > 0 ? `${Math.min(at, list.length)} of ${list.length}` : `${list.length} to go`}</span>}
      </span>
      <span className="missing-walk-actions">
        {next && (
          <button type="button" className="btn small primary" onClick={() => openForWalk(next, onShowBook)}>
            Next book ›
          </button>
        )}
        <button type="button" className="btn small" onClick={onStop}>
          Stop
        </button>
      </span>
    </div>
  )
}
