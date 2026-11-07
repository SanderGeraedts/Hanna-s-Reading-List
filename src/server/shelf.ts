import { createServerFn } from '@tanstack/react-start'
import type { Book } from '#/lib/library'
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

export const saveShelf = createServerFn({ method: 'POST' })
  .validator((input: { books: Book[]; arrangement: SortKey | null }) => {
    if (!Array.isArray(input?.books) || input.books.length > 20_000) throw new Error('Invalid shelf.')
    if (!input.books.every((b) => b && typeof b.id === 'string' && typeof b.title === 'string')) {
      throw new Error('Invalid shelf.')
    }
    const arrangement = isSortKey(input.arrangement) ? input.arrangement : null
    return { books: input.books, arrangement }
  })
  .handler(
    ({ data }): Promise<{ updated: string }> =>
      asUser(async (token) => {
        const body = { books: data.books, arrangement: data.arrangement ?? '' }
        const existing = await findRecord(token)
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
        return { updated: r.updated }
      }),
  )
