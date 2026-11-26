import type { Book } from './library'
import type { ChoiceEvent } from './creatures/choices'

/**
 * A wish she already has (D-0086).
 *
 * Hanna: *"a book from Storytel with the same title can remove a book from the
 * wishlist. But ask first."* A book arriving from Storytel — or added any other
 * way — can be one she has been wishing for, and then the wish is just sitting
 * there out of date.
 *
 * **It is never taken off by itself.** The wishlist is hers (the guardrails:
 * before removing something of hers, say what will happen and wait for her
 * yes), and there are good reasons to keep a wish for a book she is listening
 * to — a paper copy to keep, a present. So this only ever *offers*, in
 * "Waiting for you", and remembers a "keep it" so she is not asked twice.
 */

const norm = (s: string | undefined) => (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/** Her answer rides in the choice log, like every other small choice (D-0034, D-0067). */
export const KEPT_KEY_PREFIX = 'w:'
export const keptKey = (wishId: string) => `${KEPT_KEY_PREFIX}${wishId}`
/** The `place` event body for "keep this wish" (the caller adds the id and the time). */
export const keepWishEvent = (wishId: string) => ({ kind: 'place', key: keptKey(wishId), keep: 1 }) as const

/** The wishes she has said to keep, by wish id. */
export function keptWishes(log: readonly ChoiceEvent[]): Set<string> {
  const out = new Set<string>()
  for (const e of log) {
    if (e.kind !== 'place') continue
    const key = (e as { key?: unknown }).key
    if (typeof key !== 'string' || !key.startsWith(KEPT_KEY_PREFIX)) continue
    if ((e as { keep?: unknown }).keep === 1) out.add(key.slice(KEPT_KEY_PREFIX.length))
  }
  return out
}

export interface FulfilledWish {
  /** the wish on her list */
  wish: Book
  /** the book on her shelf that looks like it */
  book: Book
  /** it came in from Storytel, which is where she noticed this happening */
  fromStorytel: boolean
}

/**
 * Wishes that now look like a book on her shelf: the same title, and the same
 * first author when both name one. A title alone is enough when neither has an
 * author, because that is how a Storytel import often arrives.
 *
 * Only the first one is ever offered, so "Waiting for you" never becomes a list
 * of chores.
 */
export function fulfilledWishes(books: Book[], kept: ReadonlySet<string> = new Set()): FulfilledWish[] {
  const shelf = books.filter((b) => !b.wish)
  const out: FulfilledWish[] = []
  for (const wish of books) {
    if (!wish.wish || kept.has(wish.id)) continue
    const title = norm(wish.title)
    if (!title) continue
    const match = shelf.find((b) => {
      if (norm(b.title) !== title) return false
      const a = norm(wish.authors[0])
      const c = norm(b.authors[0])
      return !a || !c || a === c
    })
    if (match) out.push({ wish, book: match, fromStorytel: !!match.storytelId })
  }
  return out
}

/** The one to ask about, or null: the oldest wish first, so the list drains in order. */
export const wishToAsk = (books: Book[], kept?: ReadonlySet<string>): FulfilledWish | null =>
  [...fulfilledWishes(books, kept)].sort((a, b) => a.wish.addedAt - b.wish.addedAt)[0] ?? null

/** What the question says, in her words. */
export const askText = ({ wish, fromStorytel }: FulfilledWish): string =>
  `“${wish.title}” is on your shelf${fromStorytel ? ' from Storytel' : ''} and still on your wishlist.`
