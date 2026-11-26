import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import type { ChoiceEvent } from '#/lib/creatures/choices'
import { deriveBookshop, tradeSince } from '#/lib/bookshop/shop'
import type { Away, Bookshop } from '#/lib/bookshop/shop'
import { useMinuteClock } from '../creatures/CreaturesContext'

/**
 * Her bookshop for the block and for the shop itself (T-0113, D-0084 §3).
 *
 * The shop is worked out from her books, her choice log and the clock, and
 * nothing of it is stored. Two small notes live in this browser only, because
 * they are about this device and not about her shop:
 *
 * - **the furthest day this device has seen.** A phone whose clock jumps back
 *   a day would otherwise un-sell a day of books. The shop is asked to trade
 *   through at least that day, so the till and the shelves can stand still but
 *   never go backwards (D-0084 §3).
 * - **the last day she looked at the shop**, so the block can say what sold
 *   while she was away. Nothing hangs on it: lose it and the block simply says
 *   more, never less, and not one coin is lost. Only opening the shop counts
 *   as having looked — the block shows the news without clearing it, the way
 *   the garden does (`garden/useSeen.ts`).
 */

const floorKey = (accountId: string | null) => `hannas-reading-list:bookshop-clock:${accountId ?? 'local'}`
const seenKey = (accountId: string | null) => `hannas-reading-list:bookshop-seen:${accountId ?? 'local'}`

const DAY = /^\d{4}-\d{2}-\d{2}$/

function readDay(key: string): string {
  try {
    const v = localStorage.getItem(key)
    return v && DAY.test(v) ? v : ''
  } catch {
    // a private window, or storage switched off: the shop works just the same
    return ''
  }
}

function writeDay(key: string, day: string) {
  try {
    localStorage.setItem(key, day)
  } catch {
    /* nothing of hers is lost: it is a note about this device, not about her shop */
  }
}

export interface ShopApi {
  shop: Bookshop
  /** what sold since she last looked */
  away: Away
  /** she has looked: the next "while you were away" starts from here */
  seen: () => void
}

export function useBookshop(books: Book[], log: readonly ChoiceEvent[], accountId: string | null = null): ShopApi {
  const now = useMinuteClock()
  const ms = now.getTime()
  const fKey = floorKey(accountId)
  const sKey = seenKey(accountId)

  const [floorDay, setFloorDay] = useState(() => (typeof window === 'undefined' ? '' : readDay(fKey)))
  const shop = useMemo(() => deriveBookshop(books, log, ms, { floorDay: floorDay || undefined }), [books, log, ms, floorDay])

  useEffect(() => {
    if (shop.today > floorDay) {
      setFloorDay(shop.today)
      writeDay(fKey, shop.today)
    }
  }, [shop.today, floorDay, fKey])

  // read once per visit: the news must not go out from under her while she reads it
  const [lastLooked] = useState(() => (typeof window === 'undefined' ? '' : readDay(sKey)))
  const away = useMemo(() => tradeSince(shop, lastLooked || shop.start), [shop, lastLooked])
  const seen = useCallback(() => writeDay(sKey, shop.today), [sKey, shop.today])

  return { shop, away, seen }
}
