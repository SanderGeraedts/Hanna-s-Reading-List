import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetLayout, toggleFavourite, type BlockId, type DashboardLayout } from './dashboardLayout'

/**
 * The favourites following the account (#182), with two devices, against an
 * in-memory stand-in for PocketBase. The real server code
 * (src/server/favouritesStore.ts) runs on top of it; only the HTTP calls are
 * replaced. Every call takes a few milliseconds, so saves can overlap.
 */

const server = vi.hoisted(() => ({
  /** the account's libraries record, or null before the first shelf save */
  record: null as null | { id: string; books: unknown[]; arrangement: string; favourites: unknown },
  /** the server has had the migration that adds the field */
  hasField: true,
  online: true,
  requests: [] as Array<{ method: string; path: string; body?: unknown }>,
  /** favourites saves on their way right now, and the most at once */
  saving: 0,
  mostAtOnce: 0,
}))

vi.mock('#/server/pocketbase', () => {
  class PocketBaseError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message)
    }
  }
  const wait = () => new Promise((r) => setTimeout(r, 3))
  return {
    PocketBaseError,
    asUser: <T,>(fn: (token: string) => Promise<T>) => fn('token'),
    tokenUserId: () => 'user1',
    pb: async (path: string, { method = 'GET', body }: { method?: string; body?: Record<string, unknown> } = {}) => {
      if (!server.online) throw new Error("The reading-list server can't be reached right now.")
      server.requests.push({ method, path, body: structuredClone(body) })
      // like PocketBase: a field the collection doesn't have is left out of the answer
      const view = (r: NonNullable<typeof server.record>) =>
        server.hasField ? { id: r.id, favourites: structuredClone(r.favourites ?? null) } : { id: r.id }
      if (method === 'GET') {
        await wait()
        return { items: server.record ? [view(server.record)] : [] }
      }
      if (method === 'POST' && path === '/api/collections/libraries/favourites') {
        // like pb_hooks/favourites.pb.js: the change applied to the list as it is at that moment
        server.saving++
        server.mostAtOnce = Math.max(server.mostAtOnce, server.saving)
        await wait()
        server.saving--
        if (!server.record || !server.hasField) throw new PocketBaseError(404, 'Not found.')
        const { applyChange, cleanFavourites } = await import('./favourites')
        const next = applyChange(cleanFavourites(server.record.favourites), {
          add: cleanFavourites(body?.add),
          remove: cleanFavourites(body?.remove),
        })
        server.record.favourites = next
        return { favourites: structuredClone(next) }
      }
      throw new Error(`unexpected ${method} ${path}`)
    },
  }
})

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
const LAYOUT_KEY = `hannas-reading-list:dashboard:${ACCOUNT}`
const withFavourites = (favourites: string[]) => JSON.stringify({ sections: {}, hidden: [], folded: [], favourites })

/** Each device has its own browser storage. */
class Device {
  storage = new Map<string, string>()
  private store: Storage
  hook: ReturnType<typeof renderHook<readonly [DashboardLayout, (l: DashboardLayout) => void], unknown>> | null = null
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
    this.hook = renderHook(() => useDashboardLayout(this.account, this.store))
    return this
  }
  get layout() {
    return this.hook!.result.current[0]
  }
  get favourites() {
    return this.layout.favourites
  }
  /** taps a star, without waiting for anything */
  tap(id: BlockId) {
    act(() => this.hook!.result.current[1](toggleFavourite(this.layout, id)))
  }
  async star(id: BlockId) {
    this.tap(id)
    await settle()
  }
  /** the dashboard comes back into view */
  async comeBack() {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    act(() => void document.dispatchEvent(new Event('visibilitychange')))
    await settle()
  }
  close() {
    this.hook?.unmount()
  }
}

/** lets the pretend server calls finish */
const settle = () => act(() => new Promise((r) => setTimeout(r, 60)))

const writes = () => server.requests.filter((r) => r.method !== 'GET')

beforeEach(() => {
  server.record = { id: 'r1', books: structuredClone(BOOKS), arrangement: 'title', favourites: null }
  server.hasField = true
  server.online = true
  server.requests = []
  server.saving = 0
  server.mostAtOnce = 0
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

  it('never touches the books: saves only send stars and unstars, never the shelf', async () => {
    const laptop = new Device().open()
    await settle()
    await laptop.star('goal')
    await laptop.star('calendar')
    await laptop.star('goal')
    expect(writes().map((w) => w.body)).toEqual([
      { add: ['goal'], remove: [] },
      { add: ['calendar'], remove: [] },
      { add: [], remove: ['goal'] },
    ])
    expect(server.record!.books).toEqual(BOOKS)
    expect(server.record!.arrangement).toBe('title')
    laptop.close()
  })

  it('two quick taps on one device keep both stars, sent one at a time', async () => {
    const laptop = new Device().open()
    await settle()
    laptop.tap('goal')
    laptop.tap('reading') // before the first save is back
    await settle()
    expect(server.record!.favourites).toEqual(['goal', 'reading'])
    expect(server.mostAtOnce).toBe(1)
    await laptop.comeBack()
    expect(laptop.favourites).toEqual(['goal', 'reading'])
    laptop.close()
  })

  it('two devices starring at the same instant keep both stars', async () => {
    const laptop = new Device().open()
    const phone = new Device().open()
    await settle()
    laptop.tap('goal')
    phone.tap('calendar') // neither save has come back yet
    await settle()
    expect(server.record!.favourites).toEqual(['goal', 'calendar'])
    await laptop.comeBack()
    expect(laptop.favourites).toEqual(['goal', 'calendar'])
    laptop.close()
    phone.close()
  })

  it("a device without favourites doesn't wipe the account's", async () => {
    server.record!.favourites = ['goal', 'heatmap']
    const fresh = new Device().open()
    await settle()
    expect(fresh.favourites).toEqual(['goal', 'heatmap'])
    expect(writes()).toEqual([])
    expect(server.record!.favourites).toEqual(['goal', 'heatmap'])
    fresh.close()
  })

  it("the first time, a device's own favourites go up when the account has none", async () => {
    const laptop = new Device()
    laptop.storage.set(LAYOUT_KEY, withFavourites(['pace', 'goal']))
    laptop.open()
    await settle()
    expect(server.record!.favourites).toEqual(['pace', 'goal'])
    expect(laptop.favourites).toEqual(['pace', 'goal'])
    laptop.close()
  })

  it("the first time, the account's win when it has any", async () => {
    server.record!.favourites = ['reading']
    const laptop = new Device()
    laptop.storage.set(LAYOUT_KEY, withFavourites(['pace', 'goal']))
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

  it('a star made offline goes up when the server is back, and is not lost', async () => {
    const laptop = new Device().open()
    await settle()
    await laptop.star('goal')
    server.online = false
    await laptop.star('calendar')
    await laptop.comeBack() // still offline
    expect(laptop.favourites).toEqual(['goal', 'calendar'])
    server.online = true
    await laptop.comeBack()
    expect(server.record!.favourites).toEqual(['goal', 'calendar'])
    expect(laptop.favourites).toEqual(['goal', 'calendar'])
    laptop.close()
  })

  it('a star made offline is still sent after the app was closed', async () => {
    const laptop = new Device().open()
    await settle()
    server.online = false
    await laptop.star('calendar')
    laptop.close()
    server.online = true
    laptop.open()
    await settle()
    expect(server.record!.favourites).toEqual(['calendar'])
    expect(laptop.favourites).toEqual(['calendar'])
    laptop.close()
  })

  it('a star made before the first account read returns is kept', async () => {
    server.record!.favourites = ['reading']
    const laptop = new Device().open()
    laptop.tap('goal') // the account hasn't answered yet
    await settle()
    expect(server.record!.favourites).toEqual(['reading', 'goal'])
    expect(laptop.favourites).toEqual(['reading', 'goal'])
    laptop.close()
  })

  it('a star made while the device has never reached the server is kept', async () => {
    server.record!.favourites = ['reading']
    server.online = false
    const laptop = new Device().open()
    await settle()
    await laptop.star('goal')
    server.online = true
    await laptop.comeBack()
    expect(server.record!.favourites).toEqual(['reading', 'goal'])
    expect(laptop.favourites).toEqual(['reading', 'goal'])
    laptop.close()
  })

  it('Reset while arranging leaves the favourites alone, here and on the account', async () => {
    const laptop = new Device().open()
    await settle()
    await laptop.star('goal')
    await laptop.star('calendar')
    const before = writes().length
    act(() => laptop.hook!.result.current[1](resetLayout(laptop.layout)))
    await settle()
    expect(laptop.favourites).toEqual(['goal', 'calendar'])
    expect(writes().length).toBe(before)
    expect(server.record!.favourites).toEqual(['goal', 'calendar'])
    laptop.close()
  })

  it('while the server has no favourites field, each device keeps its own and nothing is written', async () => {
    server.hasField = false
    const laptop = new Device().open()
    await settle()
    await laptop.star('goal')
    expect(laptop.favourites).toEqual(['goal'])
    expect(writes()).toEqual([])
    expect(JSON.parse(laptop.storage.get(LAYOUT_KEY)!).favourites).toEqual(['goal'])
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
    expect(writes()).toEqual([])
    expect(server.record).toBeNull()
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
