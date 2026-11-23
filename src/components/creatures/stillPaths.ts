import { SPECIES, TIERS } from '#/lib/creatures/species'
import type { SpeciesId, Tier } from '#/lib/creatures/species'
import type { Stage } from '#/lib/creatures/creature'

/** Where the pre-rendered still pictures live (T-0030 Design §1), made by `pnpm run render:creatures`. */

export const STILL_SIZE = 192
export const STAGES: readonly Stage[] = ['baby', 'young', 'grown']

export const creatureStill = (species: SpeciesId, stage: Stage, shiny = false) => `/creatures/${species}-${stage}${shiny ? '-shiny' : ''}.webp`
export const eggStill = (tier: Tier) => `/creatures/egg-${tier.replace(' ', '-')}.webp`

/** Every picture's file name (without the folder), in a fixed order: 120 creatures and 6 eggs. */
export function stillNames(): string[] {
  const out: string[] = []
  for (const s of SPECIES) for (const stage of STAGES) for (const shiny of [false, true]) out.push(creatureStill(s.id, stage, shiny).slice('/creatures/'.length))
  for (const t of TIERS) out.push(eggStill(t).slice('/creatures/'.length))
  return out
}
