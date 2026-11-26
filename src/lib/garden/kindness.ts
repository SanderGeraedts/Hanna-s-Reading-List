import type { ChoiceEvent } from '../creatures/choices'
import { SETTING_KINDS } from '../creatures/choices'
import { isDay } from '../creatures/days'

/**
 * Small kindnesses (D-0083 §3): watering a plant, scattering seed for the
 * birds, sweeping the path. Each one gives the garden a little something for
 * the day — a plant comes into flower, a bird comes down, a butterfly follows
 * the swept path.
 *
 * **They are never needed and never a chore.** Nothing wilts, nothing dies
 * (D-0050), there is no streak, no count kept, no reminder and no nag. A month
 * of not touching them costs exactly nothing: the garden tomorrow is the same
 * garden whether she watered today or not. The gift lasts the day and then
 * quietly goes, the way a sunny afternoon does.
 *
 * **What is saved.** A kindness rides in the creatures choice log (D-0034) as
 * a `place` event, exactly the way a swapped bingo square does (D-0067,
 * `bingoSwap.ts`), through the route that is already live: no change in
 * `deploy/nas/`, no new field and nothing waiting for Sander (D-0052 §1).
 *
 * The key is `g:k:<kindness>` and the day it was done is in `day`. `place` is
 * a setting kind, so `mergeLogs` keeps only the newest event per key — which
 * means **the log holds at most one event per kindness, for ever**, three in
 * all, however many years she waters for. It never grows.
 *
 * The keys begin `g:k:`, so they can never collide with the garden's own
 * `g:i:` and `g:p:` keys (D-0052 §2), bingo's `b:` (D-0067), the den's
 * `home:`, or the marks `f:seen` (D-0079) and `c:earned`.
 */

export type KindnessId = 'water' | 'seed' | 'sweep'

export interface KindnessSpec {
  readonly id: KindnessId
  /** the button before it is done */
  readonly name: string
  /** the button once it is done today */
  readonly done: string
  /** what the live region says when she does it */
  readonly say: string
  /** what it gives the garden today */
  readonly gift: Readonly<{ bloom?: number; birds?: number; butterflies?: number }>
}

export const KINDNESSES: readonly KindnessSpec[] = [
  {
    id: 'water',
    name: '💧 Water a plant',
    done: '💧 Watered today',
    say: 'Watered. One plant has come into flower.',
    gift: { bloom: 1 },
  },
  {
    id: 'seed',
    name: '🌾 Scatter seed',
    done: '🌾 Seed scattered today',
    say: 'Seed scattered. A bird has come down for it.',
    gift: { birds: 1 },
  },
  {
    id: 'sweep',
    name: '🧹 Sweep the path',
    done: '🧹 Path swept today',
    say: 'The path is swept. A butterfly is following it.',
    gift: { butterflies: 1 },
  },
]

export const KINDNESS_IDS: readonly KindnessId[] = KINDNESSES.map((k) => k.id)

export const kindnessSpec = (id: KindnessId): KindnessSpec => KINDNESSES.find((k) => k.id === id) ?? KINDNESSES[0]

export const isKindnessId = (x: unknown): x is KindnessId => typeof x === 'string' && (KINDNESS_IDS as readonly string[]).includes(x)

/** The key prefix the garden's kindnesses live under; nothing else may use it. */
export const KINDNESS_KEY_PREFIX = 'g:k:'

export const kindnessKey = (id: KindnessId) => `${KINDNESS_KEY_PREFIX}${id}`

/** The `place` event body for a kindness done on a day (the caller adds id and at). */
export const kindnessEvent = (id: KindnessId, day: string) => ({ kind: 'place', key: kindnessKey(id), day }) as const

const newer = (a: ChoiceEvent, b: ChoiceEvent) => a.at > b.at || (a.at === b.at && a.id > b.id)

/**
 * The newest `place` event per `g:k:` key, as the server and the device both
 * read it (D-0034 §1), as kindness → the day it was last done. A log read from
 * storage can hold anything at all, so every field is checked.
 */
export function kindnessDays(log: readonly ChoiceEvent[]): Map<KindnessId, string> {
  const best = new Map<KindnessId, ChoiceEvent>()
  for (const e of log) {
    if (!e || typeof e !== 'object' || e.kind !== 'place' || !SETTING_KINDS.includes(e.kind)) continue
    const key = (e as { key?: unknown }).key
    if (typeof key !== 'string' || !key.startsWith(KINDNESS_KEY_PREFIX)) continue
    const id = key.slice(KINDNESS_KEY_PREFIX.length)
    if (!isKindnessId(id)) continue
    const day = (e as { day?: unknown }).day
    if (typeof day !== 'string' || !isDay(day)) continue
    const had = best.get(id)
    if (!had || newer(e, had)) best.set(id, e)
  }
  return new Map([...best].map(([id, e]) => [id, (e as unknown as { day: string }).day]))
}

/** The kindnesses already done today. Doing one again today changes nothing. */
export function doneToday(log: readonly ChoiceEvent[], today: string): Set<KindnessId> {
  const out = new Set<KindnessId>()
  for (const [id, day] of kindnessDays(log)) if (day === today) out.add(id)
  return out
}

export interface KindnessGifts {
  /** plants that flower today who otherwise would not */
  bloom: number
  birds: number
  butterflies: number
}

export const NO_GIFTS: KindnessGifts = { bloom: 0, birds: 0, butterflies: 0 }

/**
 * What today's kindnesses give the garden. Only today's count: yesterday's
 * watering is simply over, and that is the point — nothing has to be kept up.
 */
export function kindnessGifts(log: readonly ChoiceEvent[], today: string): KindnessGifts {
  const done = doneToday(log, today)
  const out: KindnessGifts = { ...NO_GIFTS }
  for (const id of done) {
    const { gift } = kindnessSpec(id)
    out.bloom += gift.bloom ?? 0
    out.birds += gift.birds ?? 0
    out.butterflies += gift.butterflies ?? 0
  }
  return out
}

export type KindnessDone = { ok: true; event: ReturnType<typeof kindnessEvent>; say: string } | { ok: false; why: 'already' }

/**
 * Doing a kindness. Already done today: nothing is saved and nothing is said
 * — never a telling-off, simply nothing to do. There is no way to fail at this
 * and no way to fall behind at it.
 */
export function doKindness(log: readonly ChoiceEvent[], id: KindnessId, today: string): KindnessDone {
  if (doneToday(log, today).has(id)) return { ok: false, why: 'already' }
  return { ok: true, event: kindnessEvent(id, today), say: kindnessSpec(id).say }
}

/**
 * The one line under the kindnesses, which is a welcome and never a task
 * list. With everything done it thanks her; with nothing done it says plainly
 * that none of it is needed.
 */
export function kindnessLine(done: ReadonlySet<KindnessId>): string {
  if (done.size >= KINDNESSES.length) return 'The garden has had a lovely day. Nothing else is needed.'
  if (done.size === 0) return 'Nothing here needs doing. They are just nice to do.'
  return 'Lovely. The rest can wait for ever if it likes.'
}
