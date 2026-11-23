import type { Book, BookFormat } from './library'
import { FORMAT_LABELS, formatsOf, timesRead } from './library'
import { authorKey, pubYear } from './bingo'
import { languageName } from './languages'
import { thicknessPages } from './listening'
import { cleanRating } from './ratings'
import { seriesGroups } from './series'
import { sleepReadIds } from './sleepSeries'
import { allFinishes } from './stats'
import { hasTrope, shelfTropes } from './tropes'

/**
 * Her own challenges: a name, a goal and a rule, for one year, e.g. "5 fantasy
 * books in 2027", "2000 pages from my pile" or "10 fantasy books by Sarah J.
 * Maas". Kept on the server with the shelf so every device shows them. Sleep
 * reads never count.
 *
 * D-0062: the goal has a unit (books, pages or hours), there are rules for the
 * author, the decade published, a 4+ rating and finishing a series, and two
 * rules can be combined with AND. Every new field is optional and left out when
 * it is the default, so a challenge saved before them is byte-for-byte what it
 * was, and `cleanChallenges` — which `src/server/shelf.ts` imports, and which is
 * not a code-owner path — keeps them all.
 */

export type RuleKind =
  | 'any'
  | 'pile'
  | 'genre'
  | 'trope'
  | 'author'
  | 'decade'
  | 'rating4'
  | 'language'
  | 'format'
  | 'series'
  | 'finishseries'

/** What a goal counts; `books` is the default and is never written. */
export type GoalUnit = 'books' | 'pages' | 'hours'

export interface OwnChallenge {
  id: string
  name: string
  /** how many books, pages or hours */
  target: number
  year: number
  rule: RuleKind
  /** the genre, trope, author, decade, language code, format or series key the rule is about */
  value?: string
  /** what the target counts; left out means 'books' (D-0062 §1) */
  unit?: 'pages' | 'hours'
  /** a second rule that must hold as well (AND) */
  and?: RuleKind
  /** the second rule's value, when it needs one */
  andValue?: string
}

export const RULE_LABELS: Record<RuleKind, string> = {
  any: 'Any book',
  pile: 'From my pile',
  genre: 'A genre',
  trope: 'A trope',
  author: 'By author',
  decade: 'From a decade',
  rating4: 'Rated 4+',
  language: 'A language',
  format: 'A format',
  series: 'A series',
  finishseries: 'Finish a series',
}

/** The order the rule list is shown in. */
export const RULES: readonly RuleKind[] = [
  'any',
  'pile',
  'genre',
  'trope',
  'author',
  'decade',
  'rating4',
  'language',
  'format',
  'series',
  'finishseries',
]

/** Rules that need no value of their own. */
const NO_VALUE: readonly RuleKind[] = ['any', 'pile', 'rating4']

/** rules that need a value picked */
export const needsValue = (rule: RuleKind) => !NO_VALUE.includes(rule)

/** The rules that may be the second half of an AND (D-0062 §3). */
export const andRules = (first: RuleKind): RuleKind[] =>
  RULES.filter((r) => r !== 'any' && r !== 'finishseries' && r !== first)

/** Whether a rule can have a second rule at all. */
export const canCombine = (rule: RuleKind) => rule !== 'any' && rule !== 'finishseries'

export const UNIT_LABELS: Record<GoalUnit, string> = { books: 'Books', pages: 'Pages', hours: 'Hours' }
export const UNITS: readonly GoalUnit[] = ['books', 'pages', 'hours']

export const MAX_CHALLENGES = 50
/** the most books a challenge can ask for */
export const MAX_TARGET = 500
/** the most pages or hours a challenge can ask for (D-0062 §4) */
export const MAX_TARGET_BIG = 100_000
const MAX_NAME = 60

export const maxTarget = (unit: GoalUnit) => (unit === 'books' ? MAX_TARGET : MAX_TARGET_BIG)
export const unitOf = (c: Pick<OwnChallenge, 'unit'>): GoalUnit => c.unit ?? 'books'

/** A saved list made safe: bad entries dropped, names trimmed, at most MAX_CHALLENGES. */
export function cleanChallenges(raw: unknown): OwnChallenge[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: OwnChallenge[] = []
  for (const c of raw) {
    if (!c || typeof c !== 'object') continue
    const { id, name, target, year, rule, value, unit, and, andValue } = c as Record<string, unknown>
    if (typeof id !== 'string' || !/^[\w-]{1,40}$/.test(id) || seen.has(id)) continue
    if (typeof name !== 'string' || !name.trim()) continue
    if (!RULES.includes(rule as RuleKind)) continue
    if (needsValue(rule as RuleKind) && (typeof value !== 'string' || !value)) continue
    // the unit decides what a target may be, so it is read first
    const goalUnit: GoalUnit = unit === 'pages' || unit === 'hours' ? unit : 'books'
    if (!Number.isInteger(target) || (target as number) < 1 || (target as number) > maxTarget(goalUnit)) continue
    if (!Number.isInteger(year) || (year as number) < 1900 || (year as number) > 3000) continue
    const first = rule as RuleKind
    const firstValue = needsValue(first) ? (value as string).slice(0, 100) : undefined
    // the second rule: dropped on its own, the challenge stays (D-0062 §3)
    let second: RuleKind | undefined
    let secondValue: string | undefined
    if (
      typeof and === 'string' &&
      RULES.includes(and as RuleKind) &&
      canCombine(first) &&
      andRules(first).includes(and as RuleKind)
    ) {
      const kind = and as RuleKind
      if (!needsValue(kind)) second = kind
      else if (typeof andValue === 'string' && andValue) {
        second = kind
        secondValue = andValue.slice(0, 100)
      }
    }
    seen.add(id)
    out.push({
      id,
      name: name.trim().slice(0, MAX_NAME),
      target: target as number,
      year: year as number,
      rule: first,
      ...(firstValue !== undefined && { value: firstValue }),
      ...(goalUnit !== 'books' && { unit: goalUnit }),
      ...(second && { and: second }),
      ...(secondValue !== undefined && { andValue: secondValue }),
    })
    if (out.length >= MAX_CHALLENGES) break
  }
  return out
}

/** What the Pile challenge button fills in (T-0014): she can change anything before saving. */
export const PILE_CHALLENGE: Omit<OwnChallenge, 'id' | 'year'> = { name: 'Pile challenge', target: 12, rule: 'pile' }

export const newChallengeId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

/** The decade a book was published in (1990 for 1990…1999), or undefined. */
export const decadeOf = (b: Book): number | undefined => {
  const y = pubYear(b)
  return y === undefined ? undefined : Math.floor(y / 10) * 10
}

/** Whether a book fits one rule (sleep reads aside). */
function fitsRule(rule: RuleKind, value: string | undefined, year: number, book: Book, series: ReturnType<typeof seriesGroups>) {
  switch (rule) {
    case 'any':
      return true
    case 'pile':
      // on her shelf before the year began
      return book.addedAt < new Date(year, 0, 1).getTime()
    case 'genre':
      return !!book.genres?.includes(value!)
    case 'trope':
      return hasTrope(book, value!)
    case 'author':
      return authorKey(book.authors[0] ?? '') !== '' && authorKey(book.authors[0] ?? '') === authorKey(value ?? '')
    case 'decade':
      return decadeOf(book) === Number(value)
    case 'rating4':
      return (cleanRating(book.rating) ?? 0) >= 4
    case 'language':
      return book.language === value
    case 'format':
      return formatsOf(book).includes(value as BookFormat)
    case 'series':
    case 'finishseries':
      return series.get(book.id)?.key === value
  }
}

/** Whether a book fits the challenge: its rule, and the second rule too when it has one. */
export function fits(c: OwnChallenge, book: Book, series: ReturnType<typeof seriesGroups>) {
  if (!fitsRule(c.rule, c.value, c.year, book, series)) return false
  return !c.and || fitsRule(c.and, c.andValue, c.year, book, series)
}

/**
 * The books that count for a challenge: finished in its year, fitting the rule,
 * not a sleep read. Latest first. A `finishseries` challenge is the one
 * exception: she is finishing a series, so every book of it she has ever read
 * counts (D-0061 §4).
 */
export function challengeBooks(c: OwnChallenge, books: Book[]): Book[] {
  const sleep = sleepReadIds(books)
  const series = seriesGroups(books)
  if (c.rule === 'finishseries')
    return books.filter((b) => !sleep.has(b.id) && timesRead(b) > 0 && fits(c, b, series))
  const last = new Map<string, string>()
  for (const f of allFinishes(books)) {
    if (!f.day?.startsWith(`${c.year}-`) || sleep.has(f.book.id) || !fits(c, f.book, series)) continue
    if ((last.get(f.book.id) ?? '') < f.day) last.set(f.book.id, f.day)
  }
  return books.filter((b) => last.has(b.id)).sort((a, b) => last.get(b.id)!.localeCompare(last.get(a.id)!))
}

/**
 * How far along a challenge is, in its unit: books counted, pages added up
 * (a book she only listens to brings its minutes, D-0008) or listening hours.
 */
export function challengeDone(c: OwnChallenge, counted: Book[]): number {
  switch (unitOf(c)) {
    case 'pages':
      return counted.reduce((n, b) => n + (thicknessPages(b) ?? 0), 0)
    case 'hours':
      return Math.floor(counted.reduce((n, b) => n + (b.minutes && b.minutes > 0 ? b.minutes : 0), 0) / 60)
    default:
      return counted.length
  }
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
    case 'author': {
      // one entry per folded author, in the spelling most of her books use; on a tie
      // the spelling it first got on the shelf wins, as a trope's does (D-0042 §4)
      const spellings = new Map<string, Map<string, { n: number; first: number }>>()
      let order = 0
      for (const b of books) {
        const name = b.authors[0]?.trim()
        if (!name) continue
        const key = authorKey(name)
        const seen = spellings.get(key) ?? new Map<string, { n: number; first: number }>()
        const have = seen.get(name)
        seen.set(name, { n: (have?.n ?? 0) + 1, first: have?.first ?? order++ })
        spellings.set(key, seen)
      }
      return [...spellings.values()]
        .map((seen) => [...seen].sort((a, b) => b[1].n - a[1].n || a[1].first - b[1].first)[0][0])
        .sort((a, b) => a.localeCompare(b))
        .map((a) => ({ value: a, label: a }))
    }
    case 'decade': {
      const decades = [...new Set(books.map(decadeOf).filter((d): d is number => d !== undefined))]
      return decades.sort((a, b) => b - a).map((d) => ({ value: String(d), label: `${d}s` }))
    }
    case 'language':
      return count(books.flatMap((b) => (b.language ? [b.language] : [])))
        .map((l) => ({ value: l, label: languageName(l) }))
        .sort((a, b) => a.label.localeCompare(b.label))
    case 'format':
      return (Object.keys(FORMAT_LABELS) as BookFormat[]).map((f) => ({ value: f, label: FORMAT_LABELS[f] }))
    case 'series':
    case 'finishseries': {
      const groups = new Map<string, string>()
      for (const g of seriesGroups(books).values()) if (g.key) groups.set(g.key, g.name)
      return [...groups].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
    }
    default:
      return []
  }
}

const labelFor = (rule: RuleKind, value: string | undefined, books: Book[]) =>
  ruleOptions(rule, books).find((o) => o.value === value)?.label ?? value ?? ''

/**
 * The phrase for one rule, in two halves: what comes before "books" and what
 * comes after, so two rules fold into one sentence ("Fantasy books by Sarah J.
 * Maas"). A rule that fits neither half gets `whole`.
 */
function rulePhrase(rule: RuleKind, value: string | undefined, year: number, books: Book[]) {
  const label = labelFor(rule, value, books)
  switch (rule) {
    case 'any':
      return { whole: 'Any book you finish' }
    case 'pile':
      return { whole: `Books on your shelf before ${year}` }
    case 'genre':
    case 'trope':
      return { before: label }
    case 'format':
      // "Audiobook books" reads oddly, so a format is a whole phrase of its own
      return { whole: `${label} books` }
    case 'author':
      return { after: `by ${label}` }
    case 'decade':
      // the shelf may no longer hold a book from that decade: "1990" is then the label
      return { after: `from the ${/^\d+$/.test(label) ? `${label}s` : label}` }
    case 'rating4':
      return { after: 'you rated 4+' }
    case 'language':
      return { after: `in ${label}` }
    case 'series':
      return { after: `from ${label}` }
    case 'finishseries':
      return { whole: `Every book of ${label}` }
  }
}

type Phrase = { whole?: string; before?: string; after?: string }

/** One phrase around the word "books": "Fantasy books", "Books by Sarah J. Maas". */
const onePhrase = (p: Phrase): string =>
  p.whole ?? `${p.before ? `${p.before} books` : 'Books'}${p.after ? ` ${p.after}` : ''}`

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** A short line saying what counts, e.g. "Fantasy books by Sarah J. Maas". */
export function ruleText(c: OwnChallenge, books: Book[]): string {
  const a = rulePhrase(c.rule, c.value, c.year, books) as Phrase
  if (!c.and) return onePhrase(a)
  const b = rulePhrase(c.and, c.andValue, c.year, books) as Phrase
  // both halves fit around one "books": "Fantasy books by Sarah J. Maas"
  if (!a.whole && !b.whole && !(a.before && b.before) && !(a.after && b.after))
    return onePhrase({ before: a.before ?? b.before, after: a.after ?? b.after })
  return `${onePhrase(a)} · and ${lowerFirst(onePhrase(b))}`
}

/** "3 of 5", "1,250 of 2,000 pages", "9 of 20 hours". */
export function doneText(c: OwnChallenge, done: number): string {
  const n = (x: number) => x.toLocaleString('en')
  const unit = unitOf(c)
  return `${n(done)} of ${n(c.target)}${unit === 'books' ? '' : ` ${unit}`}`
}
