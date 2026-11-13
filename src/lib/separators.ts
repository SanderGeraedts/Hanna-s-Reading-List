import type { Book, SortKey } from './library'
import { STATUS_LABELS, groupLabel, hexToHsl } from './library'
import { seriesGroups } from './series'
import { seriesReads } from './medals'
import type { Separator } from './shelfLayout'
import { themeFor } from './nookThemes'

/**
 * What stands between the groups of books for each arrangement (#17).
 *
 * Every group gets a book nook before it, with a scene that fits it and its
 * name on the hanging sign: the first group too, so the shelf starts with a
 * label, and small groups too. Hanna only wants the wide nooks, not the slim
 * dividers (#36). With just one group there's nothing to divide.
 */

interface Group {
  key: string
  label: string
  books: Book[]
  /** series only: every book of it on the shelf is read */
  complete?: boolean
  /** series only, when complete: how many times every book has been read, for the nook's medal */
  medal?: number
  /** genre only: the genre itself, to pick the scene */
  genre?: string
}

function firstLetter(title: string) {
  const t = title.replace(/^(the|a|an|der|die|das|de|het|een)\s+/i, '').trim()
  const c = t.normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toUpperCase()
  return /[A-Z]/.test(c) ? c : /[0-9]/.test(c) ? '0–9' : '…'
}

/** Colour families, as the eye sorts them. */
function colourFamily(hex: string) {
  const [h, s, l] = hexToHsl(hex)
  if (s < 0.12 || l < 0.08 || l > 0.94) return 'Black, white & grey'
  if (h < 15 || h >= 345) return 'Reds'
  if (h < 45) return 'Oranges & browns'
  if (h < 70) return 'Yellows'
  if (h < 170) return 'Greens'
  if (h < 260) return 'Blues'
  if (h < 310) return 'Purples'
  return 'Pinks'
}

/** The group a book belongs to in each arrangement: [key, sign label]. */
function groupOfBook(arrangement: SortKey, series: ReturnType<typeof seriesGroups>): (b: Book) => [string, string] {
  switch (arrangement) {
    case 'title':
      return (b) => {
        const l = firstLetter(b.title)
        return [l, l]
      }
    case 'author':
      return (b) => {
        const a = b.authors[0]?.trim() || 'Unknown author'
        return [a.toLowerCase(), a]
      }
    case 'series':
      return (b) => {
        const g = series.get(b.id)!
        return [g.key, g.name]
      }
    case 'genre':
    case 'language':
    case 'format':
      return (b) => {
        const l = groupLabel(arrangement, b)
        return [l, l]
      }
    case 'year':
      return (b) => {
        if (!b.year) return ['?', 'Year unknown']
        const d = `${Math.floor(b.year / 10) * 10}s`
        return [d, d]
      }
    case 'added':
      return (b) => {
        const y = String(new Date(b.addedAt).getFullYear())
        return [y, `Added in ${y}`]
      }
    case 'color':
      return (b) => {
        const f = colourFamily(b.color)
        return [f, f]
      }
    case 'status':
      return (b) => [b.status, STATUS_LABELS[b.status]]
  }
}

/** The groups in shelf order, by each group's first book (so a few dragged books don't split a group). */
export function shelfGroups(books: Book[], arrangement: SortKey): Group[] {
  const series = seriesGroups(books)
  const of = groupOfBook(arrangement, series)
  const groups = new Map<string, Group>()
  for (const b of books) {
    const [key, label] = of(b)
    let g = groups.get(key)
    if (!g) {
      g = { key, label, books: [], ...(arrangement === 'genre' && b.genres?.[0] && { genre: b.genres[0] }) }
      groups.set(key, g)
    }
    g.books.push(b)
  }
  const out = [...groups.values()]
  if (arrangement === 'series') {
    for (const g of out)
      if (g.key && g.books.every((b) => b.status === 'read')) {
        g.complete = true
        const reads = seriesReads(g.books)
        if (reads > 0) g.medal = reads
      }
  }
  return out
}

/** book id -> the nook that stands just before it. */
export function arrangementSeparators(books: Book[], arrangement: SortKey | null | undefined): Map<string, Separator> {
  const out = new Map<string, Separator>()
  if (!arrangement) return out
  const groups = shelfGroups(books, arrangement)
  if (groups.length < 2) return out
  // sorted by series but no series has two books: nothing to divide
  if (arrangement === 'series' && !groups.some((g) => g.key)) return out

  for (const g of groups) {
    const { theme, variant } = themeFor(g.label, g.books, g.genre)
    out.set(g.books[0].id, {
      kind: 'nook',
      label: g.label,
      theme,
      variant,
      ...(g.complete && { complete: true }),
      ...(g.medal && { medal: g.medal }),
    })
  }
  return out
}
