import type { ChoiceEvent } from '../creatures/choices'
import { mixedHash } from '../creatures/hash'
import { MAX_PICKS } from './numbers'
import { addDays } from '../creatures/days'

/**
 * Staff picks (T-0123, D-0091): up to three of her books in the shop window.
 *
 * A pick rides in the creatures choice log like everything else the shop saves (D-0084 §5):
 * a `place` event per book with the key `s:pick:<book>`, newest per key wins. The event keeps
 * the day the book was first picked (`since`) and, once she takes it out of the window, the
 * day she did (`until`). That is enough for the shop to work out the extra coin on every
 * pick sold, for every day in the past, without ever storing a coin: taking a book out of the
 * window, or picking it again later, never takes back a coin the shop already earned.
 *
 * A pick that sells out leaves the window by itself: the window shows only picks with copies
 * on the shelf, and a sold-out pick's place is free for another. Nothing is written for that.
 */

export const PICK_KEY_PREFIX = 's:pick:'

/** The longest book id that fits in an event field (the server's route allows 60 characters). */
const MAX_ID = 60

/** A short, settled key for a book: ids can be longer than a key may be. */
export const pickKey = (bookId: string) => `${PICK_KEY_PREFIX}${mixedHash(bookId).toString(36)}`

export interface Pick {
  /** the book's id */
  id: string
  /** the first day it was picked */
  since: string
  /** the day it was taken out of the window; none while it is still picked */
  until?: string
  /** when the event was written, for the window's order */
  at: number
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const newer = (a: ChoiceEvent, b: ChoiceEvent) => a.at > b.at || (a.at === b.at && a.id > b.id)

/** Every book she has ever picked, with when; the newest event per book wins (D-0034 §1). */
export function picksFrom(log: readonly ChoiceEvent[]): Pick[] {
  const best = new Map<string, ChoiceEvent>()
  for (const e of log) {
    if (!e || typeof e !== 'object' || e.kind !== 'place') continue
    const key = (e as { key?: unknown }).key
    if (typeof key !== 'string' || !key.startsWith(PICK_KEY_PREFIX)) continue
    const had = best.get(key)
    if (!had || newer(e, had)) best.set(key, e)
  }
  const out: Pick[] = []
  for (const [key, e] of best) {
    const x = e as unknown as { book?: unknown; item?: unknown; since?: unknown; until?: unknown; at: number }
    if (typeof x.book !== 'string' || x.book === '' || pickKey(x.book) !== key) continue
    if (typeof x.since !== 'string' || !DAY.test(x.since)) continue
    const off = x.item === 'off'
    if (!off && x.item !== 'on') continue
    if (off && (typeof x.until !== 'string' || !DAY.test(x.until))) continue
    out.push({ id: x.book, since: x.since, ...(off && { until: x.until as string }), at: x.at })
  }
  return out.sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1))
}

/** The picks still in the window's list (sold out or not), oldest first. */
export const currentPicks = (picks: readonly Pick[]) => picks.filter((p) => p.until === undefined)

/** Was this book picked on that day? `until` is the day it came out: sales that day don't count. */
export function pickedOn(picks: readonly Pick[], id: string, day: string): boolean {
  return picks.some((p) => p.id === id && p.since <= day && (p.until === undefined || day < p.until))
}

/**
 * The event for picking a book on `today`. Picked before and taken out since: it keeps its
 * first day, so a coin it earned then is never taken back (the days between count too; the
 * shop can only ever give, never take).
 */
export function pickEvent(bookId: string, today: string, picks: readonly Pick[]) {
  if (bookId.length > MAX_ID) return null
  const before = picks.find((p) => p.id === bookId)
  return { kind: 'place', key: pickKey(bookId), item: 'on', book: bookId, since: before?.since ?? today } as const
}

/**
 * The event for taking a book out of the window on `today`. It counts as picked to the end of
 * today: what it already sold today keeps its extra coin, so taking it out never empties the till.
 */
export function unpickEvent(pick: Pick, today: string) {
  const end = addDays(today < pick.since ? pick.since : today, 1)
  return { kind: 'place', key: pickKey(pick.id), item: 'off', book: pick.id, since: pick.since, until: end } as const
}

export type PickRefusal = 'full' | 'picked' | 'long'

/**
 * Picking a book, or why not. `inWindow` are the picks with copies on the shelf: a sold-out
 * pick has left the window, so its place is free. When the window is full of sold-out picks'
 * places, the oldest sold-out pick is taken out in the same go.
 */
export function pickBook(
  bookId: string,
  today: string,
  picks: readonly Pick[],
  inWindow: readonly string[],
): { ok: true; events: Array<ReturnType<typeof unpickEvent> | NonNullable<ReturnType<typeof pickEvent>>> } | { ok: false; why: PickRefusal } {
  const current = currentPicks(picks)
  if (current.some((p) => p.id === bookId)) return { ok: false, why: 'picked' }
  if (inWindow.length >= MAX_PICKS) return { ok: false, why: 'full' }
  const on = pickEvent(bookId, today, picks)
  if (!on) return { ok: false, why: 'long' }
  // make room: sold-out picks still in the list leave it, oldest first
  const soldOut = current.filter((p) => !inWindow.includes(p.id))
  const over = current.length + 1 - MAX_PICKS
  const out = soldOut.slice(0, Math.max(0, over)).map((p) => unpickEvent(p, today))
  return { ok: true, events: [...out, on] }
}
