import type { Book } from '../library'
import type { ChoiceEvent } from './choices'

/**
 * The favourite creature on the shelf (T-0033 Design §8). Which pet is chosen
 * comes from the `shelf` setting event (D-0034 §1, newest wins, `pet: ''`
 * means "take off"); when the chosen pet has been released, the shelf is
 * empty — never "her first remaining pet" (release leaves the shelf blank,
 * so she sees her choice).
 */

export const SHELF_SETTING_KEY = 'shelf'

interface ShelfEvent {
  id: string
  at: number
  kind: 'shelf'
  key: string
  pet: string
  [field: string]: string | number
}

const isShelf = (e: ChoiceEvent): e is ShelfEvent =>
  e.kind === 'shelf' && (e as unknown as ShelfEvent).key === SHELF_SETTING_KEY && typeof (e as unknown as ShelfEvent).pet === 'string'

/**
 * The newest shelf choice as a pet id, or null (no choice yet or taken off).
 * If the chosen pet was released, falls back to her first remaining pet
 * (D-0033 §9 / T-0033 Done when 1).
 */
export function shelfPetId(
  log: readonly ChoiceEvent[],
  livingPetIds: ReadonlySet<string>,
  firstPetId: string | null = null,
): string | null {
  let best: ShelfEvent | null = null
  for (const e of log) {
    if (!isShelf(e)) continue
    if (!best || e.at > best.at || (e.at === best.at && e.id > best.id)) best = e
  }
  if (!best || !best.pet) return null
  if (livingPetIds.has(best.pet)) return best.pet
  // released: her first remaining pet
  return firstPetId
}

/** Whether she has finished a book today (used for the once-a-day cheer, §8d). */
export function finishedToday(books: Book[], today: string): boolean {
  return books.some((b) => b.status === 'read' && (b.finished ?? []).includes(today))
}

const CHEER_KEY_PREFIX = 'hrl:shelf-cheer:'
export const cheerKey = (day: string) => `${CHEER_KEY_PREFIX}${day}`

/**
 * Whether the shelf pet should cheer now: there is a finish today AND the
 * flag for today hasn't been set in storage yet. Reading or setting the flag
 * is the caller's job (so tests stay pure).
 */
export function shouldCheer(books: Book[], today: string, alreadyShown: boolean): boolean {
  if (alreadyShown) return false
  return finishedToday(books, today)
}
