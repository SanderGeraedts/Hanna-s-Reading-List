import type { Creatures } from '#/lib/creatures/creature'
import type { Garden } from '#/lib/garden/garden'
import type { Book } from '#/lib/library'
import type { ChoiceEvent } from '#/lib/creatures/choices'
import { newsLine } from '#/lib/garden/seen'
import { coinsWord, copiesWord, customerNotes } from '#/lib/bookshop/words'
import type { Bookshop } from '#/lib/bookshop/shop'
import { useSeen } from './garden/useSeen'
import { useBookshop } from './bookshop/useBookshop'
import { requestBookshop } from './bookshop/BookshopCard'

/**
 * Today in your world (T-0124, D-0093): the creatures, the garden and the bookshop in three
 * short lines, each about today only and each a way in to its page. A line with no news today
 * hides; the card hides when all three do (`worldNews` says whether there is any).
 */

export interface WorldNews {
  cookies: number
  garden: string
  shop: { copies: number; coins: number; note: string | null } | null
}

/** Today's news from each of the three, or nothing. */
export function worldNews(c: Creatures, gardenNews: string, shop: Bookshop): WorldNews {
  const sold = shop.recent.find((d) => d.day === shop.today)
  const [note] = customerNotes(shop, 1)
  return {
    cookies: c.pet || c.egg ? c.earnedToday : 0,
    garden: gardenNews,
    shop: sold && sold.copies > 0 ? { copies: sold.copies, coins: sold.coins, note: note && note.day === shop.today ? note.text : null } : null,
  }
}

export const hasWorldNews = (n: WorldNews) => n.cookies > 0 || n.garden !== '' || n.shop !== null

/** The news, worked out the way the card shows it (for the dashboard's "is there anything today"). */
export function useWorldNews(c: Creatures, garden: Garden, books: Book[], log: readonly ChoiceEvent[], accountId: string | null): WorldNews {
  const gardenNews = newsLine(useSeen(garden, false).plants)
  const { shop } = useBookshop(books, log, accountId)
  return worldNews(c, gardenNews, shop)
}

export function YourWorldCard({
  news,
  onFeed,
  onOpenCreatures,
  onOpenGarden,
}: {
  news: WorldNews
  onFeed?: () => void
  onOpenCreatures?: () => void
  onOpenGarden?: () => void
}) {
  return (
    <section className="dash-card your-world" aria-labelledby="your-world-title">
      <h2 id="your-world-title">Today in your world</h2>
      <ul className="your-world-lines">
        {news.cookies > 0 && (
          <li>
            <button type="button" className="link-btn" onClick={onOpenCreatures}>
              🍪 +{news.cookies} {news.cookies === 1 ? 'cookie' : 'cookies'} today
            </button>
            {onFeed && (
              <button type="button" className="btn small" onClick={onFeed}>
                Feed
              </button>
            )}
          </li>
        )}
        {news.garden !== '' && (
          <li>
            <button type="button" className="link-btn" onClick={onOpenGarden}>
              🌱 In the garden: {news.garden}
            </button>
          </li>
        )}
        {news.shop && (
          <li className="your-world-shop">
            <button type="button" className="link-btn" onClick={() => requestBookshop()}>
              🪙 The bookshop sold {copiesWord(news.shop.copies)} today ({coinsWord(news.shop.coins)})
            </button>
            {news.shop.note && <span className="small-text muted">📌 “{news.shop.note}”</span>}
          </li>
        )}
      </ul>
    </section>
  )
}
