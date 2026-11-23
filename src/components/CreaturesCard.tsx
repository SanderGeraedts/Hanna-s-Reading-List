import { useEffect, useState } from 'react'
import type { Creatures } from '#/lib/creatures/creature'
import { EGG_DESCRIPTION, displayName, eggsWaitingShort, levelLine, moodLine, nextEggLine, nextLine, stillDescription } from '#/lib/creatures/words'
import { CookiePill, FeedButton, GrowthBar, useSay } from './creatures/parts'
import { usePhone, webglAvailable } from './creatures/pose'
import { CreatureStill } from './creatures/CreatureStill'
import { SceneBoundary } from './creatures/SceneBoundary'
import { OpenLink } from './OpenLink'

/**
 * The dashboard block "Creatures" (T-0029 Design §8): a small still picture
 * of her creature, its name, level and growth bar, the next level, the mood
 * line and the food bowl with Feed; before the hatch the welcome egg with
 * Hatch. Open › goes to the Creatures tab. The picture never moves.
 */

interface Props {
  c: Creatures
  onFeed: () => { say: string; levelUp: boolean } | null
  onOpen?: () => void
  onHatch?: () => void
  /** Hatch for a milestone egg (T-0030): the oldest egg, in the Creatures tab */
  onHatchMilestone?: () => void
}

export function CreaturesCard({ c, onFeed, onOpen, onHatch, onHatchMilestone }: Props) {
  const phone = usePhone()
  const [gl, setGl] = useState(false)
  useEffect(() => setGl(webglAvailable()), [])
  const [said, say] = useSay()
  const pet = c.pet
  const mood = pet ? moodLine(pet.name, pet.mood) : null
  return (
    <section className="dash-card creatures-card" aria-labelledby="creatures-title">
      <div className="dash-card-head">
        <h2 id="creatures-title">Creatures</h2>
        <OpenLink onOpen={onOpen} label="Creatures" />
      </div>
      <div className="creatures-row">
        <div className="still-tile">
          {gl && (
            <SceneBoundary onFail={() => setGl(false)}>
              <CreatureStill
                phone={phone}
                shows={pet ? { kind: 'creature', species: pet.species, shiny: pet.shiny, stage: pet.stage, mood: pet.mood } : { kind: 'egg' }}
              />
            </SceneBoundary>
          )}
          <p className="visually-hidden">{pet ? stillDescription(pet) : EGG_DESCRIPTION}</p>
        </div>
        {pet ? (
          <div className="creatures-info">
            <p className="creatures-name">
              <strong>{displayName(pet)}</strong>
            </p>
            <p className="small-text creatures-level">{levelLine(pet)}</p>
            <GrowthBar pet={pet} />
            <p className="small-text">{nextLine(pet)}</p>
            {mood && <p className="small-text">{mood}</p>}
            {c.eggs.length > 0 ? (
              <p className="small-text">🥚 {eggsWaitingShort(c.eggs)}</p>
            ) : (
              c.next && <p className="small-text">🥚 {nextEggLine(c.next)}</p>
            )}
            <div className="food-bowl">
              <CookiePill n={c.balance} />
              <FeedButton
                name={pet.name}
                balance={c.balance}
                onFeed={() => {
                  const r = onFeed()
                  if (r) say(r.say)
                }}
              />
              {c.eggs.length > 0 && onHatchMilestone && (
                <button
                  type="button"
                  className="btn"
                  aria-label={c.eggs.length === 1 ? `Hatch the ${c.eggs[0].tier} egg` : 'Hatch the oldest egg'}
                  onClick={onHatchMilestone}
                >
                  Hatch
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="creatures-info">
            <p className="creatures-name">
              <strong>A welcome egg</strong>
            </p>
            <div className="chips">
              <button type="button" className="btn primary" onClick={onHatch}>
                Hatch
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {said}
      </p>
    </section>
  )
}
