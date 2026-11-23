/**
 * The dashboard layout (#85, #87): four sections (Today, Challenges, My stats,
 * Fun & memories), each with two columns of blocks stacked tightly, in the
 * order Hanna dragged them into. She can drag a block within its section and
 * to another one, fold a section shut, and hide blocks; what a block shows
 * comes from the shelf, so nothing is lost while one is hidden.
 *
 * On a narrow screen each section's two columns are shown as one, taking turns.
 * The layout is remembered per device; signed in, the favourites follow the
 * account (#182, see favourites.ts).
 */

export const BLOCKS = {
  waiting: 'Waiting for you',
  challenge: 'Monthly challenge',
  myyear: 'My year',
  next: 'What next?',
  newforyou: 'New for you',
  reading: 'Currently reading',
  series: 'Series',
  calendar: 'Calendar',
  pile: 'Want-to-read pile',
  onthisday: 'On this day',
  lent: 'Lent out',
  top: 'My ratings',
  fact: 'Fact of the day',
  pace: 'Finish by',
  authors: 'Favourite authors',
  wrapped: 'Year in review',
  bingo: 'Book bingo',
  recent: 'Newly added',
  alphabet: 'A–Z challenge',
  badges: 'Badges',
  tropes: 'Tropes & characters',
  covers: 'Cover wall',
  world: 'Where your books are set',
  again: 'Give it another try',
  creatures: 'Creatures',
  garden: 'Garden',
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
      ['challenge', 'creatures', 'garden', 'next', 'newforyou', 'recent'],
    ],
    challenges: [['alphabet'], ['bingo']],
    stats: [
      ['myyear', 'authors'],
      ['calendar', 'series', 'pile'],
    ],
    fun: [
      ['badges', 'tropes', 'fact', 'wrapped'],
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

/**
 * Blocks that became another block (T-0070, D-0060). A saved layout or a
 * starred favourite that names one of these keeps working: it reads as the
 * block that took its place, and the duplicates fold into one.
 *
 * `count` (Books read), `goal` (Reading goal) and the six big charts moved to
 * the Stats page; what is left of them on the dashboard is `myyear`, with
 * "Open ›" to that page.
 */
export const MERGED_INTO: Readonly<Record<string, BlockId>> = {
  count: 'myyear',
  goal: 'myyear',
  heatmap: 'myyear',
  months: 'myyear',
  flower: 'myyear',
  rhythm: 'myyear',
  breakdown: 'myyear',
  records: 'myyear',
}

/** A saved id as it is read today: itself, or the block it became. */
export const asBlock = (id: unknown): unknown => (typeof id === 'string' && MERGED_INTO[id] ? MERGED_INTO[id] : id)

/** The ids a block used to be saved under, newest first; empty for a block that never moved. */
export const oldNamesOf = (id: BlockId): string[] =>
  Object.entries(MERGED_INTO)
    .filter(([, to]) => to === id)
    .map(([from]) => from)

const isBlock = (id: unknown): id is BlockId => typeof id === 'string' && Object.hasOwn(BLOCKS, id)
const isSection = (id: unknown): id is SectionId => typeof id === 'string' && Object.hasOwn(SECTIONS, id)
const isFold = (id: unknown): id is FoldId => id === 'favourites' || isSection(id)
const emptySections = (): Record<SectionId, Columns> =>
  Object.fromEntries(SECTION_IDS.map((s) => [s, [[], []]])) as unknown as Record<SectionId, Columns>

/**
 * A saved layout made safe: unknown blocks dropped, blocks that became another
 * block read as that one (`MERGED_INTO`, so her arrangement and her stars
 * survive a move), each block once, new blocks added in their section. A
 * layout saved before the sections had two long columns: each block goes to
 * its section, in her order and on her side.
 */
export function cleanLayout(raw: unknown): DashboardLayout {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const seen = new Set<BlockId>()
  const take = (list: unknown): BlockId[] =>
    (Array.isArray(list) ? list : [])
      .map(asBlock)
      .filter((id): id is BlockId => isBlock(id) && !seen.has(id) && !!seen.add(id))
  const sections = emptySections()
  const hasSections = !!r.sections && typeof r.sections === 'object'
  if (!hasSections && !Array.isArray(r.columns)) return structuredClone(DEFAULT_LAYOUT)

  // the sections come first, so a block that is both somewhere and "hidden"
  // (two merged blocks, one of each) stays where she can see it
  if (hasSections) {
    const saved = r.sections as Record<string, unknown>
    for (const s of SECTION_IDS) {
      const cols = Array.isArray(saved[s]) ? (saved[s] as unknown[]) : []
      sections[s] = [take(cols[0]), take(cols[1])]
    }
  } else {
    // before the sections: two long columns
    for (const c of [0, 1] as const) for (const id of take((r.columns as unknown[])[c])) sections[HOME[id]][c].push(id)
  }
  const hidden = take(r.hidden)

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
  const favourites = [
    ...new Set((Array.isArray(r.favourites) ? r.favourites : []).map(asBlock).filter(isBlock)),
  ].filter((id) => !hidden.includes(id))
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

/**
 * Moving within Favourites (T-0020, D-0028). The order of Favourites is the
 * order of `layout.favourites`, apart from each block's place in its own
 * section: these only ever change that order, never the sections, hidden or
 * folded, and never add or remove a favourite.
 *
 * `columns` is how many columns the grid shows: 2 (dealt left, right, left…
 * by favouriteColumns) or 1 on a narrow screen (the list itself).
 */

/** A favourite moved to list place `index` among the other favourites (the end when past it). */
export function moveFavouriteTo(layout: DashboardLayout, id: BlockId, index: number): DashboardLayout {
  if (!layout.favourites.includes(id)) return layout
  const others = layout.favourites.filter((x) => x !== id)
  others.splice(Math.max(0, Math.min(index, others.length)), 0, id)
  return { ...layout, favourites: others }
}

/**
 * A favourite dropped in column `column` before the block at row `row` of that
 * column (rows counted without the dragged block): list place `2 × row + column`
 * of the others with two columns, `row` with one, or the end when past it.
 */
export function moveFavourite(
  layout: DashboardLayout,
  id: BlockId,
  column: 0 | 1,
  row: number,
  columns: 1 | 2 = 2,
): DashboardLayout {
  return moveFavouriteTo(layout, id, columns === 2 ? 2 * row + column : row)
}

/** Where a favourite shows: its list place, and its column and row in the grid; null when it isn't one. */
export function favouritePlace(
  layout: DashboardLayout,
  id: BlockId,
  columns: 1 | 2 = 2,
): { index: number; column: 0 | 1; row: number } | null {
  const index = layout.favourites.indexOf(id)
  if (index < 0) return null
  return columns === 2 ? { index, column: (index % 2) as 0 | 1, row: Math.floor(index / 2) } : { index, column: 0, row: index }
}

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

/**
 * An arrow key on a favourite's handle. Two columns: Up/Down a row (−2/+2),
 * Left from the right column (−1), Right from the left one (+1). One column:
 * Up/Down one place, Left/Right nothing. At an edge the same layout comes back.
 */
export function stepFavourite(layout: DashboardLayout, id: BlockId, key: ArrowKey, columns: 1 | 2 = 2): DashboardLayout {
  const place = favouritePlace(layout, id, columns)
  if (!place) return layout
  const { index } = place
  const step =
    columns === 2
      ? { ArrowUp: -2, ArrowDown: 2, ArrowLeft: place.column === 1 ? -1 : 0, ArrowRight: place.column === 0 ? 1 : 0 }[key]
      : { ArrowUp: -1, ArrowDown: 1, ArrowLeft: 0, ArrowRight: 0 }[key]
  const to = index + step
  if (step === 0 || to < 0 || to > layout.favourites.length - 1) return layout
  return moveFavouriteTo(layout, id, to)
}

/** Adds a hidden block back in its own section, at the top of the shorter column, where she sees it straight away. */
export function showBlock(layout: DashboardLayout, id: BlockId): DashboardLayout {
  const next = without(layout, id)
  const section = HOME[id]
  const [a, b] = next.sections[section]
  const column = a.length <= b.length ? 0 : 1
  return { ...moveBlock(next, id, section, column, 0), folded: next.folded.filter((s) => s !== section) }
}

/**
 * "Reset" while arranging: the default order, nothing hidden or folded. The
 * favourites stay as they are: they follow the account, on every device (#182).
 */
export function resetLayout(layout: DashboardLayout): DashboardLayout {
  return { ...structuredClone(DEFAULT_LAYOUT), favourites: [...layout.favourites] }
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
