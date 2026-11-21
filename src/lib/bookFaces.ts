/**
 * Which of a book's cover faces get a painted picture (#181).
 *
 * Painting every face of every book took about 5 MB of picture memory per book
 * (the back and the stand-in front are 640 px wide), plus as much again on the
 * graphics chip: with a full shelf, more than a phone can hold. So:
 *
 * - the back is painted only once the book has been taken out, the only time
 *   it can be read;
 * - the stand-in front only when the book has no cover image, or it failed to load.
 *
 * Until then a face shows the book's plain colour.
 */
export function facesToPaint(o: { coverUrl?: string; coverFailed: boolean; takenOut: boolean }) {
  return {
    back: o.takenOut,
    fallback: !o.coverUrl || o.coverFailed,
  }
}
