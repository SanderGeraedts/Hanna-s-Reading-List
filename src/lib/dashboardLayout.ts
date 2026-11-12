/**
 * The dashboard layout (#85, #87): two columns of blocks, each stacked
 * tightly so there are no big gaps, in the order Hanna dragged them into.
 * Blocks she hides are left out until she adds them back; what they show
 * comes from the shelf, so nothing is lost while one is hidden.
 *
 * On a narrow screen the two columns are shown as one, taking turns.
 */

export const BLOCKS = {
  count: 'Books read',
  goal: 'Reading goal',
  next: 'What next?',
  reading: 'Currently reading',
  series: 'Series',
  monthly: 'Books per month',
  calendar: 'Calendar',
  breakdown: 'What I read',
  records: 'Records',
  pile: 'Want-to-read pile',
  streak: 'Reading streak',
  onthisday: 'On this day',
  lent: 'Lent out',
  fact: 'Book fact',
} as const

export type BlockId = keyof typeof BLOCKS

export interface DashboardLayout {
  columns: [BlockId[], BlockId[]]
  hidden: BlockId[]
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  columns: [
    ['count', 'reading', 'monthly', 'breakdown', 'records', 'onthisday', 'fact'],
    ['goal', 'next', 'calendar', 'series', 'streak', 'pile', 'lent'],
  ],
  hidden: [],
}

const isBlock = (id: unknown): id is BlockId => typeof id === 'string' && Object.hasOwn(BLOCKS, id)

/** A saved layout made safe: unknown blocks dropped, each block once, new blocks added. */
export function cleanLayout(raw: unknown): DashboardLayout {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof DashboardLayout, unknown>>
  const seen = new Set<BlockId>()
  const take = (list: unknown): BlockId[] =>
    (Array.isArray(list) ? list : []).filter((id): id is BlockId => isBlock(id) && !seen.has(id) && !!seen.add(id))
  const cols = Array.isArray(r.columns) ? r.columns : DEFAULT_LAYOUT.columns
  const columns: [BlockId[], BlockId[]] = [take(cols[0]), take(cols[1])]
  const hidden = take(r.hidden)
  // blocks added to the app later go where they are by default
  for (const [c, list] of DEFAULT_LAYOUT.columns.entries()) {
    for (const id of list) if (!seen.has(id)) columns[c].push(id), seen.add(id)
  }
  return { columns, hidden }
}

const without = (layout: DashboardLayout, id: BlockId): DashboardLayout => ({
  columns: [layout.columns[0].filter((x) => x !== id), layout.columns[1].filter((x) => x !== id)],
  hidden: layout.hidden.filter((x) => x !== id),
})

/** Moves a block to `index` in column `column` (an index among the other blocks of that column). */
export function moveBlock(layout: DashboardLayout, id: BlockId, column: 0 | 1, index: number): DashboardLayout {
  const next = without(layout, id)
  const list = [...next.columns[column]]
  list.splice(Math.max(0, Math.min(index, list.length)), 0, id)
  next.columns[column] = list
  return next
}

/** Where a block is: its column and place in it, or null when hidden. */
export function placeOf(layout: DashboardLayout, id: BlockId): { column: 0 | 1; index: number } | null {
  for (const column of [0, 1] as const) {
    const index = layout.columns[column].indexOf(id)
    if (index >= 0) return { column, index }
  }
  return null
}

export function hideBlock(layout: DashboardLayout, id: BlockId): DashboardLayout {
  const next = without(layout, id)
  return { ...next, hidden: [...next.hidden, id] }
}

/** Adds a hidden block back, at the top of the shorter column, where she sees it straight away. */
export function showBlock(layout: DashboardLayout, id: BlockId): DashboardLayout {
  const next = without(layout, id)
  const column = next.columns[0].length <= next.columns[1].length ? 0 : 1
  return moveBlock(next, id, column, 0)
}

/** The two columns as one list for a narrow screen, taking turns: left, right, left… */
export function singleColumn(layout: DashboardLayout): BlockId[] {
  const [a, b] = layout.columns
  const out: BlockId[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i])
    if (b[i]) out.push(b[i])
  }
  return out
}
