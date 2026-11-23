import type { Book } from './library'

/**
 * How a book stands on the shelf (D-0044): standing with its spine to her,
 * face-out showing its cover, or lying flat with its spine to her.
 *
 * **Standing is the absence of the field.** `'standing'` is never written: a
 * book she never posed, and one she posed and set back to Standing, are
 * byte-for-byte the same. Anything unknown reads as standing, so a shelf saved
 * by a newer app still loads.
 */

export type BookPose = 'standing' | 'faceout' | 'flat'

export const POSES: Array<{ id: BookPose; label: string }> = [
  { id: 'standing', label: 'Standing' },
  { id: 'faceout', label: 'Face-out' },
  { id: 'flat', label: 'Lying flat' },
]

/** This book's pose; standing for no field, an unknown word, null or anything else. */
export function poseOf(book: Pick<Book, 'pose'> | undefined | null): BookPose {
  const raw = (book as { pose?: unknown } | undefined | null)?.pose
  return raw === 'faceout' || raw === 'flat' ? raw : 'standing'
}

/**
 * The patch that gives a book this pose. Standing clears the field (never
 * writes `'standing'`), so putting a book back leaves no trace.
 */
export function posePatch(pose: BookPose): Pick<Book, 'pose'> {
  return { pose: pose === 'standing' ? undefined : pose }
}

/** Her own name for the pose, for a label or a screen reader. */
export const poseLabel = (pose: BookPose): string => POSES.find((p) => p.id === pose)!.label
