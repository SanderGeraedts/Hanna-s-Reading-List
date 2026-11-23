import { seededHash } from './hash'
import type { Mood } from './creature'

/**
 * The den state machine (T-0032 Design §4): each pet picks a state from a
 * small table with its own seeded random clock. Deterministic per
 * `(petId, session)` so a re-render re-plays, but different between sessions
 * so the den isn't choreographed.
 *
 * Phone (T-0032 Design §2, §3a): everything but `rest` collapses to rest.
 * Reduce motion: the same (no walking).
 */

export type RoamState = 'rest' | 'roam' | 'cushion' | 'toy' | 'pair' | 'sleep'

export interface RoamInput {
  petId: string
  /** per-session seed so two tabs don't choreograph */
  session: number
  phone: boolean
  reduce: boolean
  /** this pet is the current pet: picks cushion more often */
  current: boolean
  /** a toy is placed in the den and no one else holds its lock */
  toyFree: boolean
  /** another pet is resting nearby and free for pair-play */
  pairFree: boolean
  /** the mood of this pet right now */
  mood: Mood | 'happy' | null
  /** on the device's clock, used for sleepy */
  hour: number
}

export interface RoamPick {
  state: RoamState
  /** seconds this state lasts before the next pick (deterministic) */
  secs: number
}

/** Deterministic random in [0, 1) seeded by petId, session and a counter. */
export function roamRandom(petId: string, session: number, counter: number): number {
  return (seededHash(`roam:${petId}:${session}:${counter}`) % 1_000_003) / 1_000_003
}

/**
 * Pick the next state and its duration. Counter is a monotonically increasing
 * step index per pet; two different counters never return the same state in a row.
 */
export function pickRoam(input: RoamInput, counter: number): RoamPick {
  const { phone, reduce, mood } = input
  if (phone || reduce) return { state: 'rest', secs: 2 }
  if (mood === 'missing') {
    // the pet only rests or sits on the cushion (T-0032 Design §7)
    const r = roamRandom(input.petId, input.session, counter)
    return r < 0.7 ? { state: 'rest', secs: 4 + r * 4 } : { state: 'cushion', secs: 7 + r * 5 }
  }
  // sleepy late at night: current pet picks sleep next rest
  if (input.current && mood === 'sleepy' && (input.hour >= 22 || input.hour < 6)) {
    return { state: 'sleep', secs: 20 }
  }
  const r = roamRandom(input.petId, input.session, counter)
  // probabilities add to 1; order: pair, toy, cushion (+ current boost), roam, sleep (rare), rest fill
  const cushion = input.current ? 0.3 : 0.1
  const pair = input.pairFree ? 0.2 : 0
  const toy = input.toyFree ? 0.25 : 0
  // happy mood: extend cushion time
  const happy = mood === 'happy'
  let acc = 0
  if ((acc += pair) > r) return { state: 'pair', secs: 4 + r * 2 }
  if ((acc += toy) > r) return { state: 'toy', secs: 4 + r * 4 }
  if ((acc += cushion) > r) return { state: 'cushion', secs: happy ? 10 + r * 6 : 6 + r * 6 }
  if ((acc += 0.35) > r) return { state: 'roam', secs: 2 + r * 3 }
  // small chance of sleep by the cushion
  if ((acc += 0.05) > r) return { state: 'sleep', secs: 8 + r * 4 }
  return { state: 'rest', secs: 3 + r * 5 }
}

/** Where a pet walks to, inside the walkable rectangle; deterministic per counter. */
export function roamTarget(petId: string, session: number, counter: number): { x: number; z: number } {
  const rx = roamRandom(petId, session, counter * 2 + 1)
  const rz = roamRandom(petId, session, counter * 2 + 2)
  // rectangle x ∈ [−1.0, 1.0], z ∈ [−0.25, 0.9], avoiding the bowl footprint (circle r 0.12 around (0.55, 0.15))
  let x = -1.0 + rx * 2.0
  let z = -0.25 + rz * 1.15
  const dx = x - 0.55
  const dz = z - 0.15
  if (dx * dx + dz * dz < 0.12 * 0.12) {
    // nudge away
    x -= 0.2
  }
  return { x, z }
}

/** Walk speed per species (units per second): hoppers are a touch slower. */
export const WALK = 0.18
export const HOP = 0.14
const HOPPERS = new Set(['adelie-penguin', 'emperor-penguin', 'african-penguin', 'hedgehog', 'axolotl'])
export const isHopper = (species: string) => HOPPERS.has(species)
