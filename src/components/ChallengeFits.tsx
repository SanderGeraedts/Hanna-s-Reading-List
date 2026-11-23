import type { Fit } from '#/lib/challengeFits'

/**
 * "On your shelf" under a challenge (T-0066, from Hanna): up to three books she
 * already owns that would count for it, each with the reason it fits, and a
 * plain line when nothing on her shelf does — so a challenge never simply says
 * nothing. Tapping one opens the book, like every other cover in the app; it
 * never changes the shelf by itself.
 *
 * The A–Z card and the bingo card already suggest in their own way; this is for
 * the challenges that offered nothing at all.
 */

export interface ChallengeFitsProps {
  fits: Fit[]
  /** what to say when `fits` is empty; nothing shows when this is empty too */
  none: string
  onShowBook?: (id: string) => void
}

export function ChallengeFits({ fits, none, onShowBook }: ChallengeFitsProps) {
  if (!fits.length) return none ? <p className="muted small-text challenge-fits-none">{none}</p> : null
  return (
    <div className="challenge-fits">
      <p className="muted small-text">On your shelf</p>
      <ul className="challenge-fits-list">
        {fits.map(({ book, why }) => (
          <li key={book.id}>
            <button
              type="button"
              title={`${book.title} · ${why}`}
              aria-label={`${book.title}, ${why}`}
              onClick={() => onShowBook?.(book.id)}
              disabled={!onShowBook}
            >
              {book.coverUrl ? (
                <img src={book.coverUrl} alt="" loading="lazy" />
              ) : (
                <span className="cover-chip" style={{ background: book.color }} />
              )}
              <span className="challenge-fits-why">{why}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
