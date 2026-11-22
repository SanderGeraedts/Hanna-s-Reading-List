import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_LAYOUT, cleanLayout, type BlockId, type DashboardLayout } from '#/lib/dashboardLayout'
import {
  cleanUnsent,
  favouritesChange,
  isMove,
  meetAccount,
  moveToChanges,
  orderMoves,
  type UnsentChange,
} from '#/lib/favourites'
import { loadFavourites, saveFavourites } from '#/server/favourites'

export const layoutKey = (accountId: string | null) => `hannas-reading-list:dashboard:${accountId ?? 'local'}`
/** set once this device has met the account's favourites (see meetAccount) */
export const favouritesMetKey = (accountId: string) => `hannas-reading-list:favourites-met:${accountId}`
/** stars, unstars and moves (T-0020) made on this device that the account hasn't got yet, oldest first */
export const favouritesUnsentKey = (accountId: string) => `hannas-reading-list:favourites-unsent:${accountId}`

/** this browser's storage, or the one a test hands in */
type Store = () => Storage

function read(st: Store, key: string): string | null {
  try {
    return st().getItem(key)
  } catch {
    return null
  }
}

function write(st: Store, key: string, value: string | null) {
  try {
    if (value === null) st().removeItem(key)
    else st().setItem(key, value)
  } catch {
    /* storage blocked: it still holds for this visit */
  }
}

function readUnsent(st: Store, key: string): UnsentChange[] {
  try {
    const list: unknown = JSON.parse(read(st, key) ?? '[]')
    return (Array.isArray(list) ? list : []).map(cleanUnsent)
  } catch {
    return []
  }
}

const sameList = (a: readonly BlockId[], b: readonly BlockId[]) => a.length === b.length && a.every((id, i) => id === b[i])

/**
 * The dashboard layout, remembered on this device for this account (#85).
 * Signed in, the favourites follow the account (#182):
 *
 * - every star and unstar is kept on the device until the account has it, and
 *   sent one at a time, oldest first (also after being offline);
 * - a move within Favourites is kept as a move, and turned into an unstar and
 *   re-star of the shortest tail against the account's list when it is sent
 *   (T-0020, D-0028), so the next pull doesn't undo it;
 * - the account's favourites are read when the dashboard opens and whenever it
 *   comes back into view, after this device's unsent changes have gone up;
 * - the first time, the device meets the account (see meetAccount).
 *
 * Signed out, or while the server doesn't keep favourites, they stay on this
 * device as before. Everything that talks to the server runs one step at a
 * time, so a device never has two saves on their way at once.
 */
export function useDashboardLayout(accountId: string | null, storage?: Storage) {
  const key = layoutKey(accountId)
  const box = useRef(storage)
  box.current = storage
  const st = useCallback<Store>(() => box.current ?? localStorage, [])
  const [layout, setState] = useState<DashboardLayout>(() => {
    try {
      return cleanLayout(JSON.parse(st().getItem(key) ?? 'null'))
    } catch {
      return DEFAULT_LAYOUT
    }
  })
  const current = useRef(layout)
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const live = useRef(true)

  const store = useCallback(
    (next: DashboardLayout) => {
      current.current = next
      setState(next)
      write(st, key, JSON.stringify(next))
    },
    [key],
  )

  /** Takes over the account's favourites (except blocks hidden on this device). */
  const adopt = useCallback(
    (favourites: BlockId[]) => {
      const next = cleanLayout({ ...current.current, favourites })
      if (!sameList(next.favourites, current.current.favourites)) store(next)
    },
    [store],
  )

  /** Runs server steps one after another. */
  const run = useCallback((step: () => Promise<unknown>) => {
    chain.current = chain.current.then(step).catch(() => {
      /* offline, or signed out on the server: unsent changes wait for the next try */
    })
  }, [])

  /** Sends this device's unsent changes, oldest first. False when the server doesn't keep favourites. */
  const flush = useCallback(async (unsentKey: string): Promise<boolean> => {
    for (;;) {
      const [first] = readUnsent(st, unsentKey)
      if (!first) return true
      if (isMove(first)) {
        // a move is worked out against the account's list as it is now (D-0028)
        const account = await loadFavourites()
        if (!account.kept) {
          write(st, unsentKey, null)
          return false
        }
        const changes = moveToChanges(account.favourites, first.move, first.before)
        // the move leaves the queue for its two changes; anything newer stays behind them
        write(st, unsentKey, JSON.stringify([...changes, ...readUnsent(st, unsentKey).slice(1)]))
        continue
      }
      const saved = await saveFavourites({ data: first })
      if (!saved.kept) {
        write(st, unsentKey, null)
        return false
      }
      // only the change just sent leaves the list; newer ones stay behind it
      write(st, unsentKey, JSON.stringify(readUnsent(st, unsentKey).slice(1)))
    }
  }, [])

  /** Unsent changes go up, then the account's favourites are taken over. */
  const pull = useCallback(
    async (account: string) => {
      const metKey = favouritesMetKey(account)
      const unsentKey = favouritesUnsentKey(account)
      if (read(st, metKey) !== '1') {
        const first = await loadFavourites()
        if (!first.kept) {
          // the device keeps its own; they go up once the server keeps favourites
          write(st, unsentKey, null)
          return
        }
        // an account without favourites gets this device's (its unsent changes are part of them)
        if (first.favourites.length === 0) {
          const { push } = meetAccount(current.current.favourites, first.favourites, false)
          write(st, unsentKey, push.length ? JSON.stringify([{ add: push, remove: [] }]) : null)
        }
      }
      if (!(await flush(unsentKey))) return
      const account_ = await loadFavourites()
      if (!account_.kept) return
      write(st, metKey, '1')
      // a star made meanwhile goes up first; its own step reads the account again
      if (live.current && readUnsent(st, unsentKey).length === 0) adopt(account_.favourites)
    },
    [adopt, flush],
  )

  useEffect(() => {
    live.current = true
    if (!accountId) return
    run(() => pull(accountId))
    const onVisible = () => {
      if (document.visibilityState === 'visible') run(() => pull(accountId))
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      live.current = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [accountId, pull, run])

  const setLayout = useCallback(
    (next: DashboardLayout) => {
      const before = current.current.favourites
      store(next)
      if (!accountId) return
      const change = favouritesChange(before, next.favourites)
      // the same blocks in another order is a move within Favourites (T-0020), else stars and unstars
      const queued: UnsentChange[] =
        change.add.length === 0 && change.remove.length === 0 ? orderMoves(before, next.favourites) : [change]
      if (queued.length === 0) return
      const unsentKey = favouritesUnsentKey(accountId)
      write(st, unsentKey, JSON.stringify([...readUnsent(st, unsentKey), ...queued]))
      // before the first meeting, a pull does the meeting and then sends it
      run(() => (read(st, favouritesMetKey(accountId)) === '1' ? flush(unsentKey) : pull(accountId)))
    },
    [accountId, flush, pull, run, store],
  )

  return [layout, setLayout] as const
}
