import { formatDuration, parseDuration } from './listening'

/**
 * Typing in how far along a book is: as a percentage, a page number or a
 * listening time. Each turns into the same 0..1 progress. Returns null for
 * something that isn't a number, so the field can go back to what it was.
 */

const clamp = (n: number) => Math.min(1, Math.max(0, n))

/** "42", "42%", "42.5" or "42,5" */
export function progressFromPercent(text: string): number | null {
  const s = text.trim().replace('%', '').replace(',', '.').trim()
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  return clamp(Number(s) / 100)
}

/** a page number out of the book's pages */
export function progressFromPage(text: string, pages: number): number | null {
  const s = text.trim()
  if (!/^\d+$/.test(s) || pages <= 0) return null
  return clamp(Number(s) / pages)
}

/** a listening position, "3:20" or "3h 20m", out of the book's length in minutes */
export function progressFromTime(text: string, minutes: number): number | null {
  const at = parseDuration(text)
  if (at === null || minutes <= 0) return null
  return clamp(at / minutes)
}

/** The percentage to show: whole numbers, with one decimal only when it was typed that way. */
export function percentText(progress: number) {
  const pct = Math.round(progress * 1000) / 10
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1)
}

export const pageText = (progress: number, pages: number) => String(Math.round(progress * pages))

export const timeText = (progress: number, minutes: number) => formatDuration(Math.round(progress * minutes))
