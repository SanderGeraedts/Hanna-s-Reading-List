import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import type { ReadingStatus } from '#/lib/library'
import { asUser, pb, pocketbaseUrl, sessionToken, tokenUserId } from './pocketbase'
import { toLanguageCode } from '#/lib/languages'

/**
 * Storytel has no public API. This uses the same private endpoints as
 * Storytel's own apps (as documented by the open-source storytel-player
 * project), so it may break whenever Storytel changes them.
 *
 * Flow:
 *  1. GET  https://www.storytel.com/api/login.action  -> JWT
 *  2. POST https://api.storytel.net/libraries/bookshelf (empty body) -> whole shelf
 *
 * Credentials are never logged and never returned to the browser. After signing
 * in they are sealed (AES-GCM, key held by this app) and kept until "Sign out",
 * so the shelf can be refreshed later without signing in again: with the
 * signed-in account when there is an account server, otherwise in an httpOnly
 * cookie on that device. Accounts that sign in with Google/Apple/Facebook
 * have no Storytel password and cannot use this.
 */

const LOGIN_URL = 'https://www.storytel.com/api/login.action'
const BOOKSHELF_URL = 'https://api.storytel.net/libraries/bookshelf'
const APP_VERSION = '25.38.0'
const CLIENT_HEADERS = {
  'x-storytel-terminal': 'ios',
  'user-agent': `Storytel/${APP_VERSION} (iOS 26.0; iPhone16,2) Release/924.1`,
}

// The apps "encrypt" the password with a fixed, publicly known AES key before
// sending it. It is obfuscation, not security – the transport is HTTPS.
const PWD_KEY = 'VQZBJ6TD8M9WBUWT'
const PWD_IV = 'joiwef08u23j341a'

async function encryptPassword(password: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(PWD_KEY), 'AES-CBC', false, [
    'encrypt',
  ])
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: enc.encode(PWD_IV) },
    key,
    enc.encode(password),
  )
  return [...new Uint8Array(cipher)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export interface StorytelBook {
  storytelId: string
  title: string
  authors: string[]
  status: ReadingStatus
  /** 0..1, from the most recently updated listening/reading position */
  progress?: number
  /** when that position was last updated (ISO time), so the reading log has the right day (#76) */
  progressAt?: string
  /** portrait e-book cover, when the title exists as an e-book */
  ebookCover?: string
  /** square audiobook cover */
  abookCover?: string
  durationMs?: number
  characters?: number
  /** two-letter code, when Storytel says */
  language?: string
  /** Storytel's own categories, when it sends them */
  categories?: string[]
  /** the day it comes out, for a book that isn't out yet (#103) */
  releaseDate?: string
}

interface RawFormat {
  type?: string
  cover?: { url?: string }
  durationInMilliseconds?: number
  durationInCharacters?: number
  position?: { position?: number; updatedTime?: string }
  // not documented; read defensively (#103)
  releaseDate?: unknown
  isReleased?: unknown
}

interface RawModel {
  id?: string | number
  title?: string
  state?: string
  authors?: Array<{ name?: string }>
  formats?: RawFormat[]
  // not documented anywhere; read defensively in case the shelf includes them
  language?: unknown
  languages?: unknown
  category?: unknown
  categories?: unknown
  genres?: unknown
  releaseDate?: unknown
}

const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : v == null ? [] : [v])

function languageOf(m: RawModel) {
  for (const v of [...asList(m.language), ...asList(m.languages)]) {
    const o = v as Record<string, unknown> | null
    const code = toLanguageCode(typeof v === 'string' ? v : (o?.isoValue ?? o?.code ?? o?.iso ?? o?.languageCode))
    if (code) return code
  }
  return undefined
}

function categoriesOf(m: RawModel) {
  return [...asList(m.category), ...asList(m.categories), ...asList(m.genres)]
    .map((v) => {
      const o = v as Record<string, unknown> | null
      const name = typeof v === 'string' ? v : (o?.title ?? o?.name)
      return typeof name === 'string' ? name : undefined
    })
    .filter((n): n is string => !!n)
}

/**
 * The release day of a book Storytel lists before it is out (#103): the
 * earliest of its formats' release days, only when that is still to come.
 */
function releaseDateOf(m: RawModel, formats: RawFormat[]) {
  const days = [m.releaseDate, ...formats.map((f) => f.releaseDate)]
    .map((v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined))
    .filter((d): d is string => !!d)
    .sort()
  const today = new Date().toISOString().slice(0, 10)
  const unreleased = formats.length > 0 && formats.every((f) => f.isReleased === false)
  return days[0] && (days[0] > today || unreleased) ? days[0] : undefined
}

const STATE_TO_STATUS: Record<string, ReadingStatus> = {
  WILL_CONSUME: 'want',
  TO_READ: 'want',
  CONSUMING: 'reading',
  READING: 'reading',
  CONSUMED: 'read',
  FINISHED: 'read',
  COMPLETED: 'read',
}

function mapModel(m: RawModel): StorytelBook | null {
  if (m.id == null || !m.title) return null
  const formats = Array.isArray(m.formats) ? m.formats : []
  const ebook = formats.find((f) => f.type === 'ebook')
  const abook = formats.find((f) => f.type === 'abook')
  // progress: audiobook positions are in ms (like the duration), e-book positions
  // in characters; use whichever format was touched most recently
  const progressOf = (f?: RawFormat) => {
    const pos = f?.position?.position
    const total = f?.type === 'abook' ? f.durationInMilliseconds : f?.durationInCharacters
    return pos && total ? Math.min(1, Math.max(0, pos / total)) : undefined
  }
  const latest = [abook, ebook]
    .filter((f): f is RawFormat => !!f?.position?.position)
    .sort((a, b) => (b.position?.updatedTime ?? '').localeCompare(a.position?.updatedTime ?? ''))[0]
  const progress = progressOf(latest)

  let status = STATE_TO_STATUS[(m.state ?? '').toUpperCase()]
  if (!status) status = abook?.position?.position ? 'reading' : 'want'
  return {
    storytelId: String(m.id),
    title: m.title,
    authors: (m.authors ?? []).map((a) => a?.name).filter((n): n is string => !!n),
    status,
    progress,
    progressAt: (progress !== undefined && latest?.position?.updatedTime) || undefined,
    ebookCover: ebook?.cover?.url || undefined,
    abookCover: abook?.cover?.url || undefined,
    durationMs: abook?.durationInMilliseconds || undefined,
    characters: ebook?.durationInCharacters || undefined,
    language: languageOf(m),
    categories: categoriesOf(m),
    releaseDate: releaseDateOf(m, formats),
  }
}

interface Credentials {
  email: string
  password: string
}

function validCredentials(input: unknown): Credentials {
  const i = input as Partial<Credentials> | null
  const email = String(i?.email ?? '').trim()
  const password = String(i?.password ?? '').trim()
  if (!email || !password) throw new Error('Enter your Storytel email and password')
  if (email.length > 254 || password.length > 256) throw new Error('Invalid credentials')
  return { email, password }
}

export class LoginRejected extends Error {}

export async function fetchShelf({ email, password }: Credentials): Promise<StorytelBook[]> {
  // 1. sign in
  const loginUrl = new URL(LOGIN_URL)
  loginUrl.search = new URLSearchParams({
    m: '1',
    uid: email,
    pwd: await encryptPassword(password),
    version: APP_VERSION,
  }).toString()

  let jwt: string | undefined
  try {
    const res = await fetch(loginUrl, { headers: CLIENT_HEADERS, redirect: 'manual' })
    if (res.ok) {
      const body = (await res.json().catch(() => null)) as {
        accountInfo?: { jwt?: string }
      } | null
      jwt = body?.accountInfo?.jwt
    } else if (res.status >= 500) {
      throw new Error(`Storytel is unavailable right now (${res.status}). Try again later.`)
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Storytel')) throw e
    throw new Error('Could not reach Storytel. Check your connection and try again.')
  }
  if (!jwt) {
    throw new LoginRejected(
      'Storytel did not accept this email and password. If you sign in to Storytel with Google, Apple or Facebook, there is no password this app can use.',
    )
  }

  // 2. fetch the whole bookshelf (empty body = "send me everything")
  const shelfRes = await fetch(BOOKSHELF_URL, {
    method: 'POST',
    body: '',
    headers: {
      ...CLIENT_HEADERS,
      Authorization: `Bearer ${jwt}`,
      'content-type': 'application/x-www-form-urlencoded',
      // must be */* – the endpoint answers 406 to "application/json"
      Accept: '*/*',
    },
  })
  if (!shelfRes.ok) {
    throw new Error(`Signed in, but Storytel refused the bookshelf request (${shelfRes.status}).`)
  }
  const shelf = (await shelfRes.json().catch(() => null)) as {
    items?: Record<string, { model?: RawModel }>
  } | null
  const items = shelf?.items && typeof shelf.items === 'object' ? Object.values(shelf.items) : []
  return items
    .map((i) => (i?.model ? mapModel(i.model) : null))
    .filter((b): b is StorytelBook => !!b)
}

// ---------------------------------------------------------------------------
// Remembered login: the credentials sealed with AES-GCM under a server secret,
// in a cookie JavaScript cannot read. Only this app's server can open it.
// ---------------------------------------------------------------------------

const COOKIE = 'storytel_login'
const COOKIE_DAYS = 180

async function cookieKey() {
  let secret = process.env.STORYTEL_COOKIE_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Remembering the Storytel login is not set up on this server.')
    }
    secret = 'dev-only-storytel-cookie-secret'
  }
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function seal(c: Credentials) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = new TextEncoder().encode(JSON.stringify(c))
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cookieKey(), data))
  const out = new Uint8Array(iv.length + cipher.length)
  out.set(iv)
  out.set(cipher, iv.length)
  return b64url(out)
}

export async function unseal(token: string | undefined): Promise<Credentials | null> {
  if (!token) return null
  try {
    const raw = fromB64url(token)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: raw.slice(0, 12) },
      await cookieKey(),
      raw.slice(12),
    )
    return validCredentials(JSON.parse(new TextDecoder().decode(plain)))
  } catch {
    return null
  }
}

function rememberInCookie(sealed: string) {
  setCookie(COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_DAYS * 24 * 60 * 60,
  })
}

function forgetCookie() {
  deleteCookie(COOKIE, { path: '/' })
}

// With an account server, the sealed login is kept with the account instead,
// so it follows Hanna to every device. PocketBase only ever stores ciphertext:
// the key stays with this app (STORYTEL_COOKIE_SECRET).

interface LoginRecord {
  id: string
  sealed: string
  account: string
}

const accountToken = () => (pocketbaseUrl() ? sessionToken() : null)

async function findLoginRecord(token: string) {
  const list = await pb<{ items: LoginRecord[] }>(
    '/api/collections/storytel_logins/records?perPage=1&skipTotal=1',
    { token },
  )
  return list.items[0] ?? null
}

async function saveLoginRecord(token: string, sealed: string, account: string) {
  const body = { sealed, account }
  const existing = await findLoginRecord(token)
  if (existing) {
    await pb(`/api/collections/storytel_logins/records/${existing.id}`, { method: 'PATCH', token, body })
  } else {
    await pb('/api/collections/storytel_logins/records', {
      method: 'POST',
      token,
      body: { ...body, owner: tokenUserId(token) },
    })
  }
}

async function rememberLogin(c: Credentials) {
  const sealed = await seal(c)
  const token = accountToken()
  if (!token) return rememberInCookie(sealed)
  await asUser((t) => saveLoginRecord(t, sealed, maskEmail(c.email)))
  forgetCookie()
}

async function savedLogin(): Promise<Credentials | null> {
  const fromCookie = await unseal(getCookie(COOKIE))
  const token = accountToken()
  if (!token) return fromCookie
  return asUser(async (t) => {
    const record = await findLoginRecord(t)
    if (record) return unseal(record.sealed)
    // signed in on a device that still had a cookie from before accounts: move it over
    if (fromCookie) {
      await saveLoginRecord(t, await seal(fromCookie), maskEmail(fromCookie.email))
      forgetCookie()
    }
    return fromCookie
  })
}

async function forgetLogin() {
  forgetCookie()
  const token = accountToken()
  if (!token) return
  await asUser(async (t) => {
    const record = await findLoginRecord(t)
    if (record) await pb(`/api/collections/storytel_logins/records/${record.id}`, { method: 'DELETE', token: t })
  })
}

/** "h…a@gmail.com": enough to recognise the account, without showing the address. */
function maskEmail(email: string) {
  const [name, domain] = email.split('@')
  return `${name.slice(0, 1)}…${name.length > 1 ? name.slice(-1) : ''}@${domain ?? ''}`
}

export const importStorytelLibrary = createServerFn({ method: 'POST' })
  .validator((input: { email: string; password: string }) => validCredentials(input))
  .handler(async ({ data }): Promise<StorytelBook[]> => {
    const books = await fetchShelf(data)
    // stay signed in, so ↻ can refresh the shelf later (the import still
    // works if the server has no secret configured or can't save the login)
    await rememberLogin(data).catch(() => {})
    return books
  })

/** Fetches the shelf again with the login remembered on this device. */
export const refreshStorytelLibrary = createServerFn({ method: 'POST' }).handler(
  async (): Promise<StorytelBook[]> => {
    const credentials = await savedLogin()
    if (!credentials) {
      await forgetLogin()
      throw new Error('No saved Storytel login on this device. Sign in again under + Add → Storytel.')
    }
    try {
      return await fetchShelf(credentials)
    } catch (e) {
      // a changed password: drop the stale login so the form shows again
      if (e instanceof LoginRejected) {
        await forgetLogin()
        throw new Error('Storytel no longer accepts the saved login. Sign in again under + Add → Storytel.')
      }
      throw e
    }
  },
)

export const storytelLoginStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ saved: boolean; account?: string }> => {
    const credentials = await savedLogin()
    return credentials ? { saved: true, account: maskEmail(credentials.email) } : { saved: false }
  },
)

export const forgetStorytelLogin = createServerFn({ method: 'POST' }).handler(async () => {
  await forgetLogin()
  return { saved: false }
})
