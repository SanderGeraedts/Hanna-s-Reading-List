import type { Creatures } from '#/lib/creatures/creature'
import { EggName, eggName, eggReason, nextEggLine, speciesWord } from '#/lib/creatures/words'
import { Still } from './bits'
import { creatureStill, eggStill } from './stillPaths'

/**
 * The Eggs card (T-0030 Design §2): a duplicate waiting for her choice, the
 * oldest egg with Hatch and the ones after it, or the next-egg line.
 */
export function EggsCard({
  c,
  headingRef,
  busy,
  onHatch,
  onChoose,
}: {
  c: Creatures
  headingRef: React.RefObject<HTMLHeadingElement | null>
  /** a hatch is playing: no Hatch button meanwhile */
  busy: boolean
  onHatch: () => void
  onChoose: (egg: string) => void
}) {
  const dup = c.waiting[0]
  const egg = c.eggs[0]
  const rest = c.eggs.slice(1)
  return (
    <section className="dash-card eggs-card" aria-labelledby="eggs-title">
      <h2 id="eggs-title" ref={headingRef} tabIndex={-1}>
        Eggs
      </h2>
      {dup && !busy && (
        <div className="eggs-row">
          <span className="eggs-tile">
            <Still src={creatureStill(dup.species, 'baby')} size={96} />
          </span>
          <div className="eggs-info">
            <p>
              <strong>Your new {speciesWord(dup.species)} is waiting</strong>
            </p>
            <div className="chips">
              <button type="button" className="btn primary" aria-label={`Choose for your new ${speciesWord(dup.species)}`} onClick={() => onChoose(dup.egg)}>
                Choose
              </button>
            </div>
          </div>
        </div>
      )}
      {egg && (
        <div className="eggs-row">
          <span className="eggs-tile">
            <Still src={eggStill(egg.tier)} size={96} />
          </span>
          <div className="eggs-info">
            <p>
              <strong>{EggName(egg.tier)}</strong>
            </p>
            <p className="muted small-text">{eggReason(egg)}</p>
            {!busy && (
              <div className="chips">
                <button type="button" className="btn primary" aria-label={`Hatch the ${egg.tier} egg`} onClick={onHatch}>
                  Hatch
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {rest.length > 0 && (
        <div className="eggs-then">
          <span className="small-text muted">Then:</span>
          <ul className="eggs-small">
            {rest.slice(0, 5).map((e) => (
              <li key={e.id}>
                <Still src={eggStill(e.tier)} size={40} />
                <span className="visually-hidden">{eggName(e.tier)}</span>
              </li>
            ))}
            {rest.length > 5 && <li className="small-text muted">+{rest.length - 5}</li>}
          </ul>
        </div>
      )}
      {!egg && !dup && (c.next ? <p className="next-egg">🥚 {nextEggLine(c.next)}</p> : <p className="muted small-text">No eggs waiting.</p>)}
    </section>
  )
}
