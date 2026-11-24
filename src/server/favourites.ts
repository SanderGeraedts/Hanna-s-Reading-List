import { createServerFn } from '@tanstack/react-start'
import { MAX_FAVOURITES, cleanFavourites, type FavouritesChange } from '#/lib/favourites'
import { changeFavourites, readFavourites, type AccountFavourites } from './favouritesStore'
import { asUser } from './pocketbase'

/**
 * The dashboard's favourites (#182), kept on the same `libraries` record as
 * the shelf but read and written on their own, like the goals in shelf.ts: a
 * favourites save only ever sends the `favourites` field (favouritesStore.ts),
 * and a shelf save never sends it.
 *
 * Kept apart from shelf.ts so it doesn't collide with other work on that file.
 */

export type { AccountFavourites }

/** The account's favourites, or `kept: false` when the device should keep its own. */
export const loadFavourites = createServerFn({ method: 'GET' }).handler(
  (): Promise<AccountFavourites> => asUser((token) => readFavourites(token)),
)

/** Stars (`add`) and unstars (`remove`) blocks on the account; answers with the list as saved. */
export const saveFavourites = createServerFn({ method: 'POST' })
  .validator((input: { add?: unknown; remove?: unknown }): FavouritesChange => {
    const add = Array.isArray(input?.add) ? input.add : []
    const remove = Array.isArray(input?.remove) ? input.remove : []
    if (add.length > MAX_FAVOURITES || remove.length > MAX_FAVOURITES) throw new Error('Invalid favourites.')
    return { add: cleanFavourites(add), remove: cleanFavourites(remove) }
  })
  .handler(({ data }): Promise<AccountFavourites> => asUser((token) => changeFavourites(token, data)))
