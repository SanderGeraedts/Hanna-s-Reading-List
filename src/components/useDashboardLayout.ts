import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_LAYOUT, cleanLayout, type DashboardLayout } from '#/lib/dashboardLayout'
import { favouritesChange, meetAccount } from '#/lib/favourites'
import { loadFavourites, saveFavourites } from '#/server/favourites'

export const layoutKey = (accountId: string | null) => `hannas-reading-list:dashboard:${accountId ?? 'local'}`
/** set once this device has met the account's favourites (see meetAccount) */
export const favouritesMetKey = (accountId: string) => `hannas-reading-list:favourites-met:${accountId}`

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* storage blocked: the device meets the account again next time, which is harmless */
  }
}

/**
 * The dashboard layout, remembered on this device for this account (#85).
 * Signed in, the favourites follow the account (#182): read when the
 * dashboard opens and whenever it comes back into view, and every star sent
 * on its own. Signed out, offline, or while the server doesn't keep
 * favourites, they stay on this device as before.
 */
export function useDashboardLayout(accountId: string | null) {
  const key = layoutKey(accountId)
  const [layout, setState] = useState<DashboardLayout>(() => {
    try {
      return cleanLayout(JSON.parse(localStorage.getItem(key) ?? 'null'))
    } catch {
      return DEFAULT_LAYOUT
    }
  })
  const current = useRef(layout)
  // the account keeps favourites, as far as this device knows
  const kept = useRef(false)
  // favourites saves still on their way, and how many were sent so far
  const pending = useRef(0)
  const sent = useRef(0)

  const store = useCallback(
    (next: DashboardLayout) => {
      current.current = next
      setState(next)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* storage blocked: it still holds for this visit */
      }
    },
    [key],
  )

  /** Takes over the account's favourites (except blocks hidden on this device). */
  const adopt = useCallback(
    (favourites: string[]) => {
      const next = cleanLayout({ ...current.current, favourites })
      const now = current.current.favourites
      if (next.favourites.length !== now.length || next.favourites.some((id, i) => id !== now[i])) store(next)
    },
    [store],
  )

  useEffect(() => {
    kept.current = false
    if (!accountId) return
    let live = true
    const metKey = favouritesMetKey(accountId)

    const pull = () => {
      const at = sent.current
      loadFavourites()
        .then((account) => {
          // a star sent meanwhile is newer than this answer
          if (!live || !account.kept || pending.current > 0 || at !== sent.current) return
          kept.current = true
          const { favourites, push } = meetAccount(current.current.favourites, account.favourites, readFlag(metKey))
          if (push.length === 0) {
            writeFlag(metKey)
            adopt(favourites)
            return
          }
          // first meeting with an account without favourites: this device's go up
          saveFavourites({ data: { add: push, remove: [] } })
            .then((saved) => {
              if (!saved.kept) return
              writeFlag(metKey)
              if (live && at === sent.current) adopt(saved.favourites)
            })
            .catch(() => {})
        })
        // offline, or not signed in on the server: the copy here will do
        .catch(() => {})
    }

    pull()
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [accountId, adopt])

  const setLayout = useCallback(
    (next: DashboardLayout) => {
      const before = current.current.favourites
      store(next)
      if (!accountId || !kept.current) return
      const change = favouritesChange(before, next.favourites)
      if (change.add.length === 0 && change.remove.length === 0) return
      sent.current++
      pending.current++
      saveFavourites({ data: change })
        .catch(() => {})
        .finally(() => {
          pending.current--
        })
    },
    [accountId, store],
  )

  return [layout, setLayout] as const
}
