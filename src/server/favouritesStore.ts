import type { BlockId } from '#/lib/dashboardLayout'
import { applyChange, cleanFavourites, type FavouritesChange } from '#/lib/favourites'
import { pb } from './pocketbase'

/**
 * Reading and writing the dashboard's favourites (#182) on the account's
 * `libraries` record. Server only: the server functions in favourites.ts call
 * these. A favourites save only ever sends the `favourites` field, so it can't
 * change the books.
 */

/** `kept: false`: the account has no shelf on the server yet, or the server doesn't keep favourites (yet). */
export type AccountFavourites = { kept: true; favourites: BlockId[] } | { kept: false }

const NOT_KEPT: AccountFavourites = { kept: false }

interface Row {
  id: string
  favourites?: unknown
}

async function findRow(token: string): Promise<Row | null> {
  // only the favourites, not the whole shelf
  const list = await pb<{ items: Row[] }>(
    '/api/collections/libraries/records?perPage=1&skipTotal=1&fields=id,favourites',
    { token },
  )
  return list.items[0] ?? null
}

/** A server older than the field leaves it out of the answer (a field that was never set comes back as null). */
const keepsFavourites = (row: Row) => Object.hasOwn(row, 'favourites')

export async function readFavourites(token: string): Promise<AccountFavourites> {
  const row = await findRow(token)
  if (!row || !keepsFavourites(row)) return NOT_KEPT
  return { kept: true, favourites: cleanFavourites(row.favourites) }
}

/**
 * Applies a change to what the account has now and saves only that field.
 * Never makes a shelf record and never writes to a server without the field.
 */
export async function changeFavourites(token: string, change: FavouritesChange): Promise<AccountFavourites> {
  const row = await findRow(token)
  if (!row || !keepsFavourites(row)) return NOT_KEPT
  const now = cleanFavourites(row.favourites)
  const next = applyChange(now, change)
  if (next.length === now.length && next.every((id, i) => id === now[i])) return { kept: true, favourites: now }
  const saved = await pb<Row>(`/api/collections/libraries/records/${row.id}?fields=id,favourites`, {
    method: 'PATCH',
    token,
    body: { favourites: next },
  })
  return { kept: true, favourites: cleanFavourites(saved.favourites) }
}
