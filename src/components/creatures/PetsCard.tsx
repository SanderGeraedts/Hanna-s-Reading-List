import type { Pet } from '#/lib/creatures/creature'
import { displayName, petLine } from '#/lib/creatures/words'
import { Still } from './bits'
import { creatureStill } from './stillPaths'

/**
 * Your pets (T-0030 Design §8): from 2 pets, a radio group "Current pet" in
 * hatch order. Picking a row makes it current at once (the page saves the
 * choice after she stops arrowing). T-0033 §8b: each row also has
 * "Put on the shelf ✨" / "Take off the shelf".
 */
export function PetsCard({
  pets,
  current,
  shelfPetId = null,
  onPick,
  onShelf,
}: {
  pets: Pet[]
  current: string | null
  shelfPetId?: string | null
  onPick: (pet: Pet) => void
  onShelf?: (pet: Pet | null) => void
}) {
  return (
    <section className="dash-card pets-card" aria-labelledby="pets-title">
      <h2 id="pets-title">
        Your pets <span className="muted">· {pets.length}</span>
      </h2>
      <div className="pets-list" role="radiogroup" aria-label="Current pet">
        {pets.map((p) => {
          const onShelfRow = p.id === shelfPetId
          return (
            <label key={p.id} className={`pet-row${p.id === current ? ' current' : ''}${onShelfRow ? ' on-shelf' : ''}`}>
              <input
                type="radio"
                name="current-pet"
                className="visually-hidden"
                value={p.id}
                checked={p.id === current}
                onChange={() => onPick(p)}
              />
              <span className="pet-tile">
                <Still src={creatureStill(p.species, p.stage, p.shiny)} size={48} />
              </span>
              <span className="pet-text">
                <span className="pet-name">{displayName(p)}</span>
                <span className="pet-line">{petLine(p)}</span>
              </span>
              {p.id === current && <span className="pet-chip">Current</span>}
              {onShelfRow && <span className="pet-chip shelf-chip">On the shelf</span>}
              {onShelf && (
                <button
                  type="button"
                  className="btn small shelf-btn"
                  aria-label={onShelfRow ? `Take ${p.name} off the shelf` : `Put ${p.name} on the shelf`}
                  onClick={(e) => {
                    e.preventDefault()
                    onShelf(onShelfRow ? null : p)
                  }}
                >
                  {onShelfRow ? 'Take off the shelf' : 'Put on the shelf ✨'}
                </button>
              )}
            </label>
          )
        })}
      </div>
    </section>
  )
}
