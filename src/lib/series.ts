import type { Book } from './library'

export interface SeriesInfo {
  name: string
  /** position in the series, when known */
  index?: number
}

const NUMBER_WORD = String.raw`(?:teil|band|buch|book|vol\.?|volume|part|deel|tome|#)`

/**
 * Reads a series from common title shapes:
 *   "Percy Jackson, Teil 4: Die Schlacht um das Labyrinth"
 *   "Die Kane-Chroniken 2: Der Feuerthron"
 *   "Das Haus des Hades - Helden des Olymp 4"
 *   "The Dark Talent: Alcatraz vs. the Evil Librarians, Book 5"
 *   "Dune Messiah (Dune Chronicles, #2)"
 */
export function seriesFromTitle(title: string): SeriesInfo | undefined {
  const found = matchSeries(title.trim())
  // "Diebe im Olymp - Percy Jackson 1": the series is the part after the dash
  return found && { ...found, name: found.name.split(/\s[-–—]\s/).pop()!.trim() }
}

function matchSeries(t: string): SeriesInfo | undefined {
  let m = t.match(/\(([^()]+?),?\s*#\s*(\d+(?:\.\d+)?)\)/)
  if (m) return { name: m[1].trim(), index: Number(m[2]) }
  m = t.match(new RegExp(String.raw`^(.+?),?\s+${NUMBER_WORD}\s*(\d+)\b`, 'i'))
  if (m && !m[1].includes(':')) return { name: m[1].trim(), index: Number(m[2]) }
  m = t.match(new RegExp(String.raw`:\s*(.+?),?\s+${NUMBER_WORD}\s*(\d+)\s*$`, 'i'))
  if (m) return { name: m[1].trim(), index: Number(m[2]) }
  m = t.match(/^(.+?)\s+(\d{1,2})\s*:/)
  if (m) return { name: m[1].trim(), index: Number(m[2]) }
  m = t.match(/\s[-–—]\s+(.+?)\s+(\d{1,2})\s*$/)
  if (m) return { name: m[1].trim(), index: Number(m[2]) }
  return undefined
}

const TRAILING_FILLER = /\s+(and|the|of|vs\.?|versus|und|der|die|das|en|de|het)$/i

function surname(b: Book) {
  return (b.authors[0] ?? '').trim().split(/\s+/).pop()?.toLowerCase() ?? ''
}

/**
 * Series for every book: the one entered by hand, else one read from the title,
 * else a shared opening ("Harry Potter and the …", "Alcatraz Versus …") among
 * two or more books by the same author.
 */
export function detectSeries(books: Book[]): Map<string, SeriesInfo> {
  const out = new Map<string, SeriesInfo>()
  const rest: Book[] = []
  for (const b of books) {
    const manual = b.series?.trim()
    const info = manual ? { name: manual, index: b.seriesIndex } : seriesFromTitle(b.title)
    if (info) out.set(b.id, info)
    else rest.push(b)
  }

  // shared title openings, per author
  const byAuthor = new Map<string, Book[]>()
  for (const b of rest) {
    const key = surname(b)
    if (!key) continue
    byAuthor.set(key, [...(byAuthor.get(key) ?? []), b])
  }
  for (const group of byAuthor.values()) {
    if (group.length < 2) continue
    const words = new Map<string, string[]>(group.map((b) => [b.id, b.title.split(/\s+/)]))
    for (const b of group) {
      if (out.has(b.id)) continue
      const mine = words.get(b.id)!
      // longest opening of at least two words shared with another book
      let best = 0
      for (const other of group) {
        if (other === b) continue
        const theirs = words.get(other.id)!
        let n = 0
        while (n < mine.length && n < theirs.length && mine[n].toLowerCase() === theirs[n].toLowerCase()) n++
        if (n < mine.length && n < theirs.length) best = Math.max(best, n)
      }
      if (best < 2) continue
      const opening = mine.slice(0, best).join(' ')
      let core = opening
      while (TRAILING_FILLER.test(core)) core = core.replace(TRAILING_FILLER, '')
      if (core.length < 3) continue
      // "Harry Potter and the …": name it by the opening the titles share
      const name = core === opening ? opening : `${opening} …`
      for (const other of group) {
        if (!out.has(other.id) && other.title.toLowerCase().startsWith(core.toLowerCase() + ' ')) {
          out.set(other.id, { name })
        }
      }
    }
  }
  return out
}
