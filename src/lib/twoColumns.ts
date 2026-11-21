/**
 * An arrangement of blocks in two columns, with some hidden: the Challenges
 * page's (and, before its sections, the dashboard's). Kept per device.
 */

export interface TwoColumns<T extends string> {
  columns: [T[], T[]]
  hidden: T[]
}

/** A saved arrangement made safe: unknown ids dropped, each once, new ones added where they are by default. */
export function cleanTwoColumns<T extends string>(raw: unknown, known: readonly T[], defaults: TwoColumns<T>): TwoColumns<T> {
  const r = (raw && typeof raw === 'object' ? raw : {}) as { columns?: unknown; hidden?: unknown }
  const seen = new Set<T>()
  const take = (list: unknown): T[] =>
    (Array.isArray(list) ? list : []).filter(
      (id): id is T => typeof id === 'string' && known.includes(id as T) && !seen.has(id as T) && !!seen.add(id as T),
    )
  const cols = Array.isArray(r.columns) ? r.columns : defaults.columns
  const columns: [T[], T[]] = [take(cols[0]), take(cols[1])]
  const hidden = take(r.hidden)
  for (const [c, list] of defaults.columns.entries()) for (const id of list) if (!seen.has(id)) columns[c].push(id), seen.add(id)
  // known ids that aren't in the defaults (e.g. her own challenges): at the end of the shorter column
  for (const id of known) if (!seen.has(id)) columns[columns[0].length <= columns[1].length ? 0 : 1].push(id), seen.add(id)
  return { columns, hidden }
}

const without = <T extends string>(l: TwoColumns<T>, id: T): TwoColumns<T> => ({
  columns: [l.columns[0].filter((x) => x !== id), l.columns[1].filter((x) => x !== id)],
  hidden: l.hidden.filter((x) => x !== id),
})

/** Moves a block to `index` in `column` (an index among the other blocks there). */
export function moveIn<T extends string>(l: TwoColumns<T>, id: T, column: 0 | 1, index: number): TwoColumns<T> {
  const next = without(l, id)
  const list = [...next.columns[column]]
  list.splice(Math.max(0, Math.min(index, list.length)), 0, id)
  next.columns[column] = list
  return next
}

/** Where a block is, or null when hidden. */
export function placeIn<T extends string>(l: TwoColumns<T>, id: T): { column: 0 | 1; index: number } | null {
  for (const column of [0, 1] as const) {
    const index = l.columns[column].indexOf(id)
    if (index >= 0) return { column, index }
  }
  return null
}

export function hideIn<T extends string>(l: TwoColumns<T>, id: T): TwoColumns<T> {
  const next = without(l, id)
  return { ...next, hidden: [...next.hidden, id] }
}

/** Brings a hidden block back at the top of the shorter column. */
export function showIn<T extends string>(l: TwoColumns<T>, id: T): TwoColumns<T> {
  const next = without(l, id)
  return moveIn(next, id, next.columns[0].length <= next.columns[1].length ? 0 : 1, 0)
}

/** The two columns as one list for a narrow screen, taking turns. */
export function oneColumn<T extends string>([a, b]: [T[], T[]]): T[] {
  const out: T[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i])
    if (b[i]) out.push(b[i])
  }
  return out
}
