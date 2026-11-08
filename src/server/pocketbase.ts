import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { NOT_SIGNED_IN } from '#/lib/signedOut'

/**
 * Server-only helpers for the account server: a PocketBase instance on the
 * home NAS, reached through Tailscale Funnel (see deploy/nas/README.md).
 *
 * The browser never talks to PocketBase. It holds an httpOnly session cookie
 * with the PocketBase auth token; this app's server functions forward it.
 * Without POCKETBASE_URL the app runs as before: one shelf per browser.
 */

const PROD = process.env.NODE_ENV === 'production'
/** `__Host-` cookies must be secure, host-only and on path / */
const SESSION_COOKIE = PROD ? '__Host-session' : 'session'
const SESSION_DAYS = 30 // matches the token lifetime set in the PocketBase migration

export { NOT_SIGNED_IN }

export function pocketbaseUrl() {
  const url = process.env.POCKETBASE_URL?.trim()
  return url ? url.replace(/\/+$/, '') : null
}

/** The server could not be reached (NAS off, home internet down, Funnel off). */
export class Unreachable extends Error {
  constructor() {
    super("The reading-list server can't be reached right now.")
  }
}

export class PocketBaseError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export async function pb<T>(
  path: string,
  {
    method = 'GET',
    token,
    body,
    headers,
  }: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const base = pocketbaseUrl()
  if (!base) throw new Error('No account server is set up.')
  let res: Response
  try {
    res = await fetch(base + path, {
      method,
      headers: {
        ...(body !== undefined && { 'content-type': 'application/json' }),
        ...(token && { authorization: token }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    throw new Unreachable()
  }
  // Tailscale answers 502 when PocketBase itself is down
  if (res.status === 502 || res.status === 503 || res.status === 504) throw new Unreachable()
  const json = (await res.json().catch(() => null)) as { message?: string } | null
  if (!res.ok) throw new PocketBaseError(res.status, json?.message || `Request failed (${res.status})`)
  return json as T
}

export function sessionToken() {
  return getCookie(SESSION_COOKIE) || null
}

export function setSession(token: string) {
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export function clearSession() {
  deleteCookie(SESSION_COOKIE, { path: '/', secure: PROD })
}

/** The user id inside a PocketBase token. Only read, never trusted: PocketBase checks the token itself. */
export function tokenUserId(token: string): string | null {
  try {
    const part = token.split('.')[1] ?? ''
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json.id === 'string' ? json.id : null
  } catch {
    return null
  }
}

/**
 * Runs a PocketBase call as the signed-in user. A rejected token clears the
 * cookie and becomes NOT_SIGNED_IN, so the page shows the sign-in form.
 */
export async function asUser<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const token = sessionToken()
  if (!token) throw new Error(NOT_SIGNED_IN)
  try {
    return await fn(token)
  } catch (e) {
    if (e instanceof PocketBaseError && e.status === 401) {
      clearSession()
      throw new Error(NOT_SIGNED_IN)
    }
    throw e
  }
}
