import type * as THREE from 'three'
import { SPECIES } from '#/lib/creatures/species'
import type { SpeciesId } from '#/lib/creatures/species'
import { buildCreature } from '../model'
import type { CreatureModel, CreatureOptions } from '../model'

/**
 * Every creature model in this folder, found by file name so a new model file
 * needs no change here: `<id>.ts` exporting `build<Name>` and `<name>: CreatureModel`.
 */
export const MODEL_FILES = import.meta.glob<Record<string, unknown>>(['./*.ts', '!./index.ts', '!./*.test.ts'], {
  eager: true,
})

function isModel(x: unknown): x is CreatureModel {
  return typeof x === 'object' && x !== null && typeof (x as CreatureModel).build === 'function' && 'id' in x
}

const found = new Map<SpeciesId, CreatureModel>()
for (const mod of Object.values(MODEL_FILES)) {
  for (const value of Object.values(mod)) if (isModel(value)) found.set(value.id, value)
}

/** The models that exist, in species order (commons first). */
export const CREATURE_MODELS: readonly CreatureModel[] = SPECIES.flatMap((s) => {
  const m = found.get(s.id)
  return m ? [m] : []
})

export function modelFor(id: SpeciesId): CreatureModel | undefined {
  return found.get(id)
}

/** The only way the app gets a creature: default palette, build, stage, low-quality drop, merge. */
export function makeCreature(id: SpeciesId, opts: CreatureOptions = {}): THREE.Group {
  const model = found.get(id)
  if (!model) throw new Error(`No model for creature ${id} yet`)
  return buildCreature(model, opts)
}
