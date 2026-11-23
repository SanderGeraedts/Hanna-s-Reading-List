import type { Pet } from '#/lib/creatures/creature'
import { displayName, petLine } from '#/lib/creatures/words'
import { Still } from './bits'
import { creatureStill } from './stillPaths'

/**
 * Your pets (T-0030 Design §8): from 2 pets, a radio group "Current pet" in
 * hatch order. Picking a row makes it current at once (the page saves the
 * choice after she stops arrowing).
 */
export function PetsCard({ pets, current, onPick }: { pets: Pet[]; current: string | null; onPick: (pet: Pet) => void }) {
  return (
    <section className="dash-card pets-card" aria-labelledby="pets-title">
      <h2 id="pets-title">
        Your pets <span className="muted">· {pets.length}</span>
      </h2>
      <div className="pets-list" role="radiogroup" aria-label="Current pet">
        {pets.map((p) => (
          <label key={p.id} className={`pet-row${p.id === current ? ' current' : ''}`}>
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
          </label>
        ))}
      </div>
    </section>
  )
}
