/**
 * The ways the shelf can be arranged. Kept in its own module so the server
 * (which checks a saved arrangement) and the app share one list.
 */
export const SORT_KEYS = [
  'title',
  'author',
  'series',
  'genre',
  'language',
  'format',
  'year',
  'color',
  'added',
  'status',
] as const

export type SortKey = (typeof SORT_KEYS)[number]

const known = new Set<string>(SORT_KEYS)

export function isSortKey(v: unknown): v is SortKey {
  return typeof v === 'string' && known.has(v)
}
