import type { ChoiceEvent } from './creatures/choices'
import { SETTING_KINDS } from './creatures/choices'

/**
 * How far along her facts are (D-0079), kept so a fact can never come round
 * twice.
 *
 * A fact used to be picked purely by **how many** reading days she had, so a
 * day that went away — correcting a past day down to nothing (T-0045), sliding
 * a book's progress back, removing a book or merging two copies — pulled the
 * whole run back a step and handed her a fact she had already read. That is
 * what Hanna noticed on 26 November 2026.
 *
 * The mark rides in the creatures choice log (D-0034) as a `place` event with
 * the key `f:seen` and the count in `n`, exactly as a swapped bingo square does
 * (D-0067): the route is already live, so nothing changes in `deploy/nas/` and
 * nothing waits for Sander. `place` is a setting kind, so `mergeLogs` keeps only
 * the newest event for this key — the mark costs **one** event however many
 * years she reads, and it follows her to every device.
 *
 * The den reads only `home:` keys, the garden only `g:` and bingo only `b:`;
 * none of them reads this one, and this reads none of theirs.
 */

export const FACTS_SEEN_KEY = 'f:seen'

/** The `place` event body for the mark (the caller adds the id and the time). */
export const factsSeenEvent = (count: number) => ({ kind: 'place', key: FACTS_SEEN_KEY, n: Math.max(0, Math.floor(count)) }) as const

/**
 * The mark in the log: the **highest** `f:seen` count in it, or 0 when there is
 * none. Anything that isn't a whole number above zero is ignored, so a log from
 * another device or a newer app can never make it strange.
 *
 * The highest and not the newest, on purpose: two devices that have not met yet
 * both hold a mark, and the point of the mark is that it never goes backwards.
 * While both events are in the log the higher one wins whatever their clocks
 * say. (Once the logs are merged, `place` keeps only the newest per key, so a
 * device that writes while it is still behind the other can lower the mark by a
 * few; her facts then climb back from there. That is the price of the mark
 * costing one event instead of one per reading day — see D-0079.)
 */
export function factsSeen(log: readonly ChoiceEvent[]): number {
  let best = 0
  for (const e of log) {
    if (e.kind !== 'place' || (e as { key?: unknown }).key !== FACTS_SEEN_KEY) continue
    const n = (e as { n?: unknown }).n
    if (typeof n === 'number' && Number.isFinite(n) && n > best) best = Math.floor(n)
  }
  return best
}

/** `place` is a setting kind, so the newest mark replaces the one before it. */
export const MARK_IS_A_SETTING = SETTING_KINDS.includes('place')
