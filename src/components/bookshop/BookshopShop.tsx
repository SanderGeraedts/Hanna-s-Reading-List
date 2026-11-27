import { useEffect, useRef, useState } from 'react'
import { MAX_PICKS, UPGRADES } from '#/lib/bookshop/numbers'
import type { UpgradeId } from '#/lib/bookshop/numbers'
import type { Away, Bookshop, Line } from '#/lib/bookshop/shop'
import { buyUpgrade } from '#/lib/bookshop/upgrades'
import { currentPicks, pickBook, unpickEvent } from '#/lib/bookshop/picks'
import { awaySentence, coinsWord, copiesWord, lastsSentence, lineText, noteBoard, savingSentence, stockSentence, tradeSentence, upgradeEffect, weekBestSentence } from '#/lib/bookshop/words'
import { Cover } from '../common'
import { ShopFlat } from './ShopFlat'
import { useShopScene } from './useShopScene'

/**
 * The whole bookshop, behind "Open ›" on the dashboard block (T-0113, D-0084 §8; more in
 * T-0123, D-0091). Not a tab: it opens over the dashboard, and Escape or × closes it.
 *
 * The drawing, larger and alive; tap a shelf to look closer. Then the till, her staff picks in
 * the window, her best sellers, the magnetic board with every note customers left, what sold
 * while she was away, what is on the shelves, and the things coins buy. Nothing is collected
 * and nothing expires.
 */

/** "Mon 1 Dec" for a yyyy-mm-dd day. */
function dayLabel(day: string): string {
  const d = new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)))
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** One saved choice, as the creatures' `record` takes it. */
export type ShopEvent = { kind: 'place' } & Record<string, string | number | undefined>

export interface BookshopShopProps {
  shop: Bookshop
  away: Away
  /** saves what she buys or picks in the choice log that is already live (D-0084 §5) */
  onBuy: (event: ShopEvent) => void
  onClose: () => void
}

/** Notes shown on the board before "Older notes". */
const BOARD = 6

export function BookshopShop({ shop, away, onBuy, onClose }: BookshopShopProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [said, setSaid] = useState('')
  const [zoom, setZoom] = useState<0 | 1 | null>(null)
  const [looked, setLooked] = useState<Line | null>(null)
  const [older, setOlder] = useState(false)
  const scene = useShopScene(shop)

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

  const inWindow = shop.window.map((l) => l.id)
  const picked = new Set(currentPicks(shop.picks).map((p) => p.id))
  const pick = (line: Line) => {
    const r = pickBook(line.id, shop.today, shop.picks, inWindow)
    if (!r.ok) {
      setSaid(r.why === 'full' ? `The window holds ${MAX_PICKS} books. Take one out first.` : r.why === 'picked' ? 'That one is picked already.' : 'That book can’t be picked.')
      return
    }
    for (const e of r.events) onBuy(e)
    setSaid(`${line.book.title} is in the window.`)
  }
  const unpick = (line: Line) => {
    const p = shop.picks.find((x) => x.id === line.id && x.until === undefined)
    if (!p) return
    onBuy(unpickEvent(p, shop.today))
    setSaid(`${line.book.title} is out of the window.`)
  }

  // the spines of the shelf she tapped, the way the drawing shares them out
  const shelfLines = zoom === null ? [] : shelfOf(shop, zoom)
  const board = noteBoard(shop)
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
          <ShopFlat shop={shop} night={scene.night} weather={scene.weather} decorations={scene.decorations} onShelf={(s) => (setZoom(s), setLooked(null))} />
        </div>

        {zoom !== null && (
          <section className="shop-zoom" aria-label={zoom === 0 ? 'The top shelf' : 'The second shelf'}>
            <div className="shop-zoom-spines">
              {shelfLines.length === 0 && <p className="small-text muted">Nothing on this shelf.</p>}
              {shelfLines.map((line) => (
                <button
                  key={line.id}
                  type="button"
                  className={looked?.id === line.id ? 'shop-zoom-spine active' : 'shop-zoom-spine'}
                  style={{ background: line.book.color }}
                  aria-pressed={looked?.id === line.id}
                  onClick={() => setLooked(line)}
                >
                  <span>{line.book.title}</span>
                </button>
              ))}
            </div>
            <p className="small-text" role="status">
              {looked ? `${looked.book.title}: ${copiesWord(looked.copies)} left.` : 'Tap a book.'}
            </p>
            <button type="button" className="btn small" onClick={() => setZoom(null)}>
              Back to the shop
            </button>
          </section>
        )}
        {/* the shelves for the keyboard and a screen reader: the drawing itself is a picture */}
        <p className="visually-hidden">
          <button type="button" onClick={() => setZoom(0)}>
            Look at the top shelf
          </button>
          {shop.owned.has('shelf') && (
            <button type="button" onClick={() => setZoom(1)}>
              Look at the second shelf
            </button>
          )}
        </p>

        <p className="shop-till">
          <span className="shop-coins">🪙 {coinsWord(shop.coins)}</span> <span className="small-text">{tradeSentence(shop)}</span>
        </p>
        <p className="small-text">
          {stockSentence(shop)} {lastsSentence(shop)}
        </p>

        <section aria-labelledby="shop-picks-title">
          <h3 id="shop-picks-title">Staff picks</h3>
          <ul className="shop-picks">
            {shop.window.map((line) => (
              <li key={line.id}>
                <Cover book={line.book} small />
                <span className="shop-pick-title">{line.book.title}</span>
                <button type="button" className="btn small" onClick={() => unpick(line)} aria-label={`Take ${line.book.title} out of the window`}>
                  Take out
                </button>
              </li>
            ))}
            {Array.from({ length: Math.max(0, MAX_PICKS - shop.window.length) }, (_, i) => (
              <li key={`empty${i}`} className="shop-pick-empty">
                <span className="small-text muted">Pick a book from the shelves below.</span>
              </li>
            ))}
          </ul>
          <p className="small-text muted">A pick earns 1 coin more each time it sells.</p>
        </section>

        <section aria-labelledby="shop-best-title">
          <h3 id="shop-best-title">Best sellers</h3>
          {shop.bestsellers.length === 0 ? (
            <p className="small-text muted">No best sellers yet.</p>
          ) : (
            <ol className="shop-best">
              {shop.bestsellers.map((l) => (
                <li key={l.id}>
                  {l.book.title} <span className="small-text muted">{copiesWord(l.copies)} sold</span>
                </li>
              ))}
            </ol>
          )}
          <p className="small-text">
            <strong>Book of the week:</strong> {weekBestSentence(shop)}
          </p>
        </section>

        <section aria-labelledby="shop-board-title">
          <h3 id="shop-board-title">Notes from customers</h3>
          {board.length === 0 ? (
            <p className="small-text muted">The board is empty until something sells.</p>
          ) : (
            <>
              <ul className="shop-board">
                {(older ? board : board.slice(0, BOARD)).map((n, i) => (
                  <li key={n.id} className={`shop-magnet m${i % 4}`}>
                    <p>{n.text}</p>
                    <p className="small-text">
                      — {n.by}, {dayLabel(n.day)}
                    </p>
                  </li>
                ))}
              </ul>
              {board.length > BOARD && (
                <button type="button" className="btn small" aria-expanded={older} onClick={() => setOlder((o) => !o)}>
                  {older ? 'Fewer notes' : `Older notes (${board.length - BOARD})`}
                </button>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="shop-away-title">
          <h3 id="shop-away-title">While you were away</h3>
          <p>{awaySentence(away)}</p>
          {days.length > 0 && (
            <ul className="shop-days">
              {days.map((d) => (
                <li key={d.day}>
                  <span className="shop-day">{dayLabel(d.day)}</span>{' '}
                  <span className="small-text">
                    {copiesWord(d.copies)}, {coinsWord(d.coins)}
                  </span>
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
                  <span className="shop-spine-dot" style={{ background: line.book.color }} aria-hidden /> <span className="shop-line-text">{lineText(line)}</span>
                  {!picked.has(line.id) && shop.window.length < MAX_PICKS && (
                    <button type="button" className="btn small" onClick={() => pick(line)} aria-label={`Pick ${line.book.title} for the window`}>
                      Pick
                    </button>
                  )}
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

        <p className="small-text muted shop-note">Every six minutes of reading prints a copy; finishing a book puts it on sale. Nothing here runs out.</p>

        <p className="visually-hidden" role="status" aria-live="polite">
          {said}
        </p>
      </div>
    </dialog>
  )
}

/** The titles on one shelf of the drawing, in order, each once. */
function shelfOf(shop: Bookshop, shelf: 0 | 1): Line[] {
  const two = shop.owned.has('shelf')
  const slots = 26 * (two ? 2 : 1)
  if (shop.stock <= 0) return []
  const show = Math.min(slots, shop.stock)
  const spines: Line[] = []
  for (const line of shop.shelf) {
    const n = Math.max(1, Math.floor((line.copies * show) / shop.stock))
    for (let i = 0; i < n && spines.length < show; i++) spines.push(line)
  }
  const upper = spines.slice(0, Math.ceil(spines.length / (two ? 2 : 1)))
  const part = shelf === 0 ? upper : two ? spines.slice(upper.length) : []
  const seen = new Set<string>()
  return part.filter((l) => !seen.has(l.id) && !!seen.add(l.id))
}
