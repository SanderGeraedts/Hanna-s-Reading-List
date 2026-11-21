/**
 * The dashboard layout (#85, #87): four sections (Today, Challenges, My stats,
 * Fun & memories), each with two columns of blocks stacked tightly, in the
 * order Hanna dragged them into. She can drag a block within its section and
 * to another one, fold a section shut, and hide blocks; what a block shows
 * comes from the shelf, so nothing is lost while one is hidden.
 *
 * On a narrow screen each section's two columns are shown as one, taking turns.
 * The layout is remembered per device.
 */

export const BLOCKS = {
  waiting: 'Waiting for you',
  challenge: 'Monthly challenge',
  count: 'Books read',
  goal: 'Reading goal',
  next: 'What next?',
  newforyou: 'New for you',
  reading: 'Currently reading',
  series: 'Series',
  calendar: 'Calendar',
  breakdown: 'What I read',
  records: 'Records',
  pile: 'Want-to-read pile',
  onthisday: 'On this day',
  lent: 'Lent out',
  top: 'My ratings',
  fact: 'Fact of the day',
  pace: 'Finish by',
  heatmap: 'A year of reading',
  authors: 'Favourite authors',
  wrapped: 'Year in review',
  bingo: 'Book bingo',
  recent: 'Newly added',
  alphabet: 'A–Z challenge',
  badges: 'Badges',
  covers: 'Cover wall',
  rhythm: 'When I read most',
  flower: 'Genre flower',
  months: 'Pages per month',
  world: 'Where your books are set',
  again: 'Give it another try',
} as const

export type BlockId = keyof typeof BLOCKS

export const SECTIONS = {
  today: 'Today',
  challenges: 'Challenges',
  stats: 'My stats',
  fun: 'Fun & memories',
} as const

export type SectionId = keyof typeof SECTIONS
export const SECTION_IDS = Object.keys(SECTIONS) as SectionId[]

export type Columns = [BlockId[], BlockId[]]

/** What can be folded shut: a section, or the Favourites on top. */
export type FoldId = SectionId | 'favourites'

export interface DashboardLayout {
  sections: Record<SectionId, Columns>
  hidden: BlockId[]
  /** sections folded shut */
  folded: FoldId[]
  /** blocks starred as favourites, in the order she starred them: shown on top as well */
  favourites: BlockId[]
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  sections: {
    today: [
      ['waiting', 'reading', 'pace', 'lent', 'again'],
      ['challenge', 'next', 'newforyou', 'recent'],
    ],
    challenges: [['goal', 'alphabet'], ['bingo']],
    stats: [
      ['count', 'heatmap', 'breakdown', 'flower', 'authors'],
      ['calendar', 'months', 'records', 'rhythm', 'series', 'pile'],
    ],
    fun: [
      ['badges', 'fact', 'wrapped'],
      ['covers', 'world', 'top', 'onthisday'],
    ],
  },
  hidden: [],
  folded: [],
  favourites: [],
}

/** The section each block starts in (and comes back to when shown again). */
const HOME = Object.fromEntries(
  SECTION_IDS.flatMap((s) => DEFAULT_LAYOUT.sections[s].flat().map((id) => [id, s])),
) as Record<BlockId, SectionId>

const isBlock = (id: unknown): id is BlockId => typeof id === 'string' && Object.hasOwn(BLOCKS, id)
const isSection = (id: unknown): id is SectionId => typeof id === 'string' && Object.hasOwn(SECTIONS, id)
const isFold = (id: unknown): id is FoldId => id === 'favourites' || isSection(id)
const emptySections = (): Record<SectionId, Columns> =>
  Object.fromEntries(SECTION_IDS.map((s) => [s, [[], []]])) as unknown as Record<SectionId, Columns>

/**
 * A saved layout made safe: unknown blocks dropped (also the ones merged into
 * another, like Books per month), each block once, new blocks added in their
 * section. A layout saved before the sections had two long columns: each
 * block goes to its section, in her order and on her side.
 */
export function cleanLayout(raw: unknown): DashboardLayout {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const seen = new Set<BlockId>()
  const take = (list: unknown): BlockId[] =>
    (Array.isArray(list) ? list : []).filter((id): id is BlockId => isBlock(id) && !seen.has(id) && !!seen.add(id))
  const sections = emptySections()

  const hidden = take(r.hidden)
  if (r.sections && typeof r.sections === 'object') {
    const saved = r.sections as Record<string, unknown>
    for (const s of SECTION_IDS) {
      const cols = Array.isArray(saved[s]) ? (saved[s] as unknown[]) : []
      sections[s] = [take(cols[0]), take(cols[1])]
    }
  } else if (Array.isArray(r.columns)) {
    // before the sections: two long columns
    for (const c of [0, 1] as const) for (const id of take((r.columns as unknown[])[c])) sections[HOME[id]][c].push(id)
  } else {
    return structuredClone(DEFAULT_LAYOUT)
  }

  // "Waiting for you" goes first, also on a dashboard arranged before it existed
  if (!seen.has('waiting')) sections.today[0].unshift('waiting'), seen.add('waiting')
  // blocks added to the app later go where they are by default: after the
  // block they follow there when she has it in that column, else at the end
  for (const s of SECTION_IDS)
    for (const [c, list] of DEFAULT_LAYOUT.sections[s].entries())
      list.forEach((id, i) => {
        if (seen.has(id)) return
        const col = sections[s][c]
        const after = list.slice(0, i).reverse().find((prev) => col.includes(prev))
        col.splice(after ? col.indexOf(after) + 1 : col.length, 0, id)
        seen.add(id)
      })

  const folded = (Array.isArray(r.folded) ? r.folded : []).filter(isFold)
  // favourites: known blocks, each once, not hidden
  const favourites = [...new Set((Array.isArray(r.favourites) ? r.favourites : []).filter(isBlock))].filter(
    (id) => !hidden.includes(id),
  )
  return { sections, hidden, folded: [...new Set(folded)], favourites }
}

const without = (layout: DashboardLayout, id: BlockId): DashboardLayout => ({
  sections: Object.fromEntries(
    SECTION_IDS.map((s) => [s, layout.sections[s].map((col) => col.filter((x) => x !== id))]),
  ) as unknown as Record<SectionId, Columns>,
  hidden: layout.hidden.filter((x) => x !== id),
  folded: layout.folded,
  favourites: layout.favourites,
})

/** Moves a block to `index` in a section's column (an index among the other blocks there). */
export function moveBlock(
  layout: DashboardLayout,
  id: BlockId,
  section: SectionId,
  column: 0 | 1,
  index: number,
): DashboardLayout {
  const next = without(layout, id)
  const list = [...next.sections[section][column]]
  list.splice(Math.max(0, Math.min(index, list.length)), 0, id)
  next.sections[section][column] = list
  return next
}

/** Where a block is: its section, column and place, or null when hidden. */
export function placeOf(
  layout: DashboardLayout,
  id: BlockId,
): { section: SectionId; column: 0 | 1; index: number } | null {
  for (const section of SECTION_IDS)
    for (const column of [0, 1] as const) {
      const index = layout.sections[section][column].indexOf(id)
      if (index >= 0) return { section, column, index }
    }
  return null
}

/** Hiding a block also takes it out of the favourites. */
export function hideBlock(layout: DashboardLayout, id: BlockId): DashboardLayout {
  const next = without(layout, id)
  return { ...next, hidden: [...next.hidden, id], favourites: next.favourites.filter((x) => x !== id) }
}

/** Stars a block as a favourite (at the end), or takes the star off. */
export function toggleFavourite(layout: DashboardLayout, id: BlockId): DashboardLayout {
  const favourites = layout.favourites.includes(id)
    ? layout.favourites.filter((x) => x !== id)
    : [...layout.favourites, id]
  return { ...layout, favourites }
}

/** The favourites in two columns, taking turns: first left, second right, … */
export function favouriteColumns(layout: DashboardLayout): Columns {
  return [layout.favourites.filter((_, i) => i % 2 === 0), layout.favourites.filter((_, i) => i % 2 === 1)]
}

/** Adds a hidden block back in its own section, at the top of the shorter column, where she sees it straight away. */
export function showBlock(layout: DashboardLayout, id: BlockId): DashboardLayout {
  const next = without(layout, id)
  const section = HOME[id]
  const [a, b] = next.sections[section]
  const column = a.length <= b.length ? 0 : 1
  return { ...moveBlock(next, id, section, column, 0), folded: next.folded.filter((s) => s !== section) }
}

/** Folds a section shut, or opens it. */
export function toggleFold(layout: DashboardLayout, section: FoldId): DashboardLayout {
  const folded = layout.folded.includes(section)
    ? layout.folded.filter((s) => s !== section)
    : [...layout.folded, section]
  return { ...layout, folded }
}

/** A section's two columns as one list for a narrow screen, taking turns: left, right, left… */
export function singleColumn([a, b]: Columns): BlockId[] {
  const out: BlockId[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i])
    if (b[i]) out.push(b[i])
  }
  return out
}
