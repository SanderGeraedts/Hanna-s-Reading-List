import type { Book, BookFormat } from './library'
import { FORMAT_LABELS, formatsOf } from './library'
import { languageName } from './languages'
import { seriesGroups } from './series'
import { sleepReadIds } from './sleepSeries'
import { allFinishes } from './stats'
import { hasTrope, shelfTropes } from './tropes'

/**
 * Her own challenges: a name, a number of books and a rule, for one year,
 * e.g. "5 fantasy books in 2027" or "10 from my pile". Kept on the server with
 * the shelf so every device shows them. Sleep reads never count.
 */

export type RuleKind = 'any' | 'pile' | 'genre' | 'trope' | 'language' | 'format' | 'series'

export interface OwnChallenge {
  id: string
  name: string
  /** how many books */
  target: number
  year: number
  rule: RuleKind
  /** the genre, language code, format or series key the rule is about */
  value?: string
}

export const RULE_LABELS: Record<RuleKind, string> = {
  any: 'Any book',
  pile: 'From my pile',
  genre: 'A genre',
  trope: 'A trope',
  language: 'A language',
  format: 'A format',
  series: 'A series',
}

/** rules that need a value picked */
export const needsValue = (rule: RuleKind) => rule !== 'any' && rule !== 'pile'

export const MAX_CHALLENGES = 50
export const MAX_TARGET = 500
const MAX_NAME = 60

const RULES = Object.keys(RULE_LABELS) as RuleKind[]

/** A saved list made safe: bad entries dropped, names trimmed, at most MAX_CHALLENGES. */
export function cleanChallenges(raw: unknown): OwnChallenge[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: OwnChallenge[] = []
  for (const c of raw) {
    if (!c || typeof c !== 'object') continue
    const { id, name, target, year, rule, value } = c as Record<string, unknown>
    if (typeof id !== 'string' || !/^[\w-]{1,40}$/.test(id) || seen.has(id)) continue
    if (typeof name !== 'string' || !name.trim()) continue
    if (!Number.isInteger(target) || (target as number) < 1 || (target as number) > MAX_TARGET) continue
    if (!Number.isInteger(year) || (year as number) < 1900 || (year as number) > 3000) continue
    if (!RULES.includes(rule as RuleKind)) continue
    if (needsValue(rule as RuleKind) && (typeof value !== 'string' || !value)) continue
    seen.add(id)
    out.push({
      id,
      name: name.trim().slice(0, MAX_NAME),
      target: target as number,
      year: year as number,
      rule: rule as RuleKind,
      ...(needsValue(rule as RuleKind) && { value: (value as string).slice(0, 100) }),
    })
    if (out.length >= MAX_CHALLENGES) break
  }
  return out
}

/** What the Pile challenge button fills in (T-0014): she can change anything before saving. */
export const PILE_CHALLENGE: Omit<OwnChallenge, 'id' | 'year'> = { name: 'Pile challenge', target: 12, rule: 'pile' }

export const newChallengeId =() => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** Whether a book fits the rule (sleep reads aside). */
function fits(c: OwnChallenge, book: Book, series: ReturnType<typeof seriesGroups>) {
  switch (c.rule) {
    case 'any':
      return true
    case 'pile':
      // on her shelf before the year began
      return book.addedAt < new Date(c.year, 0, 1).getTime()
    case 'genre':
      return !!book.genres?.includes(c.value!)
    case 'trope':
      return hasTrope(book, c.value!)
    case 'language':
      return book.language === c.value
    case 'format':
      return formatsOf(book).includes(c.value as BookFormat)
    case 'series':
      return series.get(book.id)?.key === c.value
  }
}

/** The books that count for a challenge: finished in its year, fitting the rule, not a sleep read. Latest first. */
export function challengeBooks(c: OwnChallenge, books: Book[]): Book[] {
  const sleep = sleepReadIds(books)
  const series = seriesGroups(books)
  const last = new Map<string, string>()
  for (const f of allFinishes(books)) {
    if (!f.day?.startsWith(`${c.year}-`) || sleep.has(f.book.id) || !fits(c, f.book, series)) continue
    if ((last.get(f.book.id) ?? '') < f.day) last.set(f.book.id, f.day)
  }
  return books.filter((b) => last.has(b.id)).sort((a, b) => last.get(b.id)!.localeCompare(last.get(a.id)!))
}

/** The values to pick from for a rule, from the books on her shelf. */
export function ruleOptions(rule: RuleKind, books: Book[]): Array<{ value: string; label: string }> {
  const count = (values: string[]) => {
    const n = new Map<string, number>()
    for (const v of values) n.set(v, (n.get(v) ?? 0) + 1)
    return [...n.keys()]
  }
  switch (rule) {
    case 'genre':
      return count(books.flatMap((b) => b.genres ?? []))
        .sort((a, b) => a.localeCompare(b))
        .map((g) => ({ value: g, label: g }))
    case 'trope':
      return shelfTropes(books)
        .sort((a, b) => a.localeCompare(b))
        .map((t) => ({ value: t, label: t }))
    case 'language':
      return count(books.flatMap((b) => (b.language ? [b.language] : [])))
        .map((l) => ({ value: l, label: languageName(l) }))
        .sort((a, b) => a.label.localeCompare(b.label))
    case 'format':
      return (Object.keys(FORMAT_LABELS) as BookFormat[]).map((f) => ({ value: f, label: FORMAT_LABELS[f] }))
    case 'series': {
      const groups = new Map<string, string>()
      for (const g of seriesGroups(books).values()) if (g.key) groups.set(g.key, g.name)
      return [...groups].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
    }
    default:
      return []
  }
}

/** A short line saying what counts, e.g. "Fantasy books" or "Books from your pile". */
export function ruleText(c: OwnChallenge, books: Book[]): string {
  if (c.rule === 'any') return 'Any book you finish'
  if (c.rule === 'pile') return `Books on your shelf before ${c.year}`
  const label = ruleOptions(c.rule, books).find((o) => o.value === c.value)?.label ?? c.value
  if (c.rule === 'genre' || c.rule === 'trope') return `${label} books`
  if (c.rule === 'language') return `Books in ${label}`
  if (c.rule === 'format') return `${label} books`
  return `Books from ${label}`
}
