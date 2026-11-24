import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChoiceEvent } from './choices'

/**
 * Her creature choices following the account (D-0034, T-0029), with two
 * devices against an in-memory stand-in for PocketBase that merges like the
 * route of T-0028 (pb_hooks/creatures.pb.js). The real server code
 * (src/server/creaturesStore.ts) runs on top of it; only the HTTP calls are
 * replaced. Like favouritesSync.test.ts: the app must keep working when the
 * server doesn't have the field yet and answers 404.
 */

const server = vi.hoisted(() => ({
  /** the account's libraries record, or null before the first shelf save */
  record: null as null | { id: string; creatures: unknown },
  /** the server has had T-0028's migration and route */
  hasField: true,
  /** T-0028's route is there (the field may be live before the route) */
  hasRoute: true,
  /** the route answers 500 (a server error, not a 404) */
  failing: false,
  online: true,
  requests: [] as Array<{ method: string; path: string; body?: unknown }>,
  busy: 0,
}))

vi.mock('#/server/pocketbase', async () => {
  const { cleanLog, mergeLogs } = await import('./choices')
  class PocketBaseError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message)
    }
  }
  const wait = () => new Promise((r) => setTimeout(r, 2))
  async function answer(path: string, { method = 'GET', body }: { method?: string; body?: Record<string, unknown> }) {
    server.requests.push({ method, path, body: structuredClone(body) })
    await wait()
    if (method === 'GET') {
      // like PocketBase: a field the collection doesn't have is left out of the answer
      const r = server.record
      return { items: r ? [server.hasField ? { id: r.id, creatures: structuredClone(r.creatures ?? null) } : { id: r.id }] : [] }
    }
    if (method === 'POST' && path === '/api/collections/libraries/creatures') {
      if (!server.record || !server.hasField || !server.hasRoute) throw new PocketBaseError(404, 'Not found.')
      if (server.failing) throw new PocketBaseError(500, 'Something went wrong.')
      // like the route: add the ids it hasn't got, newest setting per key, answer with the whole log
      server.record.creatures = mergeLogs(cleanLog(server.record.creatures), cleanLog(body?.events))
      return { creatures: structuredClone(server.record.creatures) }
    }
    throw new Error(`unexpected ${method} ${path}`)
  }
  return {
    PocketBaseError,
    asUser: <T,>(fn: (token: string) => Promise<T>) => fn('token'),
    pb: async (path: string, options: { method?: string; body?: Record<string, unknown> } = {}) => {
      if (!server.online) throw new Error("The reading-list server can't be reached right now.")
      server.busy++
      try {
        return await answer(path, options)
      } finally {
        server.busy--
      }
    },
  }
})

// the server functions, calling the real store code as their handlers do
vi.mock('#/server/creatures', async () => {
  const real = await import('#/server/creaturesStore')
  const { cleanLog } = await import('./choices')
  return {
    loadCreatures: () => real.readCreatures('token'),
    saveCreatures: ({ data }: { data: { events: unknown } }) => real.addCreatures('token', cleanLog(data.events)),
  }
})

const { useCreatureChoices, creaturesKey } = await import('#/components/useCreatureChoices')
const { deriveCreatures } = await import('./creature')
const { CREATURES_START } = await import('./numbers')

const ACCOUNT = 'hanna123'

class Device {
  storage = new Map<string, string>()
  store: Storage
  hook: ReturnType<typeof renderHook<ReturnType<typeof useCreatureChoices>, unknown>> | null = null
  clock = 1_795_900_000_000
  constructor(readonly account: string | null = ACCOUNT) {
    const s = this.storage
    this.store = {
      getItem: (k: string) => s.get(k) ?? null,
      setItem: (k: string, v: string) => void s.set(k, String(v)),
      removeItem: (k: string) => void s.delete(k),
      clear: () => s.clear(),
      key: (i: number) => [...s.keys()][i] ?? null,
      get length() {
        return s.size
      },
    }
  }
  open() {
    devices.push(this)
    this.hook = renderHook(() => useCreatureChoices(this.account, this.store, () => this.clock))
    return this
  }
  get api() {
    return this.hook!.result.current
  }
  get log(): ChoiceEvent[] {
    return this.api.log
  }
  saved(): ChoiceEvent[] {
    return JSON.parse(this.storage.get(creaturesKey(this.account)) ?? '[]')
  }
  creature() {
    return deriveCreatures([], this.log, new Date(`${CREATURES_START}T12:00:00`)).pet
  }
  async comeBack() {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    await settle()
  }
  close() {
    this.hook?.unmount()
    this.hook = null
  }
}

const devices: Device[] = []

/** Waits until no call is being answered for a few timer turns in a row. */
const settle = () =>
  act(async () => {
    const until = Date.now() + 10_000
    for (let quiet = 0; quiet < 3; ) {
      await new Promise((r) => setTimeout(r, 1))
      quiet = server.busy === 0 ? quiet + 1 : 0
      if (Date.now() > until) throw new Error('the devices never finished talking to the server')
    }
  })

const posts = () => server.requests.filter((r) => r.method === 'POST')

beforeEach(() => {
  server.record = { id: 'r1', creatures: null }
  server.hasField = true
  server.hasRoute = true
  server.failing = false
  server.online = true
  server.requests = []
  server.busy = 0
})

afterEach(async () => {
  server.online = true
  for (const d of devices.splice(0)) d.close()
  await settle()
  vi.useRealTimers()
})

describe('her choices on the account', () => {
  it('sends the hatch, and another device shows the same creature', async () => {
    const phone = new Device().open()
    await settle()
    act(() => phone.api.hatch('red-fox'))
    await settle()
    expect(server.record?.creatures).toHaveLength(1)
    const computer = new Device().open()
    await settle()
    expect(computer.creature()?.species).toBe('red-fox')
    expect(computer.creature()?.name).toBe(phone.creature()?.name)
  })

  it('merges what two devices did offline: a union by id, nothing doubled, the newest name', async () => {
    const phone = new Device().open()
    const computer = new Device().open()
    await settle()
    server.online = false
    act(() => phone.api.hatch('cat'))
    phone.clock += 10_000
    act(() => phone.api.rename('welcome', 'Mochi'))
    computer.clock += 20_000
    act(() => computer.api.rename('welcome', 'Biscuit'))
    await settle()
    server.online = true
    await phone.comeBack()
    await computer.comeBack()
    await phone.comeBack()
    const ids = (server.record!.creatures as ChoiceEvent[]).map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(2) // the hatch and the newest name
    expect(phone.creature()?.name).toBe('Biscuit')
    expect(computer.creature()?.name).toBe('Biscuit')
    expect(phone.log).toEqual(computer.log)
  })

  it('sends nothing twice', async () => {
    const phone = new Device().open()
    await settle()
    act(() => phone.api.hatch('capybara'))
    await settle()
    await phone.comeBack()
    await phone.comeBack()
    const sent = posts().flatMap((r) => (r.body as { events: ChoiceEvent[] }).events.map((e) => e.id))
    expect(sent).toHaveLength(1)
  })

  it('keeps quick taps on Feed as one event, sent once the taps stop', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const phone = new Device().open()
    await settle()
    act(() => phone.api.hatch('cat'))
    await settle()
    act(() => phone.api.feed('welcome', 5))
    phone.clock += 500
    act(() => phone.api.feed('welcome', 5))
    phone.clock += 500
    act(() => phone.api.feed('welcome', 3))
    const feeds = phone.log.filter((e) => e.kind === 'feed')
    expect(feeds).toHaveLength(1)
    expect(feeds[0]).toMatchObject({ amount: 13 })
    // already in this browser, not on the account yet
    expect(phone.saved().filter((e) => e.kind === 'feed')).toHaveLength(1)
    expect((server.record!.creatures as ChoiceEvent[]).some((e) => e.kind === 'feed')).toBe(false)
    phone.clock += 2100
    await act(async () => void vi.advanceTimersByTime(2200))
    await settle()
    expect((server.record!.creatures as ChoiceEvent[]).filter((e) => e.kind === 'feed')).toMatchObject([{ amount: 13 }])
    // a tap after that is a new event
    act(() => phone.api.feed('welcome', 5))
    expect(phone.log.filter((e) => e.kind === 'feed')).toHaveLength(2)
  })
})

describe('without the server keeping creatures', () => {
  it('keeps working on the device when the server answers 404 (no field yet)', async () => {
    server.hasField = false
    const phone = new Device().open()
    await settle()
    act(() => phone.api.hatch('adelie-penguin'))
    act(() => phone.api.rename('welcome', 'Waddles'))
    await settle()
    expect(phone.creature()).toMatchObject({ species: 'adelie-penguin', name: 'Waddles' })
    expect(phone.saved()).toHaveLength(2)
    // no POST is even tried: the read already says the field isn't there
    expect(posts()).toHaveLength(0)
    // after a reload it is all still there
    phone.close()
    phone.open()
    await settle()
    expect(phone.creature()).toMatchObject({ species: 'adelie-penguin', name: 'Waddles' })
  })

  it('keeps working when the route itself answers 404 (no shelf on the server yet)', async () => {
    server.record = null
    const phone = new Device().open()
    await settle()
    act(() => phone.api.hatch('cat'))
    await settle()
    expect(phone.creature()?.species).toBe('cat')
  })

  it('keeps working offline, and sends it all once the server keeps creatures', async () => {
    server.hasField = false
    const phone = new Device().open()
    await settle()
    act(() => phone.api.hatch('red-squirrel'))
    act(() => phone.api.rename('welcome', 'Hazel'))
    await settle()
    // T-0028 goes live
    server.hasField = true
    await phone.comeBack()
    expect((server.record!.creatures as ChoiceEvent[]).map((e) => e.kind)).toEqual(['hatch', 'name'])
    const computer = new Device().open()
    await settle()
    expect(computer.creature()).toMatchObject({ species: 'red-squirrel', name: 'Hazel' })
  })

  it('signed out, never talks to the server', async () => {
    const local = new Device(null).open()
    act(() => local.api.hatch('cat'))
    await settle()
    expect(server.requests).toHaveLength(0)
    expect(local.creature()?.species).toBe('cat')
  })
})

describe('half-live or failing server (tester)', () => {
  it('keeps the device’s log when the field is there but the route answers 404', async () => {
    server.hasRoute = false
    server.record = { id: 'r1', creatures: [] }
    const phone = new Device().open()
    await settle()
    act(() => phone.api.hatch('capybara'))
    act(() => phone.api.rename('welcome', 'Bean'))
    await settle()
    // the POST was tried and answered 404: the empty account log never replaces hers
    expect(posts().length).toBeGreaterThan(0)
    expect(phone.saved().map((e) => e.kind)).toEqual(['hatch', 'name'])
    expect(phone.creature()).toMatchObject({ species: 'capybara', name: 'Bean' })
    // the route arrives: everything goes up once
    server.hasRoute = true
    await phone.comeBack()
    expect((server.record!.creatures as ChoiceEvent[]).map((e) => e.kind)).toEqual(['hatch', 'name'])
  })

  it('keeps working when the route answers 500, and sends it on the next try', async () => {
    server.failing = true
    const phone = new Device().open()
    await settle()
    act(() => phone.api.hatch('red-fox'))
    await settle()
    expect(phone.creature()?.species).toBe('red-fox')
    expect(server.record!.creatures).toBeNull()
    server.failing = false
    await phone.comeBack()
    expect((server.record!.creatures as ChoiceEvent[]).map((e) => e.kind)).toEqual(['hatch'])
  })
})
