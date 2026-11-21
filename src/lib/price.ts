import type { BookFormat } from './library'

/**
 * What a bought book cost (T-0016, D-0024): `Book.price` in euros, at most
 * two decimals. The 📚 buying jar spends €5 per coin, worked out in cents so
 * decimals never drift; these are the rules for typing, showing and asking it.
 */

/** The most a price may be: €9,999.99. */
export const MAX_PRICE_CENTS = 999_999
/** What one coin from the buying jar is worth, in cents. */
export const COIN_CENTS = 500

export type PriceProblem = 'format' | 'too-much'
export type PriceParse = { ok: true; price: number | undefined } | { ok: false; problem: PriceProblem }

/** The error under a price field. */
export const PRICE_ERRORS: Record<PriceProblem, string> = {
  format: 'Try 12.50 or 12,50.',
  'too-much': 'That’s more than €9,999.99.',
}

/**
 * A price as she typed it: "12", "12,50", "12.50", "€ 7.99", "7.99 €". Comma
 * or dot as the decimal mark, € before or after, spaces allowed; no thousands
 * separators, no minus, at most two decimals. Empty is no price.
 */
export function parsePrice(text: string): PriceParse {
  const bare = text.replace(/\s+/g, '')
  const m = bare.match(/^€?(\d+)(?:[.,](\d{1,2}))?€?$/)
  if (!bare || bare === '€') return { ok: true, price: undefined }
  if (!m || (bare.startsWith('€') && bare.endsWith('€'))) return { ok: false, problem: 'format' }
  const cents = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'))
  if (cents > MAX_PRICE_CENTS) return { ok: false, problem: 'too-much' }
  return { ok: true, price: cents / 100 }
}

/** A stored price in whole cents; anything that isn't a sane price is 0. */
export function priceCents(price: number | undefined): number {
  return typeof price === 'number' && Number.isFinite(price) && price > 0 ? Math.round(price * 100) : 0
}

/** A price as the field shows it once saved: "12.50" (the € sits beside the field). */
export const priceField = (price: number | undefined): string =>
  typeof price === 'number' && Number.isFinite(price) && price >= 0 ? (Math.round(price * 100) / 100).toFixed(2) : ''

/** The formats that make a book hers to buy: paperback, hardcover, e-book. */
export const ownsCopy = (formats: BookFormat[]) => formats.some((f) => f === 'paperback' || f === 'hardcover' || f === 'ebook')

/**
 * Whether the add dialog asks "What did it cost?": only while one of the owned
 * formats is chosen, and never for a book the Storytel tab imported.
 */
export const asksPrice = (formats: BookFormat[], from?: string) => from !== 'storytel' && ownsCopy(formats)

/** Whether a free e-book (exactly €0) goes on to ask for the link to the file. */
export const asksEbookLink = (formats: BookFormat[], price: number | undefined) =>
  formats.includes('ebook') && price === 0

/** A coin count in tenths, rounded half away from zero; worked out in cents so 0.15 doesn't turn into 0.1. */
function tenths(coins: number): number {
  const cents = Math.round(coins * COIN_CENTS)
  const t = Math.floor((Math.abs(cents) + 25) / 50)
  return cents < 0 ? -t : t
}

/** The count in words: "4.6 coins", "4 coins", "1 coin", "0 coins", "−1.4 coins" (a real minus sign). */
export function coinWords(coins: number, minus = '−'): string {
  const t = tenths(coins)
  const abs = Math.abs(t)
  const number = abs % 10 === 0 ? String(abs / 10) : (abs / 10).toFixed(1)
  return `${t < 0 ? minus : ''}${number} ${abs === 10 ? 'coin' : 'coins'}`
}

/** The jar's line: "🪙 4.6 coins", the coin held to the number with a no-break space. */
export const coinText = (coins: number) => `🪙 ${coinWords(coins)}`

/** The jar's name for a screen reader: "Buying jar: 4.6 coins", "Buying jar: minus 1.4 coins". */
export const buyingJarLabel = (coins: number) => `Buying jar: ${coinWords(coins, 'minus ')}`

/** Whether the jar shows as below zero (a count that rounds to 0 doesn't). */
export const belowZero = (coins: number) => tenths(coins) < 0
