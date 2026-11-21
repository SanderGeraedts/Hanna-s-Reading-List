import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toggleFavourite, type BlockId, type DashboardLayout } from './dashboardLayout'

/**
 * The favourites following the account (#182), with two devices, against an
 * in-memory stand-in for PocketBase. The real server code (src/server/favourites.ts)
 * runs on top of it; only the HTTP calls are replaced.
 */

const server = vi.hoisted(() => ({
  /** the account's libraries record, or null before the first shelf save */
  record: null as null | { id: string; books: unknown[]; arrangement: string; favourites: unknown },
  /** the server has had the migration that adds the field */
  hasField: true,
  online: true,
  requests: [] as Array<{ method: string; path: string; body?: unknown }>,
}))

vi.mock('#/server/pocketbase', () => ({
  asUser: <T,>(fn: (token: string) => Promise<T>) => fn('token'),
  tokenUserId: () => 'user1',
  pb: async (path: string, { method = 'GET', body }: { method?: string; body?: Record<string, unknown> } = {}) => {
    if (!server.online) throw new Error("The reading-list server can't be reached right now.")
    server.requests.push({ method, path, body: structuredClone(body) })
    // like PocketBase: a field the collection doesn't have is left out of the answer, and ignored in a save
    const view = (r: NonNullable<typeof server.record>) =>
      server.hasField ? { id: r.id, favourites: structuredClone(r.favourites ?? null) } : { id: r.id }
    if (method === 'GET') return { items: server.record ? [view(server.record)] : [] }
    if (method === 'PATCH' && server.record) {
      for (const [k, v] of Object.entries(body ?? {})) {
        if (k !== 'favourites' || server.hasField) (server.record as Record<string, unknown>)[k] = structuredClone(v)
      }
      return view(server.record)
    }
    throw new Error(`unexpected ${method} ${path}`)
  },
}))

// the server functions, calling the real store code as their handlers do
vi.mock('#/server/favourites', async () => {
  const real = await import('#/server/favouritesStore')
  const { cleanFavourites } = await import('./favourites')
  return {
    loadFavourites: () => real.readFavourites('token'),
    // the same cleaning as the server function's validator
    saveFavourites: ({ data }: { data: { add: unknown; remove: unknown } }) =>
      real.changeFavourites('token', { add: cleanFavourites(data.add), remove: cleanFavourites(data.remove) }),
  }
})

const { useDashboardLayout } = await import('#/components/useDashboardLayout')

const ACCOUNT = 'hanna123'
const BOOKS = [
  { id: 'a', title: 'A' },
  { id: 'b', title: 'B' },
]

/** Each device has its own browser storage. */
class Device {
  storage = new Map<string, string>()
  hook: ReturnType<typeof renderHook<readonly [DashboardLayout, (l: DashboardLayout) => void], unknown>> | null = null
  constructor(readonly account: string | null = ACCOUNT) {}
  use() {
    const s = this.storage
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => s.get(k) ?? null,
      setItem: (k: string, v: string) => void s.set(k, String(v)),
      removeItem: (k: string) => void s.delete(k),
      clear: () => s.clear(),
      key: (i: number) => [...s.keys()][i] ?? null,
      get length() {
        return s.size
      },
    })
    return this
  }
  open() {
    this.use()
    this.hook = renderHook(() => useDashboardLayout(this.account))
    return this
  }
  get favourites() {
    return this.hook!.result.current[0].favourites
  }
  async star(id: BlockId) {
    this.use()
    act(() => this.hook!.result.current[1](toggleFavourite(this.hook!.result.current[0], id)))
    await settle()
  }
  /** the dashboard comes back into view */
  async comeBack() {
    this.use()
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    await settle()
  }
  close() {
    this.hook?.unmount()
  }
}

/** lets the pretend server calls finish */
const settle = () => act(() => new Promise((r) => setTimeout(r, 0)))

const patches = () => server.requests.filter((r) => r.method === 'PATCH')

afterEach(() => void vi.unstubAllGlobals())

beforeEach(() => {
  server.record = { id: 'r1', books: structuredClone(BOOKS), arrangement: 'title', favourites: null }
  server.hasField = true
  server.online = true
  server.requests = []
})

describe('favourites follow the account (#182)', () => {
  it('shows blocks starred on one device on the other, and an unstar back on the first', async () => {
    const laptop = new Device().open()
    await settle()
    await laptop.star('goal')
    await laptop.star('reading')
    expect(server.record!.favourites).toEqual(['goal', 'reading'])

    const phone = new Device().open()
    await settle()
    expect(phone.favourites).toEqual(['goal', 'reading'])

    await phone.star('goal') // takes the star off
    expect(server.record!.favourites).toEqual(['reading'])

    await laptop.comeBack()
    expect(laptop.favourites).toEqual(['reading'])
    laptop.close()
    phone.close()
  })

  it('never touches the books: every save sends only the favourites', async () => {
    const laptop = new Device().open()
    await settle()
    await laptop.star('goal')
    await laptop.star('calendar')
    await laptop.star('goal')
    expect(patches().length).toBe(3)
    for (const p of patches()) expect(Object.keys(p.body as object)).toEqual(['favourites'])
    expect(server.record!.books).toEqual(BOOKS)
    expect(server.record!.arrangement).toBe('title')
    laptop.close()
  })

  it("a device without favourites doesn't wipe the account's", async () => {
    server.record!.favourites = ['goal', 'heatmap']
    const fresh = new Device().open()
    await settle()
    expect(fresh.favourites).toEqual(['goal', 'heatmap'])
    expect(patches()).toEqual([])
    expect(server.record!.favourites).toEqual(['goal', 'heatmap'])
    fresh.close()
  })

  it("the first time, a device's own favourites go up when the account has none", async () => {
    const laptop = new Device()
    laptop.storage.set(
      `hannas-reading-list:dashboard:${ACCOUNT}`,
      JSON.stringify({ sections: {}, hidden: [], folded: [], favourites: ['pace', 'goal'] }),
    )
    laptop.open()
    await settle()
    expect(server.record!.favourites).toEqual(['pace', 'goal'])
    expect(laptop.favourites).toEqual(['pace', 'goal'])
    laptop.close()
  })

  it("the first time, the account's win when it has any", async () => {
    server.record!.favourites = ['reading']
    const laptop = new Device()
    laptop.storage.set(
      `hannas-reading-list:dashboard:${ACCOUNT}`,
      JSON.stringify({ sections: {}, hidden: [], folded: [], favourites: ['pace', 'goal'] }),
    )
    laptop.open()
    await settle()
    expect(laptop.favourites).toEqual(['reading'])
    expect(server.record!.favourites).toEqual(['reading'])
    laptop.close()
  })

  it('after unstarring everything on one device, another device does not bring its old stars back', async () => {
    const laptop = new Device().open()
    await settle()
    await laptop.star('goal')
    const phone = new Device().open()
    await settle()
    expect(phone.favourites).toEqual(['goal'])
    await phone.star('goal')
    expect(server.record!.favourites).toEqual([])
    await laptop.comeBack()
    expect(laptop.favourites).toEqual([])
    expect(server.record!.favourites).toEqual([])
    laptop.close()
    phone.close()
  })

  it('two devices starring at the same time keep both stars', async () => {
    const laptop = new Device().open()
    const phone = new Device().open()
    await settle()
    await laptop.star('goal')
    await phone.star('calendar') // the phone hasn't seen the laptop's star yet
    expect(server.record!.favourites).toEqual(['goal', 'calendar'])
    laptop.close()
    phone.close()
  })

  it('while the server has no favourites field, each device keeps its own and nothing is written', async () => {
    server.hasField = false
    const laptop = new Device().open()
    await settle()
    await laptop.star('goal')
    expect(laptop.favourites).toEqual(['goal'])
    expect(patches()).toEqual([])
    expect(JSON.parse(laptop.storage.get(`hannas-reading-list:dashboard:${ACCOUNT}`)!).favourites).toEqual(['goal'])
    laptop.close()

    // once the field arrives, the device's own go up the first time
    server.hasField = true
    laptop.open()
    await settle()
    expect(server.record!.favourites).toEqual(['goal'])
    laptop.close()
  })

  it('makes no shelf record: with none on the server, favourites stay on the device', async () => {
    server.record = null
    const laptop = new Device().open()
    await settle()
    await laptop.star('goal')
    expect(laptop.favourites).toEqual(['goal'])
    expect(server.requests.every((r) => r.method === 'GET')).toBe(true)
    expect(server.record).toBeNull()
    laptop.close()
  })

  it('offline, favourites still work on the device', async () => {
    server.online = false
    const laptop = new Device().open()
    await settle()
    await laptop.star('goal')
    expect(laptop.favourites).toEqual(['goal'])
    laptop.close()
  })

  it('signed out, favourites stay on the device and the server is never asked', async () => {
    const guest = new Device(null).open()
    await settle()
    await guest.star('goal')
    await guest.comeBack()
    expect(guest.favourites).toEqual(['goal'])
    expect(server.requests).toEqual([])
    expect(JSON.parse(guest.storage.get('hannas-reading-list:dashboard:local')!).favourites).toEqual(['goal'])
    guest.close()
  })

  it('ignores junk the server sends back', async () => {
    server.record!.favourites = ['goal', 'goal', 'nonsense', 5]
    const laptop = new Device().open()
    await settle()
    expect(laptop.favourites).toEqual(['goal'])
    laptop.close()
  })
})
