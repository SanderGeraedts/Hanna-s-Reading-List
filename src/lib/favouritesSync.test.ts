import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { moveFavouriteTo, resetLayout, toggleFavourite, type BlockId, type DashboardLayout } from './dashboardLayout'

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
  /** calls of any kind still being answered */
  busy: 0,
  /**
   * tester (T-0020): after this many more favourites saves the connection
   * drops; with `loseAnswer` the save that drops it is applied but its answer
   * never arrives
   */
  dropAfterSaves: null as number | null,
  loseAnswer: false,
}))

vi.mock('#/server/pocketbase', async () => {
  const { applyChange, cleanFavourites } = await import('./favourites')
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
  async function answer(path: string, { method = 'GET', body }: { method?: string; body?: Record<string, unknown> }) {
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
      const next = applyChange(cleanFavourites(server.record.favourites), {
        add: cleanFavourites(body?.add),
        remove: cleanFavourites(body?.remove),
      })
      server.record.favourites = next
      if (server.dropAfterSaves !== null && --server.dropAfterSaves <= 0) {
        server.dropAfterSaves = null
        server.online = false
        if (server.loseAnswer) throw new Error("The reading-list server can't be reached right now.")
      }
      return { favourites: structuredClone(next) }
    }
    throw new Error(`unexpected ${method} ${path}`)
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
    if (!devices.includes(this)) devices.push(this)
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
  /** drags a favourite to list place `index` among the others (T-0020), without waiting for anything */
  move(id: BlockId, index: number) {
    act(() => this.hook!.result.current[1](moveFavouriteTo(this.layout, id, index)))
  }
  /** the dashboard comes back into view */
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

/**
 * Waits until every device has finished talking to the pretend server: no
 * call being answered for a few timer turns in a row. A device starts its next
 * call straight after the last one is answered, before any timer runs, so a
 * quiet turn means its queue is empty. No fixed sleeps: it waits as long as it
 * takes on a busy machine.
 */
const settle = () =>
  act(async () => {
    const until = Date.now() + 10_000
    for (let quiet = 0; quiet < 3; ) {
      await new Promise((r) => setTimeout(r, 1))
      quiet = server.busy === 0 ? quiet + 1 : 0
      if (Date.now() > until) throw new Error('the devices never finished talking to the server')
    }
  })

const writes = () => server.requests.filter((r) => r.method !== 'GET')

// nothing from one test's devices may reach the next test
afterEach(async () => {
  server.online = true
  for (const d of devices.splice(0)) d.close()
  await settle()
})

beforeEach(() => {
  server.busy = 0
  server.record = { id: 'r1', books: structuredClone(BOOKS), arrangement: 'title', favourites: null }
  server.hasField = true
  server.online = true
  server.requests = []
  server.saving = 0
  server.mostAtOnce = 0
  server.dropAfterSaves = null
  server.loseAnswer = false
})

describe('favourites follow the account (#182)', () => {
  it('shows blocks starred on one device on the other, and an unstar back on the first', async () => {
    const laptop = new Device().open()
    await settle()
    await laptop.star('lent')
    await laptop.star('readingtoday')
    expect(server.record!.favourites).toEqual(['lent', 'readingtoday'])

    const phone = new Device().open()
    await settle()
    expect(phone.favourites).toEqual(['lent', 'readingtoday'])

    await phone.star('lent') // takes the star off
    expect(server.record!.favourites).toEqual(['readingtoday'])

    await laptop.comeBack()
    expect(laptop.favourites).toEqual(['readingtoday'])
    laptop.close()
    phone.close()
  })

  it('never touches the books: saves only send stars and unstars, never the shelf', async () => {
    const laptop = new Device().open()
    await settle()
    await laptop.star('lent')
    await laptop.star('challenge')
    await laptop.star('lent')
    expect(writes().map((w) => w.body)).toEqual([
      { add: ['lent'], remove: [] },
      { add: ['challenge'], remove: [] },
      // an unstar also clears the ids My year used to be saved under (T-0080, D-0060),
      // so an old star can't come back on the next read
      { add: [], remove: ['lent'] },
    ])
    expect(server.record!.books).toEqual(BOOKS)
    expect(server.record!.arrangement).toBe('title')
    laptop.close()
  })

  it('two quick taps on one device keep both stars, sent one at a time', async () => {
    const laptop = new Device().open()
    await settle()
    laptop.tap('lent')
    laptop.tap('readingtoday') // before the first save is back
    await settle()
    expect(server.record!.favourites).toEqual(['lent', 'readingtoday'])
    expect(server.mostAtOnce).toBe(1)
    await laptop.comeBack()
    expect(laptop.favourites).toEqual(['lent', 'readingtoday'])
    laptop.close()
  })

  it('two devices starring at the same instant keep both stars', async () => {
    const laptop = new Device().open()
    const phone = new Device().open()
    await settle()
    laptop.tap('lent')
    phone.tap('challenge') // neither save has come back yet
    await settle()
    expect(server.record!.favourites).toEqual(['lent', 'challenge'])
    await laptop.comeBack()
    expect(laptop.favourites).toEqual(['lent', 'challenge'])
    laptop.close()
    phone.close()
  })

  it("a device without favourites doesn't wipe the account's", async () => {
    server.record!.favourites = ['lent', 'fact']
    const fresh = new Device().open()
    await settle()
    expect(fresh.favourites).toEqual(['lent', 'fact'])
    expect(writes()).toEqual([])
    expect(server.record!.favourites).toEqual(['lent', 'fact'])
    fresh.close()
  })

  it("the first time, a device's own favourites go up when the account has none", async () => {
    const laptop = new Device()
    laptop.storage.set(LAYOUT_KEY, withFavourites(['pick', 'lent']))
    laptop.open()
    await settle()
    expect(server.record!.favourites).toEqual(['pick', 'lent'])
    expect(laptop.favourites).toEqual(['pick', 'lent'])
    laptop.close()
  })

  it("the first time, the account's win when it has any", async () => {
    server.record!.favourites = ['readingtoday']
    const laptop = new Device()
    laptop.storage.set(LAYOUT_KEY, withFavourites(['pick', 'lent']))
    laptop.open()
    await settle()
    expect(laptop.favourites).toEqual(['readingtoday'])
    expect(server.record!.favourites).toEqual(['readingtoday'])
    laptop.close()
  })

  it('after unstarring everything on one device, another device does not bring its old stars back', async () => {
    const laptop = new Device().open()
    await settle()
    await laptop.star('lent')
    const phone = new Device().open()
    await settle()
    expect(phone.favourites).toEqual(['lent'])
    await phone.star('lent')
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
    await laptop.star('lent')
    server.online = false
    await laptop.star('challenge')
    await laptop.comeBack() // still offline
    expect(laptop.favourites).toEqual(['lent', 'challenge'])
    server.online = true
    await laptop.comeBack()
    expect(server.record!.favourites).toEqual(['lent', 'challenge'])
    expect(laptop.favourites).toEqual(['lent', 'challenge'])
    laptop.close()
  })

  it('a star made offline is still sent after the app was closed', async () => {
    const laptop = new Device().open()
    await settle()
    server.online = false
    await laptop.star('challenge')
    laptop.close()
    server.online = true
    laptop.open()
    await settle()
    expect(server.record!.favourites).toEqual(['challenge'])
    expect(laptop.favourites).toEqual(['challenge'])
    laptop.close()
  })

  it('a star made before the first account read returns is kept', async () => {
    server.record!.favourites = ['readingtoday']
    const laptop = new Device().open()
    laptop.tap('lent') // the account hasn't answered yet
    await settle()
    expect(server.record!.favourites).toEqual(['readingtoday', 'lent'])
    expect(laptop.favourites).toEqual(['readingtoday', 'lent'])
    laptop.close()
  })

  it('a star made while the device has never reached the server is kept', async () => {
    server.record!.favourites = ['readingtoday']
    server.online = false
    const laptop = new Device().open()
    await settle()
    await laptop.star('lent')
    server.online = true
    await laptop.comeBack()
    expect(server.record!.favourites).toEqual(['readingtoday', 'lent'])
    expect(laptop.favourites).toEqual(['readingtoday', 'lent'])
    laptop.close()
  })

  it('Reset while arranging leaves the favourites alone, here and on the account', async () => {
    const laptop = new Device().open()
    await settle()
    await laptop.star('lent')
    await laptop.star('challenge')
    const before = writes().length
    act(() => laptop.hook!.result.current[1](resetLayout(laptop.layout)))
    await settle()
    expect(laptop.favourites).toEqual(['lent', 'challenge'])
    expect(writes().length).toBe(before)
    expect(server.record!.favourites).toEqual(['lent', 'challenge'])
    laptop.close()
  })

  it('while the server has no favourites field, each device keeps its own and nothing is written', async () => {
    server.hasField = false
    const laptop = new Device().open()
    await settle()
    await laptop.star('lent')
    expect(laptop.favourites).toEqual(['lent'])
    expect(writes()).toEqual([])
    expect(JSON.parse(laptop.storage.get(LAYOUT_KEY)!).favourites).toEqual(['lent'])
    laptop.close()

    // once the field arrives, the device's own go up the first time
    server.hasField = true
    laptop.open()
    await settle()
    expect(server.record!.favourites).toEqual(['lent'])
    laptop.close()
  })

  it('makes no shelf record: with none on the server, favourites stay on the device', async () => {
    server.record = null
    const laptop = new Device().open()
    await settle()
    await laptop.star('lent')
    expect(laptop.favourites).toEqual(['lent'])
    expect(writes()).toEqual([])
    expect(server.record).toBeNull()
    laptop.close()
  })

  it('signed out, favourites stay on the device and the server is never asked', async () => {
    const guest = new Device(null).open()
    await settle()
    await guest.star('lent')
    await guest.comeBack()
    expect(guest.favourites).toEqual(['lent'])
    expect(server.requests).toEqual([])
    expect(JSON.parse(guest.storage.get('hannas-reading-list:dashboard:local')!).favourites).toEqual(['lent'])
    guest.close()
  })

  describe('the order she drags them into (T-0020, D-0028)', () => {
    const FOUR: BlockId[] = ['lent', 'readingtoday', 'challenge', 'pick']

    it('a reorder on one device is on the account in that order, and the other device shows it after its next pull', async () => {
      server.record!.favourites = [...FOUR]
      const laptop = new Device().open()
      const phone = new Device().open()
      await settle()
      expect(phone.favourites).toEqual(FOUR)
      laptop.move('pick', 0)
      expect(laptop.favourites).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
      await settle()
      expect(server.record!.favourites).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
      await phone.comeBack()
      expect(phone.favourites).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
    })

    it("is not undone by the device's own next pull", async () => {
      server.record!.favourites = [...FOUR]
      const laptop = new Device().open()
      await settle()
      laptop.move('lent', 2) // [reading, calendar, goal, pace]
      await laptop.comeBack()
      expect(laptop.favourites).toEqual(['readingtoday', 'challenge', 'lent', 'pick'])
      await laptop.comeBack()
      expect(laptop.favourites).toEqual(['readingtoday', 'challenge', 'lent', 'pick'])
      expect(server.record!.favourites).toEqual(['readingtoday', 'challenge', 'lent', 'pick'])
      // and the dashboard opened again (a reload) shows it too
      laptop.close()
      laptop.open()
      await settle()
      expect(laptop.favourites).toEqual(['readingtoday', 'challenge', 'lent', 'pick'])
    })

    it('a reorder made offline goes up when the server is back', async () => {
      server.record!.favourites = [...FOUR]
      const laptop = new Device().open()
      await settle()
      server.online = false
      laptop.move('challenge', 0)
      await laptop.comeBack() // still offline
      expect(laptop.favourites).toEqual(['challenge', 'lent', 'readingtoday', 'pick'])
      expect(server.record!.favourites).toEqual(FOUR)
      server.online = true
      await laptop.comeBack()
      expect(server.record!.favourites).toEqual(['challenge', 'lent', 'readingtoday', 'pick'])
      expect(laptop.favourites).toEqual(['challenge', 'lent', 'readingtoday', 'pick'])
    })

    it('a reorder made offline is still sent after the app was closed', async () => {
      server.record!.favourites = [...FOUR]
      const laptop = new Device().open()
      await settle()
      server.online = false
      laptop.move('readingtoday', 3)
      await settle()
      laptop.close()
      server.online = true
      laptop.open()
      expect(laptop.favourites).toEqual(['lent', 'challenge', 'pick', 'readingtoday'])
      await settle()
      expect(server.record!.favourites).toEqual(['lent', 'challenge', 'pick', 'readingtoday'])
      expect(laptop.favourites).toEqual(['lent', 'challenge', 'pick', 'readingtoday'])
    })

    it('a block unstarred on the other device meanwhile stays unstarred, and the moved block lands where she put it', async () => {
      server.record!.favourites = [...FOUR]
      const laptop = new Device().open()
      const phone = new Device().open()
      await settle()
      server.online = false
      laptop.move('pick', 0) // past goal, reading and calendar
      await settle()
      server.online = true
      await phone.star('readingtoday') // takes the star off
      expect(server.record!.favourites).toEqual(['lent', 'challenge', 'pick'])
      await laptop.comeBack()
      expect(server.record!.favourites).toEqual(['pick', 'lent', 'challenge'])
      expect(laptop.favourites).toEqual(['pick', 'lent', 'challenge'])
      await phone.comeBack()
      expect(phone.favourites).toEqual(['pick', 'lent', 'challenge'])
    })

    it('a block starred on the other device at the same time stays, and no block is in the list twice', async () => {
      server.record!.favourites = [...FOUR]
      const laptop = new Device().open()
      const phone = new Device().open()
      await settle()
      laptop.move('pick', 0)
      phone.tap('fact') // neither has gone up yet
      await settle()
      await laptop.comeBack()
      await phone.comeBack()
      const account = server.record!.favourites as BlockId[]
      expect([...account].sort()).toEqual(['challenge', 'fact', 'lent', 'pick', 'readingtoday'])
      expect(new Set(account).size).toBe(account.length)
      expect(account[0]).toBe('pick')
      expect(account.filter((id) => id !== 'fact')).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
      expect(laptop.favourites).toEqual(account)
      expect(phone.favourites).toEqual(account)
    })

    it('sends only stars and unstars, never the shelf, one save at a time', async () => {
      server.record!.favourites = [...FOUR]
      const laptop = new Device().open()
      await settle()
      laptop.move('pick', 0)
      laptop.move('lent', 3) // before the first has gone up
      laptop.move('challenge', 1)
      await settle()
      expect(laptop.favourites).toEqual(['pick', 'challenge', 'readingtoday', 'lent'])
      expect(server.record!.favourites).toEqual(['pick', 'challenge', 'readingtoday', 'lent'])
      expect(writes().length).toBeGreaterThan(0)
      for (const w of writes()) {
        expect(w.path).toBe('/api/collections/libraries/favourites')
        expect(Object.keys(w.body as object).sort()).toEqual(['add', 'remove'])
      }
      expect(server.record!.books).toEqual(BOOKS)
      expect(server.record!.arrangement).toBe('title')
      expect(server.mostAtOnce).toBe(1)
    })

    it('a move to the end sends just that block', async () => {
      server.record!.favourites = [...FOUR]
      const laptop = new Device().open()
      await settle()
      laptop.move('readingtoday', 3)
      await settle()
      expect(writes().map((w) => w.body)).toEqual([
        { add: [], remove: ['readingtoday'] },
        { add: ['readingtoday'], remove: [] },
      ])
    })

    it('signed out, a reorder stays on the device and the server is never asked', async () => {
      const guest = new Device(null)
      guest.storage.set('hannas-reading-list:dashboard:local', withFavourites([...FOUR]))
      guest.open()
      await settle()
      guest.move('pick', 0)
      await guest.comeBack()
      expect(guest.favourites).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
      expect(server.requests).toEqual([])
      expect(JSON.parse(guest.storage.get('hannas-reading-list:dashboard:local')!).favourites).toEqual([
        'pick',
        'lent',
        'readingtoday',
        'challenge',
      ])
    })

    describe('tester (T-0020): what could go wrong between and around the two saves', () => {
      const UNSENT_KEY = `hannas-reading-list:favourites-unsent:${ACCOUNT}`
      const MET_KEY = `hannas-reading-list:favourites-met:${ACCOUNT}`

      it('the connection drops after the unstar: the device keeps the re-star and sends it later, nothing lost', async () => {
        server.record!.favourites = [...FOUR]
        const laptop = new Device().open()
        await settle()
        server.dropAfterSaves = 1 // the unstar of the tail lands, then the connection is gone
        laptop.move('pick', 0)
        await settle()
        expect(server.record!.favourites).toEqual(['pick']) // the partial state on the account
        expect(laptop.favourites).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
        expect(JSON.parse(laptop.storage.get(UNSENT_KEY)!)).toEqual([
          { add: ['lent', 'readingtoday', 'challenge'], remove: [] },
        ])
        laptop.close() // and the app is closed in between
        server.online = true
        laptop.open()
        await settle()
        expect(server.record!.favourites).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
        expect(laptop.favourites).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
        expect(laptop.storage.get(UNSENT_KEY) ?? '[]').toBe('[]')
      })

      it('the unstar lands but its answer is lost: sending it again does no harm and the order ends right', async () => {
        server.record!.favourites = [...FOUR]
        const laptop = new Device().open()
        await settle()
        server.dropAfterSaves = 1
        server.loseAnswer = true
        laptop.move('pick', 0)
        await settle()
        expect(server.record!.favourites).toEqual(['pick'])
        server.online = true
        await laptop.comeBack()
        expect(server.record!.favourites).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
        expect(laptop.favourites).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
      })

      it('another device that pulls between the two saves gets the whole list back after the re-star', async () => {
        server.record!.favourites = [...FOUR]
        const laptop = new Device().open()
        await settle()
        server.dropAfterSaves = 1
        laptop.move('pick', 0)
        await settle()
        server.online = true
        // (comeBack wakes every open device, so the phone is opened here to see the partial state alone)
        const phone = new Device().open()
        await settle()
        expect(phone.favourites).toEqual(['pick'])
        await laptop.comeBack() // the re-star goes up (the phone pulls too)
        await phone.comeBack()
        expect(phone.favourites).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
        expect(server.record!.favourites).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
      })

      it('a star on another device between the two saves stays, once, with every block back', async () => {
        server.record!.favourites = [...FOUR]
        const laptop = new Device().open()
        const phone = new Device().open()
        await settle()
        server.dropAfterSaves = 1
        laptop.move('pick', 0)
        await settle()
        server.online = true
        await phone.star('fact')
        await laptop.comeBack()
        await phone.comeBack()
        const account = server.record!.favourites as BlockId[]
        expect([...account].sort()).toEqual(['challenge', 'fact', 'lent', 'pick', 'readingtoday'])
        expect(new Set(account).size).toBe(account.length)
        expect(account.filter((id) => id !== 'fact')).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
        expect(laptop.favourites).toEqual(account)
        expect(phone.favourites).toEqual(account)
      })

      it('a move of a block unstarred on another device meanwhile is dropped: it stays unstarred', async () => {
        server.record!.favourites = [...FOUR]
        const laptop = new Device().open()
        const phone = new Device().open()
        await settle()
        server.online = false
        laptop.move('pick', 0)
        await settle()
        server.online = true
        await phone.star('pick') // takes the star off pace on the phone
        await laptop.comeBack()
        expect(server.record!.favourites).toEqual(['lent', 'readingtoday', 'challenge'])
        expect(laptop.favourites).toEqual(['lent', 'readingtoday', 'challenge'])
        expect(writes().filter((w) => JSON.stringify(w.body).includes('pick'))).toEqual([
          expect.objectContaining({ body: { add: [], remove: ['pick'] } }),
        ])
      })

      it('repeated moves made offline, there and back again, end in her last order after the app was closed', async () => {
        server.record!.favourites = [...FOUR]
        const laptop = new Device().open()
        await settle()
        server.online = false
        laptop.move('pick', 0)
        laptop.move('pick', 3)
        laptop.move('lent', 2)
        laptop.move('readingtoday', 0)
        await settle()
        const want = laptop.favourites
        expect(want).toEqual(['readingtoday', 'challenge', 'lent', 'pick'])
        laptop.close()
        server.online = true
        laptop.open()
        await settle()
        expect(server.record!.favourites).toEqual(want)
        expect(laptop.favourites).toEqual(want)
        expect(server.mostAtOnce).toBe(1)
      })

      it('a queue in the old format (stars and unstars only) still loads and goes up', async () => {
        server.record!.favourites = ['lent', 'readingtoday']
        const laptop = new Device()
        laptop.storage.set(LAYOUT_KEY, withFavourites(['lent', 'challenge', 'fact']))
        laptop.storage.set(MET_KEY, '1')
        // as an app before T-0020 left it, with a junk entry in between
        laptop.storage.set(
          UNSENT_KEY,
          JSON.stringify([{ add: [], remove: ['readingtoday'] }, null, { add: ['challenge', 'nonsense'] }, { add: ['fact'], remove: [] }]),
        )
        laptop.open()
        await settle()
        expect(server.record!.favourites).toEqual(['lent', 'challenge', 'fact'])
        expect(laptop.favourites).toEqual(['lent', 'challenge', 'fact'])
        expect(laptop.storage.get(UNSENT_KEY) ?? '[]').toBe('[]')
      })

      it('the old queue and a new move together: the stars go first, then the move, in her order', async () => {
        server.record!.favourites = ['lent', 'readingtoday']
        const laptop = new Device()
        laptop.storage.set(LAYOUT_KEY, withFavourites(['lent', 'readingtoday', 'fact']))
        laptop.storage.set(MET_KEY, '1')
        laptop.storage.set(UNSENT_KEY, JSON.stringify([{ add: ['fact'], remove: [] }]))
        server.online = false
        laptop.open()
        await settle()
        laptop.move('fact', 0)
        await settle()
        server.online = true
        await laptop.comeBack()
        expect(server.record!.favourites).toEqual(['fact', 'lent', 'readingtoday'])
        expect(laptop.favourites).toEqual(['fact', 'lent', 'readingtoday'])
      })
    })

    it('while the server has no favourites field, a reorder stays on the device and nothing is written', async () => {
      server.hasField = false
      const laptop = new Device()
      laptop.storage.set(LAYOUT_KEY, withFavourites([...FOUR]))
      laptop.open()
      await settle()
      laptop.move('pick', 0)
      await laptop.comeBack()
      expect(laptop.favourites).toEqual(['pick', 'lent', 'readingtoday', 'challenge'])
      expect(writes()).toEqual([])
    })
  })

  it('ignores junk the server sends back', async () => {
    server.record!.favourites = ['lent', 'lent', 'nonsense', 5]
    const laptop = new Device().open()
    await settle()
    expect(laptop.favourites).toEqual(['lent'])
    laptop.close()
  })
})
