import type { DenSlot } from './shop'
import { BOWL_SPOT, DEN_SPOTS, seatYOf } from '#/components/creatures/shopModels'

/**
 * What a roaming pet may walk into, and what it may walk on (T-0050, D-0043).
 *
 * T-0032 built the den's roaming with "no path finding, no collisions", and the
 * one avoidance it had was a circle around a bowl that T-0031 had already moved
 * somewhere else. So a pet walked straight through the furniture — most of all
 * through its own bed, which is a dome in the middle of the floor as wide as
 * half the room, and its legs disappeared into it (Hanna, 2026-11-23).
 *
 * Every placed prop now has a **footprint**: a circle on the floor a pet keeps
 * out of, with a clearance of a fifth of its own height. The **bed** is the one
 * exception (D-0043 §3): a pet's bed is furniture it stands on, so its height
 * under the pet follows the bed's own top — it climbs on and off instead of
 * walking through. Pure arithmetic: nothing is drawn, so the den's budget
 * (T-0031 §10) cannot move.
 */

/** A circle on the den's floor: the middle and how far it reaches. */
export interface Footprint {
  x: number
  z: number
  r: number
}

/** The den's floor, where a roaming pet stands (T-0032 Design §3). */
export const FLOOR_Y = 0.01

/**
 * How far each prop reaches on the floor, from its own model's bounding box,
 * rounded up (D-0043 §1). `denProps.test.ts` re-measures every one of them
 * against `buildDenItem`, so a changed or a new shop item cannot drift out of
 * this table.
 */
export const PROP_RADIUS: Record<string, number> = {
  // beds
  'cloud-cushion': 0.55,
  'basket-bed': 0.63,
  // toys
  ball: 0.14,
  yarn: 0.27,
  slide: 0.25,
  // the left corner
  'potted-plant': 0.21,
  'mini-bookcase': 0.24,
  // the right corner
  'book-tower': 0.18,
  'reading-lamp': 0.41,
}

/** T-0029's gold cushion: what stands in the bed spot when she placed no bed of her own. */
export const GOLD_CUSHION_RADIUS = 0.55
/** The wooden food bowl beside the bed. */
export const BOWL_RADIUS = 0.17

/** Flat on the floor (the rug) or up on the wall: nothing to walk into. */
const NO_FOOTPRINT: readonly DenSlot[] = ['rug', 'wall']

/** How wide the bed in this den reaches. */
export const bedRadiusOf = (bed?: string | null) => (bed && PROP_RADIUS[bed] !== undefined ? PROP_RADIUS[bed] : GOLD_CUSHION_RADIUS)

/** The bed: how wide it is and how high a pet sits on it. */
export interface BedFootprint extends Footprint {
  /** `seatYOf(bed)`: where a pet sits when it is on the middle of the bed. */
  seat: number
}

export interface DenFootprints {
  /** props a pet walks around */
  hard: Footprint[]
  /** the bed, which a pet walks on */
  bed: BedFootprint
}

/**
 * The footprints of this den: what she placed, at the spot the den draws it
 * (`DEN_SPOTS`, `BOWL_SPOT`), plus the food bowl, which is always there.
 */
export function denFootprints(placed: Partial<Record<DenSlot, string>> = {}): DenFootprints {
  const hard: Footprint[] = [{ x: BOWL_SPOT[0], z: BOWL_SPOT[2], r: BOWL_RADIUS }]
  for (const slot of ['toy', 'left', 'right'] as const) {
    const id = placed[slot]
    if (!id || NO_FOOTPRINT.includes(slot)) continue
    const r = PROP_RADIUS[id]
    if (r === undefined) continue
    const spot = DEN_SPOTS[slot]
    hard.push({ x: spot[0], z: spot[2], r })
  }
  const bedSpot = DEN_SPOTS.bed
  return { hard, bed: { x: bedSpot[0], z: bedSpot[2], r: bedRadiusOf(placed.bed), seat: seatYOf(placed.bed) } }
}

/**
 * How far a pet of this height keeps its middle clear of a footprint (D-0043 §2):
 * a fifth of its height — what it takes for the lower body, the part that
 * disappeared into the cushion, to clear the dome of a prop it stands beside.
 */
export const clearanceFor = (height: number) => height * 0.2

/** A rectangle a pet may walk in: |x| ≤ `x`, z ∈ [`zMin`, `zMax`]. */
export interface Rect {
  x: number
  zMin: number
  zMax: number
}

const dist = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz)

/** The first footprint this point is inside of (with the pet's clearance), or null. */
export function insideAny(x: number, z: number, props: readonly Footprint[], clear: number): Footprint | null {
  for (const p of props) if (dist(x, z, p.x, p.z) < p.r + clear - 1e-9) return p
  return null
}

export const inRect = (x: number, z: number, rect: Rect) => Math.abs(x) <= rect.x + 1e-9 && z >= rect.zMin - 1e-9 && z <= rect.zMax + 1e-9

const clampRect = (x: number, z: number, rect: Rect) => ({
  x: Math.max(-rect.x, Math.min(rect.x, x)),
  z: Math.max(rect.zMin, Math.min(rect.zMax, z)),
})

/**
 * Where two keep-out circles cross. Two props close enough together to overlap —
 * the bed and the food bowl, say — make a point pushed out of one land inside the
 * other, for ever; the only clear ground near them is where their edges meet.
 */
function crossings(a: Footprint, b: Footprint, clear: number): Array<{ x: number; z: number }> {
  const ra = a.r + clear
  const rb = b.r + clear
  const d = dist(a.x, a.z, b.x, b.z)
  if (d < 1e-6 || d > ra + rb || d < Math.abs(ra - rb)) return []
  const t = (ra * ra - rb * rb + d * d) / (2 * d)
  const h2 = ra * ra - t * t
  if (h2 < 0) return []
  const h = Math.sqrt(h2)
  const ux = (b.x - a.x) / d
  const uz = (b.z - a.z) / d
  const mx = a.x + ux * t
  const mz = a.z + uz * t
  return [
    { x: mx - uz * h, z: mz + ux * h },
    { x: mx + uz * h, z: mz - ux * h },
  ]
}

/**
 * Push a point out to the edge of every footprint it is inside of, moving it at
 * most `limit` in total (so a pet that a new prop lands on is eased out at
 * walking speed rather than teleported, D-0043 §2).
 */
export function pushOutOf(x: number, z: number, props: readonly Footprint[], clear: number, limit = Infinity): { x: number; z: number } {
  let px = x
  let pz = z
  for (let pass = 0; pass < 4; pass++) {
    let moved = false
    for (const p of props) {
      const need = p.r + clear
      const d = dist(px, pz, p.x, p.z)
      if (d >= need - 1e-9) continue
      // dead centre: a deterministic way out, so the walk still replays
      const ux = d < 1e-6 ? 1 : (px - p.x) / d
      const uz = d < 1e-6 ? 0 : (pz - p.z) / d
      px = p.x + ux * need
      pz = p.z + uz * need
      moved = true
    }
    if (!moved) break
  }
  if (insideAny(px, pz, props, clear)) {
    // two props overlap here: the nearest clear ground is where their edges meet
    let best: { x: number; z: number } | null = null
    let bestD = Infinity
    for (let i = 0; i < props.length; i++) {
      for (let j = i + 1; j < props.length; j++) {
        for (const c of crossings(props[i], props[j], clear)) {
          if (insideAny(c.x, c.z, props, clear)) continue
          const d = dist(c.x, c.z, x, z)
          if (d < bestD) {
            bestD = d
            best = c
          }
        }
      }
    }
    if (best) {
      px = best.x
      pz = best.z
    }
  }
  if (limit !== Infinity) {
    const d = dist(px, pz, x, z)
    if (d > limit && d > 1e-9) {
      px = x + ((px - x) / d) * limit
      pz = z + ((pz - z) / d) * limit
    }
  }
  return { x: px, z: pz }
}

/**
 * Repair a seeded roam target so the pet can actually stand on it: outside every
 * footprint and inside its patch. Repairing rather than re-rolling keeps the walk
 * deterministic per `(petId, session)`, which T-0032 and T-0046 both rest on.
 */
export function clearTarget(x: number, z: number, props: readonly Footprint[], clear: number, rect: Rect): { x: number; z: number } {
  let p = clampRect(x, z, rect)
  for (let i = 0; i < 6; i++) {
    const out = pushOutOf(p.x, p.z, props, clear)
    const back = clampRect(out.x, out.z, rect)
    if (Math.abs(back.x - p.x) < 1e-9 && Math.abs(back.z - p.z) < 1e-9) break
    p = back
  }
  if (!insideAny(p.x, p.z, props, clear)) return p
  // the corner it was clamped into is itself covered: walk round the prop it is in
  const hit = insideAny(p.x, p.z, props, clear)!
  const need = hit.r + clear
  const from = Math.atan2(p.z - hit.z, p.x - hit.x)
  for (let i = 1; i <= 24; i++) {
    for (const s of [1, -1]) {
      const a = from + s * ((i / 24) * Math.PI)
      const cx = hit.x + Math.cos(a) * need
      const cz = hit.z + Math.sin(a) * need
      if (inRect(cx, cz, rect) && !insideAny(cx, cz, props, clear)) return { x: cx, z: cz }
    }
  }
  return p
}

/**
 * Push a target off the bed when there is still floor inside the patch to push it
 * to (D-0043 §5). On a computer that always holds, so the pet goes and sits on the
 * rug beside its bed; on the phone's small patch it may end a stroll on the
 * cushion's rim — standing on it, never in it.
 */
export function offBed(x: number, z: number, bed: Footprint, clear: number, props: readonly Footprint[], rect: Rect): { x: number; z: number } {
  const need = bed.r + clear
  const d = dist(x, z, bed.x, bed.z)
  if (d >= need - 1e-9) return { x, z }
  const from = d < 1e-6 ? 0 : Math.atan2(z - bed.z, x - bed.x)
  for (let i = 0; i <= 24; i++) {
    for (const s of i === 0 ? [1] : [1, -1]) {
      const a = from + s * ((i / 24) * Math.PI)
      const cx = bed.x + Math.cos(a) * need
      const cz = bed.z + Math.sin(a) * need
      if (inRect(cx, cz, rect) && !insideAny(cx, cz, props, clear)) return { x: cx, z: cz }
    }
  }
  return { x, z }
}

/**
 * One step of a walk from `from` toward `to`, at most `step` long, that never
 * enters a footprint: a step that would walk into one slides along its edge
 * instead, which is the arc an animal walks round a chair (D-0043 §2).
 */
export function stepAround(
  from: { x: number; z: number },
  to: { x: number; z: number },
  step: number,
  props: readonly Footprint[],
  clear: number,
): { x: number; z: number } {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const d = Math.hypot(dx, dz)
  if (d < 1e-9 || step <= 0) return { x: from.x, z: from.z }
  const go = Math.min(step, d)
  const straight = { x: from.x + (dx / d) * go, z: from.z + (dz / d) * go }
  const hit = insideAny(straight.x, straight.z, props, clear)
  if (!hit) return straight
  // slide round the prop it would have walked into, the short way toward the target
  const need = hit.r + clear
  const here = Math.atan2(from.z - hit.z, from.x - hit.x)
  const want = Math.atan2(to.z - hit.z, to.x - hit.x)
  let turn = want - here
  while (turn > Math.PI) turn -= Math.PI * 2
  while (turn < -Math.PI) turn += Math.PI * 2
  const by = Math.min(Math.abs(turn), go / need) * Math.sign(turn || 1)
  const a = here + by
  const slid = { x: hit.x + Math.cos(a) * need, z: hit.z + Math.sin(a) * need }
  const free = pushOutOf(slid.x, slid.z, props, clear)
  // two props side by side can leave no way through: the pet waits at the gap rather than
  // jumping to the other side of them. Its state runs out in a few seconds and it tries elsewhere.
  if (Math.hypot(free.x - from.x, free.z - from.z) > go * 2) return { x: from.x, z: from.z }
  return free
}

/**
 * How high the bed is under a pet whose middle is `d` from the middle of the bed
 * (D-0043 §3): the full seat over the middle third, the floor at and beyond the
 * rim, and a smooth slope between — so the pet climbs onto its cushion and down
 * off it again, and `cushion` and `sleep`, whose target is the middle, still seat
 * it at `seatYOf(bed)` exactly.
 */
export function bedTopAt(d: number, seat: number, bedR: number, floor = FLOOR_Y): number {
  const inner = bedR * 0.35
  if (d <= inner) return seat
  if (d >= bedR) return floor
  const k = (bedR - d) / (bedR - inner)
  return floor + (seat - floor) * (0.5 - 0.5 * Math.cos(k * Math.PI))
}
