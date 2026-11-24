// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * The favourites (#182) against a real, local, throwaway PocketBase started
 * with this repo's migrations and hooks (docs/hanna-guardrails.md). Skipped
 * unless PB_TEST_URL is set, so `pnpm test` and CI never need a server:
 *
 *   SIGNUP_EMAILS=fav-a@example.com,fav-b@example.com pocketbase serve --dir=<empty dir> \
 *     --migrationsDir=deploy/nas/pb_migrations --hooksDir=deploy/nas/pb_hooks
 *   PB_TEST_URL=http://127.0.0.1:8090 pnpm exec vitest run src/server/favourites.pocketbase.test.ts
 *
 * PB_TEST_OLD_URL (optional): a second one started without the favourites
 * migration, to check the app leaves a server without the field alone.
 * Only a local address is accepted; never point this at the real server.
 */

const URL_ = process.env.PB_TEST_URL
const OLD_URL = process.env.PB_TEST_OLD_URL
const local = (u: string) => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(u).hostname)
if (URL_ && !local(URL_)) throw new Error('PB_TEST_URL must be a local throwaway PocketBase')
if (OLD_URL && !local(OLD_URL)) throw new Error('PB_TEST_OLD_URL must be a local throwaway PocketBase')

const PASSWORD = 'favourites-test-123'

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

const BOOKS = [
  { id: 'a', title: 'A', status: 'read' },
  { id: 'b', title: 'B', status: 'reading' },
]

describe.skipIf(!URL_)('favourites on a local PocketBase (#182)', () => {
  let srv: typeof import('./favouritesStore')
  let a: { token: string; id: string }
  let b: { token: string; id: string }
  let recordId: string

  beforeAll(async () => {
    process.env.POCKETBASE_URL = URL_
    srv = await import('./favouritesStore')
    a = await user(URL_!, 'fav-a@example.com')
    b = await user(URL_!, 'fav-b@example.com')
    // a fresh account: no shelf yet, so nothing may be written
    expect(await srv.readFavourites(a.token)).toEqual({ kept: false })
    expect(await srv.changeFavourites(a.token, { add: ['myyear'], remove: [] })).toEqual({ kept: false })
    expect((await api(URL_!, '/api/collections/libraries/records', { token: a.token })).json.items).toEqual([])
    // the first shelf save, as the app does it
    const made = await api(URL_!, '/api/collections/libraries/records', {
      method: 'POST',
      token: a.token,
      body: { owner: a.id, books: BOOKS, arrangement: 'title' },
    })
    expect(made.status).toBe(200)
    recordId = made.json.id
  })

  it('has the field on the shelf record, empty until something is starred', async () => {
    expect(await srv.readFavourites(a.token)).toEqual({ kept: true, favourites: [] })
    expect((await shelf(URL_!, a.token)).favourites).toBeNull()
  })

  it('saves stars and unstars on their own and leaves the books alone', async () => {
    expect(await srv.changeFavourites(a.token, { add: ['myyear', 'reading', 'calendar'], remove: [] })).toEqual({
      kept: true,
      favourites: ['myyear', 'reading', 'calendar'],
    })
    expect(await srv.changeFavourites(a.token, { add: [], remove: ['reading'] })).toEqual({
      kept: true,
      favourites: ['myyear', 'calendar'],
    })
    const r = await shelf(URL_!, a.token)
    expect(r.books).toEqual(BOOKS)
    expect(r.arrangement).toBe('title')
    expect(r.favourites).toEqual(['myyear', 'calendar'])
  })

  it('a shelf save (also from an app that knows nothing of favourites) keeps the favourites', async () => {
    const books = [...BOOKS, { id: 'c', title: 'C', status: 'want' }]
    const saved = await api(URL_!, `/api/collections/libraries/records/${recordId}`, {
      method: 'PATCH',
      token: a.token,
      body: { books, arrangement: 'author' },
    })
    expect(saved.status).toBe(200)
    expect(await srv.readFavourites(a.token)).toEqual({ kept: true, favourites: ['myyear', 'calendar'] })
    // and a favourites save after it keeps the new books
    await srv.changeFavourites(a.token, { add: ['badges'], remove: [] })
    const r = await shelf(URL_!, a.token)
    expect(r.books).toEqual(books)
    expect(r.arrangement).toBe('author')
    expect(r.favourites).toEqual(['myyear', 'calendar', 'badges'])
  })

  it("another person can't read or change them", async () => {
    // their own (no shelf) view: nothing, and nothing written
    expect(await srv.readFavourites(b.token)).toEqual({ kept: false })
    expect(await srv.changeFavourites(b.token, { add: [], remove: ['myyear', 'calendar', 'badges'] })).toEqual({
      kept: false,
    })
    // straight at the record: not found for them
    expect((await api(URL_!, `/api/collections/libraries/records/${recordId}`, { token: b.token })).status).toBe(404)
    const patch = await api(URL_!, `/api/collections/libraries/records/${recordId}`, {
      method: 'PATCH',
      token: b.token,
      body: { favourites: [] },
    })
    expect(patch.status).toBe(404)
    // the favourites route: signed out it refuses, and it only ever changes your own shelf
    const anon = await api(URL_!, '/api/collections/libraries/favourites', { method: 'POST', body: { add: ['myyear'] } })
    expect(anon.status).toBe(401)
    await api(URL_!, '/api/collections/libraries/records', {
      method: 'POST',
      token: b.token,
      body: { owner: b.id, books: [], arrangement: '' },
    })
    expect(await srv.changeFavourites(b.token, { add: ['again'], remove: ['myyear', 'calendar', 'badges'] })).toEqual({
      kept: true,
      favourites: ['again'],
    })
    expect(await srv.readFavourites(a.token)).toEqual({ kept: true, favourites: ['myyear', 'calendar', 'badges'] })
  })

  it('keeps every star when saves arrive at the same moment', async () => {
    const shelfBefore = await shelf(URL_!, a.token)
    const extra = ['again', 'badges', 'covers', 'pile', 'top', 'fact'] as const
    let lost = 0
    for (let round = 0; round < 20; round++) {
      await srv.changeFavourites(a.token, { add: [], remove: [...extra] })
      // started together, none awaited before the others: two devices, or quick taps
      await Promise.all(extra.map((id) => srv.changeFavourites(a.token, { add: [id], remove: [] })))
      const now = await srv.readFavourites(a.token)
      if (!now.kept || !extra.every((id) => now.favourites.includes(id))) lost++
    }
    expect(lost).toBe(0)
    // a star and an unstar of different blocks at once
    await Promise.all([
      srv.changeFavourites(a.token, { add: [], remove: ['again'] }),
      srv.changeFavourites(a.token, { add: ['wrapped'], remove: [] }),
    ])
    const after = await shelf(URL_!, a.token)
    expect(after.favourites).not.toContain('again')
    expect(after.favourites).toContain('wrapped')
    expect(after.books).toEqual(shelfBefore.books)
    expect(after.arrangement).toBe(shelfBefore.arrangement)
    await srv.changeFavourites(a.token, { add: [], remove: [...extra, 'wrapped'] })
    expect(await srv.readFavourites(a.token)).toEqual({ kept: true, favourites: ['myyear', 'calendar', 'badges'] })
  })

  it('cleans what is stored, also when something else wrote junk', async () => {
    await api(URL_!, `/api/collections/libraries/records/${recordId}`, {
      method: 'PATCH',
      token: a.token,
      body: { favourites: ['myyear', 'myyear', 'nonsense', 7] },
    })
    expect(await srv.readFavourites(a.token)).toEqual({ kept: true, favourites: ['myyear'] })
  })

  it('a real star still lands when the list is full of junk', async () => {
    const junk = Array.from({ length: 60 }, (_, i) => `junk${i}`)
    await api(URL_!, `/api/collections/libraries/records/${recordId}`, {
      method: 'PATCH',
      token: a.token,
      body: { favourites: [...junk, 7, null] },
    })
    expect(await srv.changeFavourites(a.token, { add: ['calendar'], remove: [] })).toEqual({
      kept: true,
      favourites: ['calendar'],
    })
    const stored = (await shelf(URL_!, a.token)).favourites as unknown[]
    expect(stored.length).toBe(50)
    expect(stored.at(-1)).toBe('calendar')
    expect(stored).not.toContain(7)
  })

  it('the server keeps block ids written in camelCase, for blocks added later', async () => {
    await api(URL_!, `/api/collections/libraries/records/${recordId}`, {
      method: 'PATCH',
      token: a.token,
      body: { favourites: ['myyear'] },
    })
    const r = await api(URL_!, '/api/collections/libraries/favourites', {
      method: 'POST',
      token: a.token,
      body: { add: ['finishBy', 'not an id', 'x'.repeat(41)] },
    })
    expect(r.status).toBe(200)
    expect(r.json.favourites).toEqual(['myyear', 'finishBy'])
  })
})

describe.skipIf(!OLD_URL)('favourites on a local PocketBase without the field (#182)', () => {
  it('reads nothing and writes nothing, so the app keeps them per device', async () => {
    process.env.POCKETBASE_URL = OLD_URL
    const srv = await import('./favouritesStore')
    const a = await user(OLD_URL!, 'fav-a@example.com')
    const made = await api(OLD_URL!, '/api/collections/libraries/records', {
      method: 'POST',
      token: a.token,
      body: { owner: a.id, books: BOOKS, arrangement: 'title' },
    })
    expect(made.status).toBe(200)
    const before = await shelf(OLD_URL!, a.token)
    expect(await srv.readFavourites(a.token)).toEqual({ kept: false })
    expect(await srv.changeFavourites(a.token, { add: ['myyear'], remove: [] })).toEqual({ kept: false })
    const after = await shelf(OLD_URL!, a.token)
    expect(after).toEqual(before) // not even `updated` moved
    expect(after.favourites).toBeUndefined()
    // the route is there (same hooks), but answers 404 without the field
    const direct = await api(OLD_URL!, '/api/collections/libraries/favourites', {
      method: 'POST',
      token: a.token,
      body: { add: ['myyear'] },
    })
    expect(direct.status).toBe(404)
  })
})
