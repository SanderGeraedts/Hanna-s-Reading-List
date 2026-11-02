import { createServerFn } from '@tanstack/react-start'
import type { ReadingStatus } from '#/lib/library'

/**
 * Storytel has no public API. This uses the same private endpoints as
 * Storytel's own apps (as documented by the open-source storytel-player
 * project), so it may break whenever Storytel changes them.
 *
 * Flow:
 *  1. GET  https://www.storytel.com/api/login.action  -> JWT
 *  2. POST https://api.storytel.net/libraries/bookshelf (empty body) -> whole shelf
 *
 * Credentials are used for this one request only: never stored, never logged,
 * never returned to the browser. Accounts that sign in with Google/Apple/Facebook
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
  /** portrait e-book cover, when the title exists as an e-book */
  ebookCover?: string
  /** square audiobook cover */
  abookCover?: string
  durationMs?: number
  characters?: number
}

interface RawFormat {
  type?: string
  cover?: { url?: string }
  durationInMilliseconds?: number
  durationInCharacters?: number
  position?: { position?: number; updatedTime?: string }
}

interface RawModel {
  id?: string | number
  title?: string
  state?: string
  authors?: Array<{ name?: string }>
  formats?: RawFormat[]
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
    ebookCover: ebook?.cover?.url || undefined,
    abookCover: abook?.cover?.url || undefined,
    durationMs: abook?.durationInMilliseconds || undefined,
    characters: ebook?.durationInCharacters || undefined,
  }
}

export const importStorytelLibrary = createServerFn({ method: 'POST' })
  .validator((input: { email: string; password: string }) => {
    const email = String(input?.email ?? '').trim()
    const password = String(input?.password ?? '').trim()
    if (!email || !password) throw new Error('Enter your Storytel email and password')
    if (email.length > 254 || password.length > 256) throw new Error('Invalid credentials')
    return { email, password }
  })
  .handler(async ({ data }): Promise<StorytelBook[]> => {
    // 1. sign in
    const loginUrl = new URL(LOGIN_URL)
    loginUrl.search = new URLSearchParams({
      m: '1',
      uid: data.email,
      pwd: await encryptPassword(data.password),
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
      throw new Error(
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
        Accept: 'application/json',
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
  })
