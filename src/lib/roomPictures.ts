/**
 * How big the room's pictures are painted (D-0080 §2).
 *
 * The bookcase's wood was painted 2048 across and the floor 2048 × 1024, for a
 * phone screen 390 across. On a phone that is several times the detail the
 * screen can ever show, and it cost 22.6 MB of pictures in the phone's graphics
 * chip — the same with *Detailed books* off, so it was the room and not the
 * books (measured in T-0098).
 *
 * A phone paints them at half, which is a quarter of the bytes; a computer is
 * untouched. **The size is decided once, when the page opens**, and kept for
 * that visit: repainting when she turns her phone would stutter the shelf she is
 * looking at, to put back detail she would struggle to see (D-0080 §2).
 */

/** A screen whose shorter side is this or less counts as a phone, however it is held. */
export const PHONE_SIDE = 600

/** Half for a phone, whole for anything bigger. `side` is the screen's shorter side in CSS pixels. */
export const scaleFor = (side: number): number => (side > 0 && side <= PHONE_SIDE ? 0.5 : 1)

let decided: number | null = null

/**
 * The scale for this visit. Worked out the first time it is asked for and then
 * kept, so every picture in the room agrees and nothing repaints on a rotate.
 */
export function pictureScale(): number {
  if (decided === null) {
    decided =
      typeof window === 'undefined' ? 1 : scaleFor(Math.min(window.innerWidth || 0, window.innerHeight || 0))
  }
  return decided
}

/** One side of a picture at this visit's scale, never below 8 so nothing becomes a smudge. */
export const pictureSide = (side: number, scale = pictureScale()): number => Math.max(8, Math.round(side * scale))

/** Only for tests: forget what was decided, so the next call works it out again. */
export const forgetPictureScale = () => {
  decided = null
}
