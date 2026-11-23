import type { Book } from '#/lib/library'
import { buyHref, wishCountText, wishOrder } from '#/lib/wishlist'
import { coverAtSize } from '#/lib/cover'

/**
 * The **Wishlist** block (T-0062, D-0044): the books Hanna wants to buy, newest
 * first, with their price and where to buy them. They are not on the shelf and
 * are counted nowhere — this block is given the wishes, everything else is
 * given her shelf.
 */
export function WishlistCard({
  wishes,
  onBought,
  onRemove,
}: {
  wishes: Book[]
  /** "I bought it ›": the book joins the shelf today and the follow-up opens */
  onBought: (id: string) => void
  onRemove: (id: string) => void
}) {
  const list = wishOrder(wishes)
  return (
    <section className="dash-card" aria-labelledby="wishlist-title">
      <h2 id="wishlist-title">Wishlist</h2>
      {list.length === 0 ? (
        <p className="muted small-text">Nothing on your wishlist yet.</p>
      ) : (
        <>
          <p className="muted small-text">{wishCountText(list)}</p>
          <ul className="book-list wish-list">
            {list.map((b) => {
              const href = buyHref(b.buyUrl)
              return (
                <li key={b.id} className="wish-row">
                  <div className="wish-cover">
                    {b.coverUrl ? (
                      <img src={coverAtSize(b.coverUrl, 'M')} alt="" loading="lazy" />
                    ) : (
                      <span className="wish-no-cover" style={{ background: b.color }} aria-hidden />
                    )}
                  </div>
                  <div className="wish-text">
                    <strong>{b.title}</strong>
                    <span className="muted small-text">{b.authors.join(', ') || 'Unknown author'}</span>
                    <span className="wish-actions">
                      {b.price !== undefined && <span className="wish-price">€{b.price.toFixed(2)}</span>}
                      {href && (
                        <a
                          className="btn small"
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Buy ${b.title}`}
                        >
                          Buy ›
                        </a>
                      )}
                      <button
                        type="button"
                        className="btn small primary"
                        aria-label={`I bought ${b.title}`}
                        onClick={() => onBought(b.id)}
                      >
                        I bought it ›
                      </button>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remove ${b.title} from the wishlist`}
                    onClick={() => onRemove(b.id)}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
