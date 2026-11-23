import type { BlockId } from '#/lib/dashboardLayout'
import { cleanFavourites, unstarIds, type FavouritesChange } from '#/lib/favourites'
import { PocketBaseError, pb } from './pocketbase'

/**
 * Reading and writing the dashboard's favourites (#182) on the account's
 * `libraries` record. Server only: the server functions in favourites.ts call
 * these. A favourites save only ever changes the `favourites` field, so it
 * can't change the books.
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
 * Stars and unstars on the account. The server applies the change to what the
 * account has at that moment, in one transaction (pb_hooks/favourites.pb.js),
 * so saves that overlap (two quick taps, two devices) keep each other's stars.
 * It only writes the `favourites` field, never makes a shelf record, and a
 * server without the field (or the route) answers 404: nothing is written.
 */
export async function changeFavourites(token: string, change: FavouritesChange): Promise<AccountFavourites> {
  try {
    const saved = await pb<{ favourites?: unknown }>('/api/collections/libraries/favourites', {
      method: 'POST',
      token,
      // an unstar also clears the ids the block used to be saved under (T-0080)
      body: { add: change.add, remove: unstarIds(change.remove) },
    })
    return { kept: true, favourites: cleanFavourites(saved.favourites) }
  } catch (err) {
    if (err instanceof PocketBaseError && err.status === 404) return NOT_KEPT
    throw err
  }
}
