import { useState } from 'react'
import type { Book } from '#/lib/library'
import type { ChoiceEvent } from '#/lib/creatures/choices'
import { awaySentence, coinsWord, savingSentence, stockSentence } from '#/lib/bookshop/words'
import { OpenLink } from '../OpenLink'
import { useReducedMotion } from '../creatures/pose'
import { ShopFlat } from './ShopFlat'
import { BookshopShop } from './BookshopShop'
import { useBookshop } from './useBookshop'

/**
 * The dashboard block "Bookshop" (T-0113, D-0084 §8): a small flat drawing of
 * her shop as it stands, what sold while she was away, what is in the till and
 * what is on the shelves. "Open ›" opens the whole shop over the dashboard.
 *
 * It is a block and not a tab on purpose: her tab row already has seven
 * buttons and fills a phone (D-0084 §8), so the shop opens the way the Garden
 * and My year blocks open their bigger selves.
 *
 * The block is self-contained: hand it her books, the creatures choice log and
 * the way to save a choice, and it works out everything else. It reads her
 * books and never writes to them, and it never touches cookies, creatures, the
 * garden, the challenges or the badges.
 */

/** Saving one choice in the log that is already live — the creatures' own `record` fits this. */
export type RecordChoice = (event: { kind: 'place' } & Record<string, string | number | undefined>) => void

export interface BookshopCardProps {
  books: Book[]
  /** the creatures choice log (D-0034); the shop reads only its own `s:` keys */
  log: readonly ChoiceEvent[]
  record: RecordChoice
  /** the signed-in account, so two people on one browser keep their own notes */
  accountId?: string | null
  /** given a way out, the block uses it instead of opening the shop over the dashboard */
  onOpen?: () => void
}

export function BookshopCard({ books, log, record, accountId = null, onOpen }: BookshopCardProps) {
  const { shop, away, seen } = useBookshop(books, log, accountId)
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)

  const show = () => {
    seen()
    if (onOpen) onOpen()
    else setOpen(true)
  }

  return (
    <section className="dash-card bookshop-block" aria-labelledby="bookshop-title">
      <div className="dash-card-head">
        <h2 id="bookshop-title">Bookshop</h2>
        <OpenLink onOpen={show} label="Bookshop" />
      </div>
      <div className="shop-stage">
        <ShopFlat shop={shop} compact reduce={reduce} />
      </div>
      <p className="bookshop-away">{awaySentence(away)}</p>
      <p className="bookshop-counts">
        <span className="shop-coins">🪙 {coinsWord(shop.coins)}</span> <span className="small-text">{stockSentence(shop)}</span>
      </p>
      <p className="small-text bookshop-next">{savingSentence(shop)}</p>
      {open && <BookshopShop shop={shop} away={away} onBuy={record} onClose={() => setOpen(false)} />}
    </section>
  )
}
