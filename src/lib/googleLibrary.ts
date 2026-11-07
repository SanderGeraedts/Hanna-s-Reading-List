import type { ReadingStatus } from './library'
import { fromVolume } from './googleVolume'
import type { GoogleVolume, RawVolume } from './googleVolume'

/**
 * Hanna's Google Play Books library (#67). She signs in with Google in its own
 * pop-up (Google Identity Services), which gives this page a short-lived token
 * that may only read and manage her Google Books library. The token stays in
 * the page for the import and is never sent to our servers.
 *
 * Needs VITE_GOOGLE_CLIENT_ID: the OAuth client id of a Google Cloud project
 * with the Books API on and this site's address as an authorised origin.
 */

export const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined
const SCOPE = 'https://www.googleapis.com/auth/books'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const API = 'https://www.googleapis.com/books/v1/mylibrary/bookshelves'

/** Google's standard shelves: https://developers.google.com/books/docs/v1/using#ids */
export const SHELVES = {
  purchased: 1,
  toRead: 2,
  readingNow: 3,
  haveRead: 4,
  myEbooks: 7,
} as const

export interface GoogleBook extends GoogleVolume {
  status: ReadingStatus
  /** bought on Google Play or uploaded: she has it as an e-book */
  owned: boolean
}

// ---- sign-in --------------------------------------------------------------------

interface TokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}
interface TokenClient {
  callback: (r: TokenResponse) => void
  error_callback?: (e: { type?: string; message?: string }) => void
  requestAccessToken: (o?: { prompt?: string }) => void
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: { initTokenClient: (c: Record<string, unknown>) => TokenClient } } }
  }
}

let gis: Promise<void> | null = null

/** Loads Google's sign-in script; call ahead of time so the click can open the pop-up straight away. */
export function loadGoogleSignIn(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  gis ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gis = null
      reject(new Error("Google's sign-in couldn't be loaded. Check the connection and try again."))
    }
    document.head.appendChild(s)
  })
  return gis
}

/**
 * Opens Google's sign-in and resolves to an access token. Call it straight from
 * a click, after loadGoogleSignIn() has finished, or the browser blocks the pop-up.
 */
export function requestGoogleToken(): Promise<string> {
  const oauth2 = window.google?.accounts?.oauth2
  if (!GOOGLE_CLIENT_ID) return Promise.reject(new Error('Google Books is not set up on this site yet.'))
  if (!oauth2) return Promise.reject(new Error("Google's sign-in isn't ready yet. Try again in a moment."))
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (r: TokenResponse) => {
        if (r.access_token) resolve(r.access_token)
        else reject(new Error(r.error_description || r.error || 'Google sign-in failed.'))
      },
      error_callback: (e: { type?: string; message?: string }) =>
        reject(new Error(e.type === 'popup_closed' ? 'The Google sign-in was closed.' : e.message || 'Google sign-in failed.')),
    })
    client.requestAccessToken({ prompt: '' })
  })
}

// ---- the library -------------------------------------------------------------------

async function get<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
  if (res.status === 401) throw new Error('The Google sign-in has run out. Please import again.')
  if (!res.ok) throw new Error(`Google Books refused the request (${res.status}).`)
  return (await res.json()) as T
}

async function shelfVolumes(shelf: number, token: string): Promise<RawVolume[]> {
  const out: RawVolume[] = []
  for (let start = 0; start < 5000; start += 40) {
    const page = await get<{ items?: RawVolume[]; totalItems?: number }>(
      `${API}/${shelf}/volumes?maxResults=40&startIndex=${start}`,
      token,
    )
    out.push(...(page.items ?? []))
    if (!page.items?.length || out.length >= (page.totalItems ?? 0)) break
  }
  return out
}

const RANK: Record<ReadingStatus, number> = { want: 0, paused: 1, reading: 2, read: 3 }

/** Her books from the shelves that say something: to read, reading now, have read, and the ones she owns. */
export function combineShelves(shelves: Array<{ shelf: number; volumes: RawVolume[] }>): GoogleBook[] {
  const byId = new Map<string, GoogleBook>()
  for (const { shelf, volumes } of shelves) {
    const status: ReadingStatus =
      shelf === SHELVES.haveRead ? 'read' : shelf === SHELVES.readingNow ? 'reading' : 'want'
    const owned = shelf === SHELVES.purchased || shelf === SHELVES.myEbooks
    for (const raw of volumes) {
      const v = fromVolume(raw)
      if (!v) continue
      const known = byId.get(v.googleId)
      byId.set(v.googleId, {
        ...(known ?? v),
        status: known && RANK[known.status] > RANK[status] ? known.status : status,
        owned: (known?.owned ?? false) || owned,
      })
    }
  }
  return [...byId.values()]
}

export async function fetchGoogleLibrary(token: string): Promise<GoogleBook[]> {
  const ids = Object.values(SHELVES)
  const shelves = await Promise.all(ids.map(async (shelf) => ({ shelf, volumes: await shelfVolumes(shelf, token) })))
  return combineShelves(shelves)
}
