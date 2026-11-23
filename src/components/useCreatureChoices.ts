import { useCallback, useEffect, useRef, useState } from 'react'
import { MAX_PER_CALL, cleanLog, mergeLogs, newEventId } from '#/lib/creatures/choices'
import type { ChoiceEvent, FeedEvent, NameEvent } from '#/lib/creatures/choices'
import { FEED_COMBINE_MS, WELCOME_EGG } from '#/lib/creatures/numbers'
import type { SpeciesId } from '#/lib/creatures/species'
import { loadCreatures, saveCreatures } from '#/server/creatures'

/** Her creature choices on this device, for this account (D-0034). */
export const creaturesKey = (accountId: string | null) => `hannas-reading-list:creatures:${accountId ?? 'local'}`
/** The newest level-up she has seen on this device (Design §11), per pet: { [petId]: level }. */
export const creaturesSeenKey = (accountId: string | null) => `hannas-reading-list:creatures-seen:${accountId ?? 'local'}`

type Store = () => Storage

function read(st: Store, key: string): string | null {
  try {
    return st().getItem(key)
  } catch {
    return null
  }
}

function write(st: Store, key: string, value: string) {
  try {
    st().setItem(key, value)
  } catch {
    /* storage blocked: it still holds for this visit */
  }
}

function readLog(st: Store, key: string): ChoiceEvent[] {
  try {
    return cleanLog(JSON.parse(read(st, key) ?? '[]'))
  } catch {
    return []
  }
}

export interface CreatureChoices {
  log: ChoiceEvent[]
  /** saves the hatch of the welcome egg with the creature she chose, at once (Design §3c) */
  hatch: (species: SpeciesId) => void
  /** saves a name for a pet */
  rename: (pet: string, name: string) => void
  /** gives a pet cookies; quick taps within 2 s become one event with the total */
  feed: (pet: string, amount: number) => void
}

/**
 * The choices log (D-0034): kept in this browser, so everything works on its
 * own. Signed in, the device also sends the account what it hasn't got and
 * takes over what other devices sent (a union by id: nothing lost, nothing
 * doubled), when the page opens, whenever it comes back into view and after
 * each new choice. While the server doesn't keep creatures (T-0028 not live
 * yet), or it answers 404, the device simply keeps its own log.
 *
 * A feed is held back for 2 s after the last tap, so quick taps can be added
 * to it; it is already in this browser's log, only not sent yet.
 */
export function useCreatureChoices(accountId: string | null, storage?: Storage, clock: () => number = Date.now): CreatureChoices {
  const key = creaturesKey(accountId)
  const box = useRef(storage)
  box.current = storage
  const clockRef = useRef(clock)
  clockRef.current = clock
  const now = useCallback(() => clockRef.current(), [])
  const st = useCallback<Store>(() => box.current ?? localStorage, [])
  const [log, setLog] = useState<ChoiceEvent[]>(() => readLog(st, key))
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const live = useRef(true)
  /** the feed still open for more taps, and until when */
  const open = useRef<{ id: string; pet: string; until: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const store = useCallback(
    (next: ChoiceEvent[]) => {
      write(st, key, JSON.stringify(next))
      if (live.current) setLog(next)
    },
    [key, st],
  )

  /** Runs server steps one after another. */
  const run = useCallback((step: () => Promise<unknown>) => {
    chain.current = chain.current.then(step).catch(() => {
      /* offline, or signed out on the server: what isn't sent yet goes with the next try */
    })
  }, [])

  /** Sends what the account hasn't got, then takes over the account's log. */
  const pull = useCallback(async () => {
    const account = await loadCreatures()
    if (!account.kept) return
    let server = account.events
    const have = new Set(server.map((e) => e.id))
    const held = open.current && open.current.until > now() ? open.current.id : null
    const missing = mergeLogs(readLog(st, key), server).filter((e) => !have.has(e.id) && e.id !== held)
    for (let i = 0; i < missing.length; i += MAX_PER_CALL) {
      const saved = await saveCreatures({ data: { events: missing.slice(i, i + MAX_PER_CALL) } })
      if (!saved.kept) return
      server = saved.events
    }
    // choices made meanwhile stay: they are merged in, and go up with the next step
    store(mergeLogs(readLog(st, key), server))
  }, [key, now, st, store])

  const sync = useCallback(() => {
    if (accountId) run(pull)
  }, [accountId, pull, run])

  useEffect(() => {
    live.current = true
    setLog(readLog(st, key))
    sync()
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      live.current = false
      document.removeEventListener('visibilitychange', onVisible)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [key, st, sync])

  const add = useCallback(
    (events: ChoiceEvent[]) => {
      store(mergeLogs(readLog(st, key), events))
      sync()
    },
    [key, st, store, sync],
  )

  const hatch = useCallback(
    (species: SpeciesId) => {
      const at = now()
      add([{ id: newEventId('hatch', at), at, kind: 'hatch', egg: WELCOME_EGG, species }])
    },
    [add, now],
  )

  const rename = useCallback(
    (pet: string, name: string) => {
      const at = now()
      const e: NameEvent = { id: newEventId('name', at), at, kind: 'name', key: pet, name }
      add([e])
    },
    [add, now],
  )

  const feed = useCallback(
    (pet: string, amount: number) => {
      if (!(amount > 0)) return
      const at = now()
      const current = readLog(st, key)
      const o = open.current
      const held = o && o.pet === pet && o.until > at ? current.find((e) => e.id === o.id) : undefined
      if (o && held) {
        // not sent yet: it only exists in this browser, so it can still grow
        o.until = at + FEED_COMBINE_MS
        store(current.map((e) => (e.id === o.id ? { ...e, amount: (e as FeedEvent).amount + amount } : e)))
      } else {
        const e: FeedEvent = { id: newEventId('feed', at), at, kind: 'feed', pet, amount }
        open.current = { id: e.id, pet, until: at + FEED_COMBINE_MS }
        store(mergeLogs(current, [e]))
      }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        open.current = null
        sync()
      }, FEED_COMBINE_MS + 50)
    },
    [key, now, st, store, sync],
  )

  return { log, hatch, rename, feed }
}

/** The newest level she has seen a level-up of, per pet, on this device (Design §11). */
export function useSeenLevels(accountId: string | null, storage?: Storage) {
  const key = creaturesSeenKey(accountId)
  const st = useCallback<Store>(() => storage ?? localStorage, [storage])
  const [seen, setSeen] = useState<Record<string, number>>(() => {
    try {
      const v: unknown = JSON.parse(read(st, key) ?? '{}')
      if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
      return Object.fromEntries(Object.entries(v).filter(([, n]) => typeof n === 'number')) as Record<string, number>
    } catch {
      return {}
    }
  })
  const see = useCallback(
    (pet: string, level: number) => {
      setSeen((prev) => {
        if ((prev[pet] ?? 0) >= level) return prev
        const next = { ...prev, [pet]: level }
        write(st, key, JSON.stringify(next))
        return next
      })
    },
    [key, st],
  )
  return [seen, see] as const
}
