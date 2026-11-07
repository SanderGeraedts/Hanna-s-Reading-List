import type { SearchResult } from '#/server/openLibrary'
import type { GoogleVolume } from './googleVolume'
import { sameBook } from './storytelImport'

/** A search result from Open Library or, for books it doesn't have, Google Books (#67). */
export type Found =
  | { key: string; source: 'ol'; r: SearchResult }
  | { key: string; source: 'google'; v: GoogleVolume }

/** Open Library's results, then Google's books that aren't among them. */
export function combineResults(ol: SearchResult[], google: GoogleVolume[]): Found[] {
  const out: Found[] = ol.map((r) => ({ key: r.workKey, source: 'ol', r }))
  for (const v of google) {
    const dup = ol.some((r) => (r.isbn && v.isbn && r.isbn === v.isbn) || sameBook(r, v))
    if (!dup) out.push({ key: `google:${v.googleId}`, source: 'google', v })
  }
  return out.slice(0, 18)
}
