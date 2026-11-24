import type { Book } from '#/lib/library'
import { buyHref } from '#/lib/wishlist'

interface Props {
  book: Book
  /** "I bought it ›": the book joins the shelf today and the follow-up opens */
  onBought: () => void
  onRemove: () => void
}

/**
 * The wishlist row on an open wish (D-0074 §5), at the top of Details.
 *
 * Everything the Wishlist dashboard block could do, now that the wishlist is a
 * bookcase instead of a block: what it costs, where to buy it, buying it, and
 * taking it off the list. `buyHref` is the same https/http-only gate the block
 * used (D-0053), so a link pasted on another device can never put something
 * else behind the button.
 */
export function WishRow({ book, onBought, onRemove }: Props) {
  const href = buyHref(book.buyUrl)
  return (
    <div className="field wish-row-panel" role="group" aria-labelledby="wish-label">
      <span id="wish-label">Wishlist</span>
      <p className="muted small-text">
        {book.price !== undefined ? `€${book.price.toFixed(2)} · not on your shelf yet` : 'Not on your shelf yet'}
      </p>
      <div className="wish-actions">
        <button className="btn primary small" onClick={onBought}>
          I bought it ›
        </button>
        {href && (
          <a className="btn small" href={href} target="_blank" rel="noreferrer" aria-label={`Buy ${book.title}`}>
            Buy ›
          </a>
        )}
        <button className="btn small danger" onClick={onRemove}>
          Remove from the wishlist
        </button>
      </div>
    </div>
  )
}
