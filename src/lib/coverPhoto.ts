/**
 * A cover of her own: a photo she takes of her copy, or an image file. Covers
 * are stored with the library in localStorage and ride along with every sync,
 * so a picture is scaled down and re-encoded as a JPEG before it is kept
 * (the shelf's send limit is 5.5 MB, see library.ts).
 *
 * Shared by the "Change cover" dialog (CoverPicker) and the cover step in the
 * add dialog (CoverStep, T-0070).
 */

export const UPLOAD_MAX_HEIGHT = 560
export const UPLOAD_QUALITY = 0.82

/** Scales a picture down and re-encodes it as JPEG, returning a data URL. */
export async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, UPLOAD_MAX_HEIGHT / bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', UPLOAD_QUALITY)
}
