import { createServerFn } from '@tanstack/react-start'
import type { Book } from '#/lib/library'
import { mergeIntoServer } from '#/lib/shelfMerge'
import { isSortKey, type SortKey } from '#/lib/sortKeys'
import { asUser, pb, tokenUserId } from './pocketbase'

/**
 * The signed-in user's shelf, kept in PocketBase as one `libraries` record per
 * user. PocketBase's rules make sure a token only ever sees its own record.
 */

interface ShelfRecord {
  id: string
  books: Book[] | null
  arrangement: string
  updated: string
}

export interface RemoteShelf {
  books: Book[]
  arrangement: SortKey | null
  /** when the server copy last changed, to notice edits from other devices */
  updated: string
}

async function findRecord(token: string) {
  const list = await pb<{ items: ShelfRecord[] }>(
    '/api/collections/libraries/records?perPage=1&skipTotal=1',
    { token },
  )
  return list.items[0] ?? null
}

const toShelf = (r: ShelfRecord): RemoteShelf => ({
  books: Array.isArray(r.books) ? r.books : [],
  arrangement: isSortKey(r.arrangement) ? r.arrangement : null,
  updated: r.updated,
})

/** The saved shelf, or null if this account has never saved one. */
export const loadShelf = createServerFn({ method: 'GET' }).handler(
  (): Promise<RemoteShelf | null> =>
    asUser(async (token) => {
      const r = await findRecord(token)
      return r ? toShelf(r) : null
    }),
)

export interface SaveResult {
  updated: string
  /**
   * Set when the server kept books the device didn't send, or kept its own
   * newer copy of a book: the shelf as saved, for the device to take over.
   */
  books?: Book[]
}

/**
 * Saves the shelf, folded into what the server has (see shelfMerge.ts): a save
 * can add and change books, but only removes the ones listed in `removed`.
 * Devices still running an older version send no `base`, so their saves are
 * always merged and can't drop anything.
 */
export const saveShelf = createServerFn({ method: 'POST' })
  .validator(
    (input: { books: Book[]; arrangement: SortKey | null; base?: string | null; removed?: string[] }) => {
      if (!Array.isArray(input?.books) || input.books.length > 20_000) throw new Error('Invalid shelf.')
      if (!input.books.every((b) => b && typeof b.id === 'string' && typeof b.title === 'string')) {
        throw new Error('Invalid shelf.')
      }
      const removed = Array.isArray(input.removed) ? input.removed.filter((id) => typeof id === 'string') : []
      if (removed.length > 20_000) throw new Error('Invalid shelf.')
      const arrangement = isSortKey(input.arrangement) ? input.arrangement : null
      const base = typeof input.base === 'string' ? input.base : null
      return { books: input.books, arrangement, base, removed }
    },
  )
  .handler(
    ({ data }): Promise<SaveResult> =>
      asUser(async (token) => {
        const existing = await findRecord(token)
        const merged = mergeIntoServer(
          existing && { books: Array.isArray(existing.books) ? existing.books : [], updated: existing.updated },
          data,
        )
        const body = { books: merged.books, arrangement: data.arrangement ?? '' }
        const r = existing
          ? await pb<ShelfRecord>(`/api/collections/libraries/records/${existing.id}`, {
              method: 'PATCH',
              token,
              body,
            })
          : await pb<ShelfRecord>('/api/collections/libraries/records', {
              method: 'POST',
              token,
              body: { ...body, owner: tokenUserId(token) },
            })
        return merged.changed ? { updated: r.updated, books: merged.books } : { updated: r.updated }
      }),
  )

/**
 * Reading goals (#66): year → number of books, kept on the same record as the
 * shelf but saved on their own, so a goal and a shelf save never overwrite
 * each other.
 */
export type Goals = Record<string, number>

export const cleanGoals = (g: unknown): Goals =>
  Object.fromEntries(
    Object.entries(g && typeof g === 'object' ? g : {}).filter(
      ([year, n]) => /^\d{4}$/.test(year) && Number.isInteger(n) && n > 0 && n <= 1000,
    ),
  ) as Goals

/** The saved goals, or null when the account has no shelf on the server yet. */
export const loadGoals = createServerFn({ method: 'GET' }).handler(
  (): Promise<Goals | null> =>
    asUser(async (token) => {
      // only the goals, not the whole shelf
      const list = await pb<{ items: Array<{ id: string; goals?: unknown }> }>(
        '/api/collections/libraries/records?perPage=1&skipTotal=1&fields=id,goals',
        { token },
      )
      return list.items[0] ? cleanGoals(list.items[0].goals) : null
    }),
)

/** Sets (or with null, clears) the goal for one year. False when there is no shelf on the server yet. */
export const saveGoal = createServerFn({ method: 'POST' })
  .validator((input: { year: number; goal: number | null }) => {
    if (!Number.isInteger(input?.year) || input.year < 1900 || input.year > 3000) throw new Error('Invalid year.')
    const goal = input.goal === null ? null : Number(input.goal)
    if (goal !== null && !(Number.isInteger(goal) && goal > 0 && goal <= 1000)) throw new Error('Invalid goal.')
    return { year: input.year, goal }
  })
  .handler(
    ({ data }): Promise<boolean> =>
      asUser(async (token) => {
        const list = await pb<{ items: Array<{ id: string; goals?: unknown }> }>(
          '/api/collections/libraries/records?perPage=1&skipTotal=1&fields=id,goals',
          { token },
        )
        const record = list.items[0]
        // the shelf record is made by the first shelf save; don't make an empty one here
        if (!record) return false
        const goals = cleanGoals(record.goals)
        if (data.goal === null) delete goals[String(data.year)]
        else goals[String(data.year)] = data.goal
        await pb(`/api/collections/libraries/records/${record.id}`, { method: 'PATCH', token, body: { goals } })
        return true
      }),
  )
