import { CARD_SIZE, SQUARE_IDS, forCard } from './bingo'
import type { ChoiceEvent } from './creatures/choices'
import { SETTING_KINDS } from './creatures/choices'

/**
 * A bingo square she swapped herself (D-0067). Swapping is placing: which
 * square stands in which slot of which card. It rides in the creatures choice
 * log (D-0034) as a `place` event with the key `b:<year>:<card>:<slot>` and the
 * square's id in `sq`, through the route that is already live — so no change in
 * `deploy/nas/` and nothing waits for Sander.
 *
 * The den reads only `home:<slot>` keys and the garden only `g:` keys (D-0052);
 * bingo reads only `b:` keys. None of the three ever reads another's.
 *
 * Not to be confused with the automatic swap in `bingo.ts`, which moves a square
 * that has stayed open for 30 days. That one is the app's; this one is hers.
 */

export const SWAP_KEY_PREFIX = 'b:'

/** The key for one slot of one card. */
export const swapKey = (year: number, card: number, slot: number) => `${SWAP_KEY_PREFIX}${year}:${card}:${slot}`

/** The `place` event body for a picked swap (the caller adds id and at). */
export const swapEvent = (year: number, card: number, slot: number, square: string) =>
  ({ kind: 'place', key: swapKey(year, card, slot), sq: square }) as const

/** Her picked swaps, as `year:card:slot` → square id. */
export type BingoSwaps = ReadonlyMap<string, string>

const newer = (a: ChoiceEvent, b: ChoiceEvent) => a.at > b.at || (a.at === b.at && a.id > b.id)

/**
 * The newest `place` event per `b:` key, as the server and the device both read
 * it (D-0034 §1). Keys that aren't bingo's, slots out of range and squares that
 * don't exist are ignored.
 */
export function bingoSwaps(log: readonly ChoiceEvent[]): Map<string, string> {
  const best = new Map<string, ChoiceEvent>()
  for (const e of log) {
    // a log read from storage can hold anything at all
    if (!e || typeof e !== 'object' || e.kind !== 'place' || !SETTING_KINDS.includes(e.kind)) continue
    const key = (e as { key?: unknown }).key
    if (typeof key !== 'string' || !key.startsWith(SWAP_KEY_PREFIX)) continue
    const square = (e as { sq?: unknown }).sq
    if (typeof square !== 'string' || !SQUARE_IDS.includes(square)) continue
    const parts = key.slice(SWAP_KEY_PREFIX.length).split(':')
    if (parts.length !== 3) continue
    const [year, card, slot] = parts.map(Number)
    if (!Number.isInteger(year) || !Number.isInteger(card) || !Number.isInteger(slot)) continue
    if (card < 1 || slot < 0 || slot >= CARD_SIZE) continue
    const at = `${year}:${card}:${slot}`
    const have = best.get(at)
    if (!have || newer(e, have)) best.set(at, e)
  }
  return new Map([...best].map(([at, e]) => [at, (e as unknown as { sq: string }).sq]))
}

/** The swaps for one card, as slot → square id (the reader lives in `bingo.ts`). */
export const cardSwaps = forCard
