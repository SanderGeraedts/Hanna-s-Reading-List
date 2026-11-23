import type { Pet, Stage } from './creature'
import { stageOf } from './creature'
import type { ShopState } from './shop'

/**
 * Tricks a pet has unlocked (T-0032 Design §5b). Driven by the pet's level and
 * stage and the toys she owns; never saved — recomputed from the derived
 * creatures state. The Trick! button in the pet card plays the **newest**
 * unlocked trick on the current pet (surprise factor).
 */

export type TrickId = 'wave' | 'spin' | 'somersault' | 'bow' | `toy:${string}`

export interface Trick {
  id: TrickId
  /** reading order: wave < spin < somersault/bow < toy tricks */
  order: number
  label: string
}

const TOY_IDS = ['ball', 'yarn', 'slide'] as const
export type ToyId = (typeof TOY_IDS)[number]

export const WAVE_FROM = 3
export const SPIN_FROM = 6
export const SOMERSAULT_FROM = 10

/** The tricks a pet has unlocked right now, in the order they were unlocked. */
export function unlockedTricks(pet: Pick<Pet, 'level' | 'stage'>, shop: Pick<ShopState, 'placed' | 'owned'>): Trick[] {
  const out: Trick[] = []
  let order = 0
  if (pet.level >= WAVE_FROM) out.push({ id: 'wave', order: order++, label: 'Wave' })
  if (pet.level >= SPIN_FROM) out.push({ id: 'spin', order: order++, label: 'Spin' })
  if (pet.level >= SOMERSAULT_FROM) out.push({ id: 'somersault', order: order++, label: 'Somersault' })
  // one toy trick per owned toy (D-0033 §13, T-0032 Design §5b)
  for (const toy of TOY_IDS) {
    if (shop.owned.has(toy)) out.push({ id: `toy:${toy}`, order: order++, label: `${toy[0].toUpperCase()}${toy.slice(1)} trick` })
  }
  // Grown-up: a "star" bow trick
  if (pet.stage === 'grown') out.push({ id: 'bow', order: order++, label: 'Bow' })
  return out
}

/** The newest unlocked trick: the one the Trick! button plays. */
export function newestTrick(pet: Pick<Pet, 'level' | 'stage'>, shop: Pick<ShopState, 'placed' | 'owned'>): Trick | null {
  const list = unlockedTricks(pet, shop)
  return list[list.length - 1] ?? null
}

/** The trick unlocked exactly on reaching this level (if any), so a level-up can say so. */
export function trickUnlockedAt(level: number): Trick | null {
  const stage: Stage = stageOf(level)
  if (level === WAVE_FROM) return { id: 'wave', order: 0, label: 'Wave' }
  if (level === SPIN_FROM) return { id: 'spin', order: 1, label: 'Spin' }
  if (level === SOMERSAULT_FROM) return { id: 'somersault', order: 2, label: 'Somersault' }
  if (stage === 'grown' && level === 10) return { id: 'bow', order: 3, label: 'Bow' }
  return null
}
