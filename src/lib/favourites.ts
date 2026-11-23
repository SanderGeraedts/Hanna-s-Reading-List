import { BLOCKS, asBlock, oldNamesOf, type BlockId } from './dashboardLayout'

/**
 * The dashboard's favourites kept with the account (#182), so every device
 * shows the same starred blocks. Only the favourites follow the account; the
 * rest of the layout (order, hidden, folded) stays per device.
 *
 * They live in their own `favourites` field on the account's `libraries`
 * record and are saved on their own, never as part of a shelf save, so a
 * favourite can't touch the books. A save sends what changed (added and
 * removed blocks), not the whole list, and the server applies it in one
 * transaction (pb_hooks/favourites.pb.js), so saves that overlap keep each
 * other's stars and a device that knows nothing can't wipe them. Each device
 * sends its changes one at a time and keeps them until the account has them
 * (src/components/useDashboardLayout.ts).
 */

export const MAX_FAVOURITES = Object.keys(BLOCKS).length

const isBlock = (id: unknown): id is BlockId => typeof id === 'string' && Object.hasOwn(BLOCKS, id)

/**
 * A saved list made safe: only known blocks, each once, in her order, at most
 * one per block. A star on a block that became another one (T-0070, D-0060)
 * reads as that block, so a star she set before a move is not lost.
 */
export function cleanFavourites(raw: unknown): BlockId[] {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map(asBlock).filter(isBlock))].slice(0, MAX_FAVOURITES)
}

/**
 * What an unstar sends to the account: the block, and the ids it used to be
 * saved under. Without them an old id would sit on the account for ever and
 * star the block again on the next read (T-0070).
 */
export const unstarIds = (remove: readonly BlockId[]): string[] => [
  ...new Set(remove.flatMap((id) => [id as string, ...oldNamesOf(id)])),
]

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

/**
 * A move within Favourites (T-0020, D-0028), as it waits in the device's
 * unsent queue: the block, and the blocks before it in her new order (its
 * anchors). It is worked out against the account's list only when it is sent.
 */
export interface FavouritesMove {
  move: BlockId
  before: BlockId[]
}

/** One entry in the device's unsent queue: a star/unstar, or a move. */
export type UnsentChange = FavouritesChange | FavouritesMove

export const isMove = (c: UnsentChange): c is FavouritesMove => 'move' in c

/** A saved queue entry made safe (junk becomes an empty change, which sends nothing harmful). */
export function cleanUnsent(raw: unknown): UnsentChange {
  const c = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (isBlock(c.move)) return { move: c.move, before: cleanFavourites(c.before).filter((id) => id !== c.move) }
  return { add: cleanFavourites(c.add), remove: cleanFavourites(c.remove) }
}

/**
 * What to queue when the favourites went from `before` to `after` with the same
 * blocks in another order: one move per block moved. A single drag or key
 * moves one block; anything else becomes a move for each block in her order,
 * which builds the same order.
 */
export function orderMoves(before: readonly BlockId[], after: readonly BlockId[]): FavouritesMove[] {
  if (before.length !== after.length || before.every((id, i) => id === after[i])) return []
  for (const id of after) {
    const a = before.filter((x) => x !== id)
    const b = after.filter((x) => x !== id)
    if (a.every((x, i) => x === b[i])) return [{ move: id, before: after.slice(0, after.indexOf(id)) }]
  }
  return after.map((id, i) => ({ move: id, before: after.slice(0, i) }))
}

/**
 * A move worked out against the account's list as it is now: the block goes
 * right after the last of its anchors still on the account (first when none
 * is), every other block keeps the account's order. The route can only unstar
 * and append, so it becomes an unstar of the shortest tail and a re-star of it
 * in the new order, as two changes (one request ignores a block named in both
 * lists). Nothing to send (`[]`) when the block is no longer on the account or
 * already there.
 */
export function moveToChanges(account: readonly BlockId[], id: BlockId, before: readonly BlockId[]): FavouritesChange[] {
  if (!account.includes(id)) return []
  const rest = account.filter((x) => x !== id)
  const anchor = [...before].reverse().find((x) => x !== id && rest.includes(x))
  const at = anchor ? rest.indexOf(anchor) + 1 : 0
  const wanted = [...rest.slice(0, at), id, ...rest.slice(at)]
  for (let n = 0; n <= wanted.length; n++) {
    const tail = wanted.slice(wanted.length - n)
    const kept = account.filter((x) => !tail.includes(x))
    if (kept.every((x, i) => x === wanted[i])) {
      return n === 0 ? [] : [{ add: [], remove: tail }, { add: tail, remove: [] }]
    }
  }
  return []
}
