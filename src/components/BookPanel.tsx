import type { Book, ReadingStatus } from '#/lib/library'
import { STATUS_LABELS } from '#/lib/library'

export type Face = 'front' | 'spine' | 'back'

interface Props {
  book: Book
  onFace: (face: Face) => void
  onStatus: (status: ReadingStatus) => void
  onRemove: () => void
  onClose: () => void
}

export function BookPanel({ book, onFace, onStatus, onRemove, onClose }: Props) {
  return (
    <aside className="panel" aria-label={`Details for ${book.title}`}>
      <div className="panel-top">
        <div>
          <h2>{book.title}</h2>
          <p className="byline">{book.authors.join(', ') || 'Unknown author'}</p>
          <p className="muted">
            {[book.year, book.pages && `${book.pages} pages`, book.isbn && `ISBN ${book.isbn}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Put back on the shelf">
          ×
        </button>
      </div>

      <div className="segmented" role="group" aria-label="Show side">
        <button onClick={() => onFace('front')}>Front</button>
        <button onClick={() => onFace('spine')}>Spine</button>
        <button onClick={() => onFace('back')}>Back</button>
      </div>
      <p className="hint">Drag to turn the book · ← → to flip · Esc to put it back</p>

      <label className="field">
        <span>Status</span>
        <select
          className="input"
          value={book.status}
          onChange={(e) => onStatus(e.target.value as ReadingStatus)}
        >
          {Object.entries(STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {book.description && <p className="description">{book.description}</p>}

      <div className="panel-actions">
        <button className="btn" onClick={onClose}>
          Put back
        </button>
        <button
          className="btn danger"
          onClick={() => {
            if (window.confirm(`Remove “${book.title}” from the shelf?`)) onRemove()
          }}
        >
          Remove
        </button>
      </div>
    </aside>
  )
}
