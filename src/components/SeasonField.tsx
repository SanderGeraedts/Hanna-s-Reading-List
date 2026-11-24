import type { Book } from '#/lib/library'
import { seasonsOf, seasonsPatch } from '#/lib/seasonChallenge'
import { SEASONS, SEASON_ICON, SEASON_LABEL } from '#/lib/garden/seasons'
import type { Season } from '#/lib/garden/seasons'

interface Props {
  book: Book
  onUpdate: (patch: Partial<Book>) => void
}

/**
 * The seasons Hanna says a book is for (#272, D-0072): four toggles under
 * Genres on the Details tab.
 *
 * With none of them on, the app works the season out from the book's genres and
 * tropes, exactly as it always did; with any of them on, hers are the book's
 * seasons and the guess steps aside. The line underneath says which of the two
 * is happening, so the guess is never a secret — that is the whole of #272, in
 * which a Christmas book never came up for winter.
 */
export function SeasonField({ book, onUpdate }: Props) {
  const picked = seasonsOf(book)
  const toggle = (season: Season) =>
    onUpdate(seasonsPatch(picked.includes(season) ? picked.filter((s) => s !== season) : [...picked, season]))

  return (
    <div className="field" role="group" aria-labelledby="season-label">
      <span id="season-label">Season</span>
      <div className="chips">
        {SEASONS.map((season) => (
          <button
            key={season}
            type="button"
            className="format-chip"
            aria-pressed={picked.includes(season)}
            onClick={() => toggle(season)}
          >
            <span aria-hidden>{SEASON_ICON[season]}</span> {SEASON_LABEL[season]}
          </button>
        ))}
      </div>
      <p className="muted small-text">
        {picked.length
          ? `Counts for ${picked.map((s) => SEASON_LABEL[s].toLowerCase()).join(' and ')} only.`
          : 'No season picked: worked out from the genres and tropes.'}
      </p>
    </div>
  )
}
