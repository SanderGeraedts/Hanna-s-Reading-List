import type { Book } from './library'
import { FORMAT_LABELS, STATUS_LABELS, formatOf } from './library'
import { languageName, nativeLanguageName } from './languages'
import type { SeriesInfo } from './series'

export interface SearchHit {
  book: Book
  /** why it matched, when that isn't obvious from the title and author */
  hint?: string
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')

/**
 * Books matching every word of the query, in any of: title (also the original
 * one), author, series, genre, language, how she has it, who it's lent to and
 * reading status. Title matches come first.
 */
export function searchShelf(books: Book[], query: string, detected?: Map<string, SeriesInfo>): SearchHit[] {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return []
  const hits: Array<SearchHit & { score: number }> = []

  for (const book of books) {
    const series = book.series ?? detected?.get(book.id)?.name
    const format = formatOf(book)
    const fields: Array<{ text: string; weight: number; hint?: string }> = [
      { text: book.title, weight: 4 },
      { text: book.originalTitle ?? '', weight: 3, hint: `Was “${book.originalTitle}”` },
      { text: book.authors.join(' '), weight: 3 },
      { text: series ?? '', weight: 2, hint: `Series: ${series}` },
      { text: (book.genres ?? []).join(' '), weight: 2, hint: book.genres?.join(', ') },
      {
        text: book.language ? `${languageName(book.language)} ${nativeLanguageName(book.language)}` : '',
        weight: 1,
        hint: book.language && languageName(book.language),
      },
      { text: format ? FORMAT_LABELS[format] : '', weight: 1, hint: format && FORMAT_LABELS[format] },
      {
        text: book.lent ? `lent ${book.lent.to}` : '',
        weight: 1,
        hint: book.lent && `Lent to ${book.lent.to || 'a friend'}`,
      },
      { text: STATUS_LABELS[book.status], weight: 1, hint: STATUS_LABELS[book.status] },
    ]
    const folded = fields.map((f) => fold(f.text))
    let score = 0
    let hint: string | undefined
    const ok = terms.every((term) => {
      let best = -1
      folded.forEach((text, i) => {
        if (!text.includes(term)) return
        // a match at the start of a word counts a little more
        const w = fields[i].weight + (new RegExp(`(^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text) ? 0.5 : 0)
        if (best === -1 || w > fields[best].weight) best = i
        score += w
      })
      if (best === -1) return false
      if (fields[best].weight < 3 && !hint) hint = fields[best].hint
      return true
    })
    if (ok) hits.push({ book, hint, score })
  }

  return hits.sort((a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title))
}
