import { useEffect, useRef, useState } from 'react'
import { UPGRADES } from '#/lib/bookshop/numbers'
import type { UpgradeId } from '#/lib/bookshop/numbers'
import type { Away, Bookshop } from '#/lib/bookshop/shop'
import { buyUpgrade } from '#/lib/bookshop/upgrades'
import {
  awaySentence,
  awayWhen,
  coinsWord,
  copiesWord,
  lastsSentence,
  lineText,
  savingSentence,
  stockSentence,
  tradeSentence,
  upgradeEffect,
} from '#/lib/bookshop/words'
import { ShopFlat } from './ShopFlat'

/**
 * The whole bookshop, behind "Open ›" on the dashboard block (T-0113, D-0084
 * §8). Not a tab: her tab row already has seven buttons and fills a phone, so
 * the shop opens over the dashboard and Escape or × closes it again.
 *
 * It shows the same drawing, larger; what sold while she was away, day by day;
 * what is on the shelves, by name; and the eight things coins buy. Nothing is
 * collected here and nothing expires — the only button in the shop that does
 * anything is Buy.
 */

/** "Mon 1 Dec" for a yyyy-mm-dd day. */
function dayLabel(day: string): string {
  const d = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)))
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export interface BookshopShopProps {
  shop: Bookshop
  away: Away
  /** saves what she buys in the choice log that is already live (D-0084 §5) */
  onBuy: (event: { kind: 'place'; key: string; item: string; price: number }) => void
  onClose: () => void
}

export function BookshopShop({ shop, away, onBuy, onClose }: BookshopShopProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [said, setSaid] = useState('')

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  const buy = (id: UpgradeId) => {
    const r = buyUpgrade(shop.owned, shop.coins, id)
    if (!r.ok) {
      setSaid(r.why === 'coins' ? 'Not enough coins yet.' : 'You have that one already.')
      return
    }
    onBuy(r.event)
    setSaid(`Bought. ${UPGRADES.find((u) => u.id === id)?.says ?? ''}`)
  }

  const days = [...shop.recent].reverse().slice(0, 7)

  return (
    <dialog className="dialog bookshop-dialog" ref={dialog} onClose={onClose} aria-labelledby="bookshop-dialog-title">
      <div className="dialog-body bookshop-body">
        <div className="dialog-header">
          <h2 id="bookshop-dialog-title">Your bookshop</h2>
          <button type="button" className="btn icon small" aria-label="Close" onClick={() => dialog.current?.close()}>
            ×
          </button>
        </div>

        <div className="shop-stage big">
          <ShopFlat shop={shop} />
        </div>

        <p className="shop-till">
          <span className="shop-coins">🪙 {coinsWord(shop.coins)}</span> <span className="small-text">{tradeSentence(shop)}</span>
        </p>
        <p className="small-text">
          {stockSentence(shop)} {lastsSentence(shop)}
        </p>

        <section aria-labelledby="shop-away-title">
          <h3 id="shop-away-title">While you were away</h3>
          <p>{awaySentence(away)}</p>
          {away.coins > 0 && (
            <p className="small-text muted">
              {coinsWord(away.coins)} {awayWhen(away)}
              {away.capped ? ', and more before that — it is all in the till already.' : '.'}
            </p>
          )}
          {days.length > 0 && (
            <ul className="shop-days">
              {days.map((d) => (
                <li key={d.day}>
                  <span className="shop-day">{dayLabel(d.day)}</span>{' '}
                  <span className="small-text">
                    {copiesWord(d.copies)}, {coinsWord(d.coins)}
                  </span>
                  <span className="small-text muted"> — {d.titles.map((t) => lineText(t)).join(', ')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="shop-shelf-title">
          <h3 id="shop-shelf-title">On the shelves</h3>
          {shop.shelf.length === 0 ? (
            <p className="small-text">{stockSentence(shop)}</p>
          ) : (
            <ul className="shop-shelf-list">
              {shop.shelf.slice(0, 12).map((line) => (
                <li key={line.id}>
                  <span className="shop-spine-dot" style={{ background: line.book.color }} aria-hidden /> {lineText(line)}
                </li>
              ))}
              {shop.shelf.length > 12 && <li className="small-text muted">and {shop.shelf.length - 12} more titles</li>}
            </ul>
          )}
        </section>

        <section aria-labelledby="shop-buy-title">
          <h3 id="shop-buy-title">The shop</h3>
          <p className="small-text">{savingSentence(shop)}</p>
          <ul className="shop-things">
            {UPGRADES.map((u) => {
              const owned = shop.owned.has(u.id)
              return (
                <li key={u.id} className={owned ? 'owned' : undefined}>
                  <div className="shop-thing-text">
                    <p className="shop-thing-name">
                      {u.name} {owned && <span className="shop-have">✓ in the shop</span>}
                    </p>
                    <p className="small-text muted">{u.says}</p>
                    <p className="small-text">{upgradeEffect(u)}</p>
                  </div>
                  {owned ? (
                    <span className="small-text muted">bought</span>
                  ) : (
                    <button type="button" className="btn small" disabled={shop.coins < u.price} onClick={() => buy(u.id)}>
                      {coinsWord(u.price)}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <p className="small-text muted shop-note">
          The shop trades on its own, with the books you have read. Every six minutes of reading prints a copy, and finishing a book
          puts it on sale. Nothing here runs out and there is nothing to collect — leave it a week and you come back to a week of
          trade, as far as the shelves lasted.
        </p>

        <p className="visually-hidden" role="status" aria-live="polite">
          {said}
        </p>
      </div>
    </dialog>
  )
}
