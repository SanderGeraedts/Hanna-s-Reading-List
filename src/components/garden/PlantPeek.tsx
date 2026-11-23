import type { Plant } from '#/lib/garden/garden'
import { plantLabel } from '#/lib/garden/words'

/**
 * The cover of the book a plant grew from (D-0071 §3): pressing a plant shows
 * it over the garden, with the way into the book. It replaces the little signs
 * that stood beside the plants — one cover when she asks for it, instead of a
 * row of them standing there all the time.
 *
 * The spot button underneath already names the plant and its book, so the card
 * is reached from there; Escape and the × close it.
 */

export interface PlantPeekProps {
  plant: Plant
  /** where the plant stands, as percentages of the stage */
  at: { left: number; top: number }
  onClose: () => void
  onShowBook?: (id: string) => void
}

export function PlantPeek({ plant, at, onClose, onShowBook }: PlantPeekProps) {
  const book = plant.book
  // on the right half of the garden the card opens to the left, so it stays on the stage
  const side = at.left > 55 ? 'left' : 'right'
  return (
    <div className={`garden-peek ${side}`} style={{ left: `${at.left}%`, top: `${at.top}%` }} role="group" aria-label={book.title}>
      {book.coverUrl ? (
        <img className="garden-peek-cover" src={book.coverUrl} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="garden-peek-cover blank" style={{ background: book.color }} aria-hidden />
      )}
      <div className="garden-peek-text">
        <p className="garden-peek-title">{book.title}</p>
        {book.authors?.length > 0 && <p className="small-text muted">{book.authors.join(', ')}</p>}
        <p className="small-text muted">{plantLabel(plant)}</p>
        {onShowBook && (
          <button type="button" className="btn small" onClick={() => onShowBook(book.id)}>
            Open book
          </button>
        )}
      </div>
      <button type="button" className="btn icon small garden-peek-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
    </div>
  )
}
