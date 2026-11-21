/**
 * Which of a book's cover faces get a painted picture (#181).
 *
 * Painting every face of every book took about 5 MB of picture memory per book
 * (the back and the stand-in front are 640 px wide), plus as much again on the
 * graphics chip: with a full shelf, more than a phone can hold. So:
 *
 * - the back is painted only once the book has been taken out, the only time
 *   it can be read;
 * - the cover image is loaded, and the stand-in front painted (when the book
 *   has no cover image, or it failed to load), also only once it's taken out:
 *   on the shelf the fronts face the books next to them. Loading every cover
 *   at once still made Hanna's Android phone drop the shelf (#181, T-0003).
 *
 * Until then a face shows the book's plain colour.
 */
export function facesToPaint(o: { coverUrl?: string; coverFailed: boolean; takenOut: boolean }) {
  return {
    back: o.takenOut,
    cover: o.takenOut && !!o.coverUrl,
    fallback: o.takenOut && (!o.coverUrl || o.coverFailed),
  }
}

/** The longest side a cover image is kept at: sharp when taken out, without the megapixels some covers have. */
export const COVER_MAX_PX = 512

/** The size to draw a cover image at so it fits within COVER_MAX_PX, keeping its shape (never larger). */
export function coverSize(width: number, height: number, max = COVER_MAX_PX) {
  const scale = Math.min(1, max / Math.max(width, height, 1))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}
