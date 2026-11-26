import type { ChoiceEvent } from './choices'

/**
 * Cookies she has earned are never taken back (D-0081).
 *
 * Cookies are worked out from her reading log and never stored, but what she
 * **spends** is stored in the choice log. So lowering the log afterwards —
 * correcting a past day down to nothing (T-0045), sliding a book's progress
 * back, removing a book or merging two copies — took cookies away that she had
 * already spent, and her balance went **below zero**. Hanna hit this a few days
 * before 26 November 2026, and `creature.ts` had long admitted it was possible
 * ("may be below zero after a fix to a past day").
 *
 * The fix is the mark that D-0079 gave the facts: the highest total she has
 * ever earned, kept as one `place` event keyed `c:earned` with the count in
 * `n`, riding in the same choice log (D-0034, D-0067). `place` is a setting
 * kind, so only the newest per key survives a merge: one event however many
 * years she reads, and it follows her to every device with no change on the
 * server.
 *
 * It is read as the **highest** mark in the log, not the newest, so two devices
 * that have not met yet cannot pull it backwards.
 *
 * What this means for her: a day she corrects downwards no longer confiscates
 * cookies — she really did read that day, and she may already have spent them.
 * Correcting a day **up** still earns more, as it always did.
 */

export const COOKIE_MARK_KEY = 'c:earned'

/** The `place` event body for the mark (the caller adds the id and the time). */
export const cookieMarkEvent = (earned: number) =>
  ({ kind: 'place', key: COOKIE_MARK_KEY, n: Math.max(0, Math.floor(earned)) }) as const

/** The highest `c:earned` in the log, or 0 when there is none. */
export function cookieMark(log: readonly ChoiceEvent[]): number {
  let best = 0
  for (const e of log) {
    if (e.kind !== 'place' || (e as { key?: unknown }).key !== COOKIE_MARK_KEY) continue
    const n = (e as { n?: unknown }).n
    if (typeof n === 'number' && Number.isFinite(n) && n > best) best = Math.floor(n)
  }
  return best
}

/** What she has earned, counting the mark: never less than she has already been given. */
export const earnedWithMark = (earned: number, mark = 0) => Math.max(earned, mark)
