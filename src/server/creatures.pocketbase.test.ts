// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest'

/**
 * Hanna's creature choices (D-0034, T-0028) against a real, local, throwaway
 * PocketBase started with this repo's migrations and hooks
 * (docs/hanna-guardrails.md). Skipped unless PB_TEST_URL is set, so
 * `pnpm test` and CI never need a server:
 *
 *   SIGNUP_EMAILS=cre-a@example.com,cre-b@example.com pocketbase serve --dir=<empty dir> \
 *     --migrationsDir=deploy/nas/pb_migrations --hooksDir=deploy/nas/pb_hooks
 *   PB_TEST_URL=http://127.0.0.1:8090 pnpm exec vitest run src/server/creatures.pocketbase.test.ts
 *
 * PB_TEST_OLD_URL (optional): a second one started with the same hooks but
 * without the creatures migration, to check the route leaves it alone.
 * Only a local address is accepted; never point this at the real server.
 */

const URL_ = process.env.PB_TEST_URL
const OLD_URL = process.env.PB_TEST_OLD_URL
const local = (u: string) => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(u).hostname)
if (URL_ && !local(URL_)) throw new Error('PB_TEST_URL must be a local throwaway PocketBase')
if (OLD_URL && !local(OLD_URL)) throw new Error('PB_TEST_OLD_URL must be a local throwaway PocketBase')

// The real saveShelf, run outside TanStack Start: a server function becomes
// its handler, and the session cookie is the token the test signs in with.
const session = vi.hoisted(() => ({ token: null as string | null }))
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    let validate = (x: unknown) => x
    const fn = {
      validator(v: (x: any) => unknown) {
        validate = v
        return fn
      },
      handler(h: (o: { data: any }) => unknown) {
        return (o?: { data?: unknown }) => h({ data: validate(o?.data) })
      },
    }
    return fn
  },
}))
vi.mock('@tanstack/react-start/server', () => ({
  getCookie: () => session.token,
  setCookie: () => {},
  deleteCookie: () => {},
}))

const PASSWORD = 'creatures-test-123'
const ROUTE = '/api/collections/libraries/creatures'

async function api<T = any>(base: string, path: string, init: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(base + path, {
    method: init.method ?? 'GET',
    headers: {
      ...(init.body !== undefined && { 'content-type': 'application/json' }),
      ...(init.token && { authorization: init.token }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  return { status: res.status, json: (await res.json().catch(() => null)) as T }
}

/** Signs up (if needed) and signs in; gives the token and user id. */
async function user(base: string, email: string) {
  await api(base, '/api/collections/users/records', {
    method: 'POST',
    body: { email, password: PASSWORD, passwordConfirm: PASSWORD },
  })
  const { status, json } = await api(base, '/api/collections/users/auth-with-password', {
    method: 'POST',
    body: { identity: email, password: PASSWORD },
  })
  if (status !== 200) throw new Error(`could not sign in ${email} (${status}); is it in SIGNUP_EMAILS?`)
  return { token: json.token as string, id: json.record.id as string }
}

/** The whole shelf record, as the app's shelf sync sees it. */
const shelf = async (base: string, token: string) =>
  (await api(base, '/api/collections/libraries/records?perPage=1', { token })).json.items[0]

type Ev = { id: string; at: number; kind: string; [k: string]: string | number }
const post = (base: string, token: string, events: unknown) =>
  api<{ creatures: Ev[] }>(base, ROUTE, { method: 'POST', token, body: { events } })
const ids = (log: Ev[]) => log.map((e) => e.id)

const BOOKS = [
  { id: 'a', title: 'A', status: 'read' },
  { id: 'b', title: 'B', status: 'reading' },
]

describe.skipIf(!URL_)('creature choices on a local PocketBase (T-0028)', () => {
  let a: { token: string; id: string }
  let b: { token: string; id: string }
  let recordId: string

  beforeAll(async () => {
    a = await user(URL_!, 'cre-a@example.com')
    b = await user(URL_!, 'cre-b@example.com')
  })

  it('no shelf record yet: 404, and no record is made', async () => {
    const r = await post(URL_!, a.token, [{ id: 'buy-1', at: 1, kind: 'buy', egg: 'common', price: 60 }])
    expect(r.status).toBe(404)
    expect((await api(URL_!, '/api/collections/libraries/records', { token: a.token })).json.items).toEqual([])
    // the first shelf save, as the app does it
    const made = await api(URL_!, '/api/collections/libraries/records', {
      method: 'POST',
      token: a.token,
      body: { owner: a.id, books: BOOKS, arrangement: 'title' },
    })
    expect(made.status).toBe(200)
    recordId = made.json.id
    expect((await shelf(URL_!, a.token)).creatures).toBeNull()
  })

  it('signed out it refuses', async () => {
    const r = await api(URL_!, ROUTE, { method: 'POST', body: { events: [{ id: 'x', at: 1, kind: 'feed' }] } })
    expect(r.status).toBe(401)
  })

  it('adds events, answers with the whole log, and leaves the books alone', async () => {
    const r = await post(URL_!, a.token, [
      { id: 'hatch-welcome', at: 10, kind: 'hatch', egg: 'welcome', species: 'cat' },
      { id: 'buy-1', at: 11, kind: 'buy', egg: 'common', price: 60 },
    ])
    expect(r.status).toBe(200)
    expect(r.json.creatures).toEqual([
      { id: 'hatch-welcome', at: 10, kind: 'hatch', egg: 'welcome', species: 'cat' },
      { id: 'buy-1', at: 11, kind: 'buy', egg: 'common', price: 60 },
    ])
    // an empty call only reads
    expect((await post(URL_!, a.token, [])).json.creatures).toEqual(r.json.creatures)
    const s = await shelf(URL_!, a.token)
    expect(s.books).toEqual(BOOKS)
    expect(s.arrangement).toBe('title')
    expect(s.creatures).toEqual(r.json.creatures)
  })

  it('posting the same event twice stores it once, and never changes it', async () => {
    const before = await shelf(URL_!, a.token)
    const again = await post(URL_!, a.token, [
      { id: 'buy-1', at: 11, kind: 'buy', egg: 'common', price: 60 },
      { id: 'buy-1', at: 99, kind: 'buy', egg: 'legendary', price: 0 }, // same id, other content
    ])
    expect(again.status).toBe(200)
    expect(again.json.creatures.filter((e) => e.id === 'buy-1')).toEqual([
      { id: 'buy-1', at: 11, kind: 'buy', egg: 'common', price: 60 },
    ])
    // nothing new: not even `updated` moved
    expect((await shelf(URL_!, a.token)).updated).toBe(before.updated)
    // twice in one call: once
    const twice = await post(URL_!, a.token, [
      { id: 'feed-1', at: 12, kind: 'feed', pet: 'p1' },
      { id: 'feed-1', at: 12, kind: 'feed', pet: 'p1' },
    ])
    expect(ids(twice.json.creatures).filter((id) => id === 'feed-1')).toHaveLength(1)
  })

  it('a newer setting replaces the older one with the same key; an older one does not replace a newer one', async () => {
    let r = await post(URL_!, a.token, [{ id: 'name-1', at: 100, kind: 'name', key: 'p1', name: 'Biscuit' }])
    expect(r.json.creatures).toContainEqual({ id: 'name-1', at: 100, kind: 'name', key: 'p1', name: 'Biscuit' })
    r = await post(URL_!, a.token, [{ id: 'name-2', at: 200, kind: 'name', key: 'p1', name: 'Muffin' }])
    expect(ids(r.json.creatures)).toContain('name-2')
    expect(ids(r.json.creatures)).not.toContain('name-1')
    // older, arriving later (from a device that was offline): not stored
    r = await post(URL_!, a.token, [{ id: 'name-0', at: 150, kind: 'name', key: 'p1', name: 'Crumb' }])
    expect(r.json.creatures.filter((e) => e.kind === 'name' && e.key === 'p1')).toEqual([
      { id: 'name-2', at: 200, kind: 'name', key: 'p1', name: 'Muffin' },
    ])
    // another key, or another kind with the same key, is its own setting
    r = await post(URL_!, a.token, [
      { id: 'name-3', at: 50, kind: 'name', key: 'p2', name: 'Pip' },
      { id: 'wear-1', at: 10, kind: 'wear', key: 'p1', item: 'scarf' },
    ])
    expect(ids(r.json.creatures)).toEqual(expect.arrayContaining(['name-2', 'name-3', 'wear-1']))
    // non-setting events are never dropped, however old
    r = await post(URL_!, a.token, [{ id: 'feed-0', at: 1, kind: 'feed', pet: 'p1' }])
    expect(ids(r.json.creatures)).toEqual(expect.arrayContaining(['hatch-welcome', 'buy-1', 'feed-1', 'feed-0']))
  })

  it('a bad event is dropped, the good ones in the same call kept', async () => {
    const r = await post(URL_!, a.token, [
      { id: 'good-1', at: 300, kind: 'feed', pet: 'p1' },
      { id: 'bad id!', at: 300, kind: 'feed' },
      { id: 'x'.repeat(61), at: 300, kind: 'feed' },
      { id: 'bad-at', at: '300', kind: 'feed' },
      { id: 'bad-kind', at: 300, kind: 'delete' },
      { id: 'bad-long', at: 300, kind: 'feed', note: 'y'.repeat(61) },
      { id: 'bad-nested', at: 300, kind: 'feed', pet: { id: 'p1' } },
      { id: 'bad-bool', at: 300, kind: 'feed', happy: true },
      { id: 'bad-nokey', at: 300, kind: 'name', name: 'No key' },
      'not an event',
      null,
      { id: 'good-2', at: 301, kind: 'release', pet: 'p9' },
    ])
    expect(r.status).toBe(200)
    const got = ids(r.json.creatures)
    expect(got).toEqual(expect.arrayContaining(['good-1', 'good-2']))
    expect(got.filter((id) => id.startsWith('bad') || id.startsWith('xxx'))).toEqual([])
    // not a list at all: nothing added, the log answered
    const none = await api<{ creatures: Ev[] }>(URL_!, ROUTE, { method: 'POST', token: a.token, body: { events: 'x' } })
    expect(none.status).toBe(200)
    expect(none.json.creatures).toEqual(r.json.creatures)
  })

  it('more than 200 events in one call: 400, nothing written', async () => {
    const before = await shelf(URL_!, a.token)
    const many = Array.from({ length: 201 }, (_, i) => ({ id: `many-${i}`, at: i, kind: 'feed' }))
    expect((await post(URL_!, a.token, many)).status).toBe(400)
    expect(await shelf(URL_!, a.token)).toEqual(before)
  })

  it('two overlapping posts from two devices both land', async () => {
    let lost = 0
    for (let round = 0; round < 20; round++) {
      const phone = Array.from({ length: 3 }, (_, i) => ({ id: `phone-${round}-${i}`, at: 1000 + round, kind: 'feed' }))
      const laptop = Array.from({ length: 3 }, (_, i) => ({ id: `laptop-${round}-${i}`, at: 1000 + round, kind: 'buy', price: 60 }))
      // started together, neither awaited before the other
      const [p, l] = await Promise.all([post(URL_!, a.token, phone), post(URL_!, a.token, laptop)])
      expect(p.status).toBe(200)
      expect(l.status).toBe(200)
      const now = ids((await post(URL_!, a.token, [])).json.creatures)
      if (![...phone, ...laptop].every((e) => now.includes(e.id))) lost++
    }
    expect(lost).toBe(0)
    expect((await shelf(URL_!, a.token)).books).toEqual(BOOKS)
  })

  it('a shelf save (saveShelf) leaves creatures unchanged', async () => {
    const before = (await shelf(URL_!, a.token)).creatures
    process.env.POCKETBASE_URL = URL_
    session.token = a.token
    const { saveShelf } = await import('./shelf')
    const books = [...BOOKS, { id: 'c', title: 'C', status: 'want' }]
    await saveShelf({ data: { books: books as never, arrangement: 'author', base: null, removed: [] } })
    const after = await shelf(URL_!, a.token)
    expect(after.books.map((x: { id: string }) => x.id)).toEqual(['a', 'b', 'c'])
    expect(after.arrangement).toBe('author')
    expect(after.creatures).toEqual(before)
    // and a creatures post after it keeps the new books
    await post(URL_!, a.token, [{ id: 'after-save', at: 2000, kind: 'feed' }])
    expect((await shelf(URL_!, a.token)).books.map((x: { id: string }) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it("another user's record is never touched", async () => {
    const aBefore = await shelf(URL_!, a.token)
    // no shelf of their own: 404, and nothing written anywhere
    expect((await post(URL_!, b.token, [{ id: 'b-1', at: 1, kind: 'feed' }])).status).toBe(404)
    expect(await shelf(URL_!, a.token)).toEqual(aBefore)
    // straight at a's record: not found for them
    const patch = await api(URL_!, `/api/collections/libraries/records/${recordId}`, {
      method: 'PATCH',
      token: b.token,
      body: { creatures: [] },
    })
    expect(patch.status).toBe(404)
    // with a shelf of their own, the route only ever writes theirs
    await api(URL_!, '/api/collections/libraries/records', {
      method: 'POST',
      token: b.token,
      body: { owner: b.id, books: [], arrangement: '' },
    })
    const r = await post(URL_!, b.token, [{ id: 'b-1', at: 1, kind: 'feed' }])
    expect(r.status).toBe(200)
    expect(r.json.creatures).toEqual([{ id: 'b-1', at: 1, kind: 'feed' }])
    expect(await shelf(URL_!, a.token)).toEqual(aBefore)
  })

  it('cleans junk something else wrote, and keeps every real event', async () => {
    const real = (await shelf(URL_!, a.token)).creatures as Ev[]
    await api(URL_!, `/api/collections/libraries/records/${recordId}`, {
      method: 'PATCH',
      token: a.token,
      body: { creatures: [...real, 7, 'junk', { id: 'no kind', at: 1 }] },
    })
    const r = await post(URL_!, a.token, [])
    expect(r.json.creatures).toEqual(real)
  })

  it('keeps at most 20,000 events: over the limit it refuses with 400 and writes nothing', async () => {
    const real = (await shelf(URL_!, a.token)).creatures as Ev[]
    const fill = Array.from({ length: 20_000 - real.length }, (_, i) => ({ id: `f${i}`, at: i, kind: 'feed' }))
    const set = await api(URL_!, `/api/collections/libraries/records/${recordId}`, {
      method: 'PATCH',
      token: a.token,
      body: { creatures: [...real, ...fill] },
    })
    expect(set.status).toBe(200)
    const before = await shelf(URL_!, a.token)
    expect(before.creatures).toHaveLength(20_000)
    expect((await post(URL_!, a.token, [{ id: 'one-too-many', at: 1, kind: 'feed' }])).status).toBe(400)
    expect(await shelf(URL_!, a.token)).toEqual(before)
    // a newer setting that replaces an older one still fits
    const r = await post(URL_!, a.token, [{ id: 'name-4', at: 300, kind: 'name', key: 'p1', name: 'Toast' }])
    expect(r.status).toBe(200)
    expect(r.json.creatures).toHaveLength(20_000)
    expect(ids(r.json.creatures)).not.toContain('name-2')
  }, 60_000)
})

describe.skipIf(!OLD_URL)('creature choices on a local PocketBase without the field (T-0028)', () => {
  it('a server started without the migration answers 404 and writes nothing', async () => {
    const a = await user(OLD_URL!, 'cre-a@example.com')
    const made = await api(OLD_URL!, '/api/collections/libraries/records', {
      method: 'POST',
      token: a.token,
      body: { owner: a.id, books: BOOKS, arrangement: 'title' },
    })
    expect(made.status).toBe(200)
    const before = await shelf(OLD_URL!, a.token)
    const r = await post(OLD_URL!, a.token, [{ id: 'buy-1', at: 1, kind: 'buy', price: 60 }])
    expect(r.status).toBe(404)
    const after = await shelf(OLD_URL!, a.token)
    expect(after).toEqual(before) // not even `updated` moved
    expect(after.creatures).toBeUndefined()
  })
})
