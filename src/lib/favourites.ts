import { BLOCKS, type BlockId } from './dashboardLayout'

/**
 * The dashboard's favourites kept with the account (#182), so every device
 * shows the same starred blocks. Only the favourites follow the account; the
 * rest of the layout (order, hidden, folded) stays per device.
 *
 * They live in their own `favourites` field on the account's `libraries`
 * record and are saved on their own, never as part of a shelf save, so a
 * favourite can't touch the books. A save sends what changed (added and
 * removed blocks), not the whole list, so two devices never overwrite each
 * other's stars and a device that knows nothing can't wipe them.
 */

export const MAX_FAVOURITES = Object.keys(BLOCKS).length

const isBlock = (id: unknown): id is BlockId => typeof id === 'string' && Object.hasOwn(BLOCKS, id)

/** A saved list made safe: only known blocks, each once, in her order, at most one per block. */
export function cleanFavourites(raw: unknown): BlockId[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter(isBlock))].slice(0, MAX_FAVOURITES)
}

export interface FavouritesChange {
  add: BlockId[]
  remove: BlockId[]
}

/** What changed between two lists: blocks starred (in order) and blocks unstarred. */
export function favouritesChange(before: readonly BlockId[], after: readonly BlockId[]): FavouritesChange {
  return {
    add: after.filter((id) => !before.includes(id)),
    remove: before.filter((id) => !after.includes(id)),
  }
}

/** A change applied to a list: removed blocks taken out, new ones added at the end. */
export function applyChange(list: readonly BlockId[], { add, remove }: FavouritesChange): BlockId[] {
  const kept = list.filter((id) => !remove.includes(id))
  return cleanFavourites([...kept, ...add.filter((id) => !remove.includes(id))])
}

/**
 * What a device does when it reads the account's favourites.
 *
 * - The first time this device meets the account (`met` false): the account's
 *   win if it has any; otherwise the device's own are saved to the account
 *   (`push`), so nothing she starred before is lost.
 * - After that the account's always win, also an empty list (she unstarred
 *   everything on another device).
 */
export function meetAccount(
  local: readonly BlockId[],
  account: readonly BlockId[],
  met: boolean,
): { favourites: BlockId[]; push: BlockId[] } {
  if (met || account.length > 0) return { favourites: cleanFavourites(account), push: [] }
  const own = cleanFavourites(local)
  return { favourites: own, push: own }
}
