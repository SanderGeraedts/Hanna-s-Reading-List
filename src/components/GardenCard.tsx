import type { Garden } from '#/lib/garden/garden'
import { startYear, yearOf } from '#/lib/garden/garden'
import { countLine, gardenSentence, nextLine, seasonChip } from '#/lib/garden/words'
import { GardenFlat } from './garden/GardenFlat'
import { useReducedMotion } from './creatures/pose'
import { OpenLink } from './OpenLink'

/**
 * The dashboard block "Garden" (T-0065): a small flat drawing of this year's
 * garden, how many plants it has and how many are in bloom, the season and what
 * is next to unlock. Open › goes to the Garden tab. Always the flat drawing,
 * never 3D: a block is not a scene.
 */

export function GardenCard({ garden, onOpen }: { garden: Garden; onOpen?: () => void }) {
  const reduce = useReducedMotion()
  const year = yearOf(garden, startYear(garden))
  if (!year) return null
  return (
    <section className="dash-card garden-block" aria-labelledby="garden-title">
      <div className="dash-card-head">
        <h2 id="garden-title">Garden</h2>
        <OpenLink onOpen={onOpen} label="Garden" />
      </div>
      <div className="garden-block-stage">
        <GardenFlat year={year} season={garden.season} compact reduce={reduce} />
      </div>
      <p className="visually-hidden">{gardenSentence(year, garden.season)}</p>
      <p className="garden-counts">
        <span className="garden-season">{seasonChip(garden.season)}</span> <span>{countLine(year)}</span>
      </p>
      <p className="small-text garden-next">{nextLine(garden)}</p>
    </section>
  )
}
