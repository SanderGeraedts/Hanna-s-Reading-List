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

/**
 * The current pet's own clock (T-0046 Design §2, D-0040). The pet on the cushion
 * roams too now: freely on a computer, and on a phone a short slow wander now and
 * then with long rests between. With reduce motion it never leaves the cushion.
 *
 * Toys and pair-play stay with `WalkingPets` (D-0040 guidance): they hold locks
 * written for the small, distant pets, and the current pet is drawn large and close.
 */
export function pickCurrentRoam(input: RoamInput, counter: number): RoamPick {
  const { phone, reduce, mood } = input
  // reduce motion: the cushion, always (D-0040 §4)
  if (reduce) return { state: 'cushion', secs: 60 }
  const r = roamRandom(input.petId, input.session, counter)
  // missing-you: never wanders off (T-0032 Design §7)
  if (mood === 'missing') {
    return r < 0.7 ? { state: 'rest', secs: 4 + r * 4 } : { state: 'cushion', secs: 7 + r * 5 }
  }
  // sleepy late at night: sleep, on the cushion (T-0029/T-0032)
  if (mood === 'sleepy' && (input.hour >= 22 || input.hour < 6)) return { state: 'sleep', secs: 20 }
  if (phone) {
    // gently and sparingly: a short wander in a fifth of the picks, then a long sit —
    // where it strolled to, or back on the cushion
    if (r < GENTLE_SHARE) return { state: 'roam', secs: 2.5 + r * 7.5 }
    if (r < 0.55) return { state: 'rest', secs: 7 + r * 5 }
    return { state: 'cushion', secs: 7 + r * 5 }
  }
  // a computer: the other pets' table with the current pet's cushion boost, without toy and pair
  return pickRoam({ ...input, phone: false, current: true, toyFree: false, pairFree: false }, counter)
}

/** The share of the phone's picks that may be a wander, and the longest one (D-0040 §3). */
export const GENTLE_SHARE = 0.2
export const GENTLE_MAX_SECS = 4

/** A rectangle a pet may walk in: |x| ≤ `x`, z ∈ [`zMin`, `zMax`]. */
export interface RoamRange {
  x: number
  zMin: number
  zMax: number
}
/** The den's floor for her other pets (T-0032 Design §3). */
export const ROAM_RANGE: RoamRange = { x: 1.0, zMin: -0.25, zMax: 0.9 }
/**
 * The current pet is drawn much larger, so it keeps to the middle of the room
 * (T-0046 §3, widened by T-0050 §4). The old ±0.6 × (−0.2 … 0.5) lay almost
 * entirely inside the bed's own footprint, so the pet had nowhere legal to
 * stand; this leaves a ring of rug round the bed on every side and still shows
 * the whole pet at 16:10 (`denProps.test.ts` checks that against `denCamera`).
 */
export const CURRENT_RANGE: RoamRange = { x: 0.95, zMin: -0.25, zMax: 0.3 }
/**
 * The phone's small patch around the cushion: never out of frame, never past the
 * bowl. Widened by 0.2 in x (T-0050 §4) so one stroll — D-0040 §3 caps it at 4 s,
 * and 0.08 u/s makes that 0.32 units — carries the pet from the middle of its
 * cushion down onto the rim and the rug beside it, instead of stopping halfway up
 * the slope. D-0040 §3's own numbers are untouched.
 */
export const GENTLE_RANGE: RoamRange = { x: 0.5, zMin: -0.15, zMax: 0.35 }

/**
 * Where a pet walks to, inside its walkable rectangle; deterministic per counter.
 * The target is only seeded here: the caller repairs it against the den's props
 * with `clearTarget` (D-0043), which is why this no longer carries a hard-coded
 * bowl circle of its own — the one it used to carry pointed at the bowl's
 * pre-T-0031 spot and so avoided an empty patch of rug.
 */
export function roamTarget(petId: string, session: number, counter: number, range: RoamRange = ROAM_RANGE): { x: number; z: number } {
  const rx = roamRandom(petId, session, counter * 2 + 1)
  const rz = roamRandom(petId, session, counter * 2 + 2)
  const x = -range.x + rx * range.x * 2
  const z = range.zMin + rz * (range.zMax - range.zMin)
  return { x, z }
}

/**
 * The phone's short stroll target: a spot to one side of the cushion, inside the
 * small patch, but far enough away that the stroll reads as a stroll (T-0046 §3).
 */
export function gentleTarget(petId: string, session: number, counter: number): { x: number; z: number } {
  const rx = roamRandom(petId, session, counter * 2 + 1)
  const rz = roamRandom(petId, session, counter * 2 + 2)
  const side = rx < 0.5 ? -1 : 1
  const x = side * (0.3 + (rx % 0.5) * 0.4)
  const z = GENTLE_RANGE.zMin + rz * (GENTLE_RANGE.zMax - GENTLE_RANGE.zMin)
  return { x, z }
}

/** Walk speed per species (units per second): hoppers are a touch slower. */
export const WALK = 0.18
export const HOP = 0.14
/** The phone's amble: less than half the computer's walk (D-0040 §3). */
export const GENTLE_WALK = 0.08
const HOPPERS = new Set(['adelie-penguin', 'emperor-penguin', 'african-penguin', 'hedgehog', 'axolotl'])
export const isHopper = (species: string) => HOPPERS.has(species)
