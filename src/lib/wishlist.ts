import type { Book } from './library'
import { cleanEbookLink, ebookHref } from './ebookLink'
import { priceCents } from './price'

/**
 * The wishlist (T-0062, D-0044): books Hanna wants to buy. A wish is an
 * ordinary `Book` with `wish: true`, so it is saved, merged and synced by
 * exactly the code her shelf already uses — no new collection, no migration,
 * nothing on the server at Sander's home.
 *
 * What a wish must **not** do is count. It is not in the want-to-read pile, the
 * statistics, the suggestions, the world map, the challenges, the badges, the
 * creatures or the Reading Garden. That is kept right in **one** place: the
 * page splits the library once with `shelfBooks()` and `wishBooks()`, and
 * everything that counts, draws or suggests is given the shelf books. A new
 * block or page therefore excludes wishes without any code of its own.
 *
 * Don't confuse this with *Make a wish* (`wish.ts`, the ⭐ button), which picks
 * a book she already owns to read next.
 */

/** Her shelf: every book that is not on the wishlist. Give this to anything that counts. */
export const shelfBooks = (books: Book[]): Book[] => books.filter((b) => !b.wish)

/** Her wishlist: the books she wants to buy, in shelf order. */
export const wishBooks = (books: Book[]): Book[] => books.filter((b) => !!b.wish)

/** Whether a book is on the wishlist. */
export const isWish = (book: Book): boolean => !!book.wish

/**
 * Where to buy a wish: the same https/http rule as the e-book link (#185), so
 * a `javascript:` or `data:` address pasted on another device can never end up
 * behind a button. `cleanBuyLink` on the way in, `buyHref` on every render.
 */
export const cleanBuyLink = cleanEbookLink
export const buyHref = ebookHref

/** The wishes newest first, the way the block shows them. */
export const wishOrder = (wishes: Book[]): Book[] => [...wishes].sort((a, b) => b.addedAt - a.addedAt)

/**
 * What the whole wishlist would cost, in euros: only the wishes that have a
 * price, added up in cents so decimals never drift (D-0024).
 */
export function wishTotal(wishes: Book[]): number {
  return wishes.reduce((cents, b) => cents + priceCents(b.price), 0) / 100
}

/** "3 books · €41.48", or just "3 books" when none of them has a price. */
export function wishCountText(wishes: Book[]): string {
  const books = `${wishes.length} book${wishes.length === 1 ? '' : 's'}`
  const total = wishTotal(wishes)
  return total > 0 ? `${books} · €${total.toFixed(2)}` : books
}

/**
 * "I bought it ›": the book leaves the wishlist and joins the shelf **today**,
 * so Newly added, the pile's fourteen-day wait and the buying jar all count
 * from the day it arrived and not from the day she wished for it (D-0044). Its
 * price is kept, for the follow-up's price field.
 */
export const boughtPatch = (at: number = Date.now()): Partial<Book> => ({ wish: undefined, addedAt: at })
