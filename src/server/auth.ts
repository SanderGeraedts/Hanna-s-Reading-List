import { createServerFn } from '@tanstack/react-start'
import {
  PocketBaseError,
  Unreachable,
  clearSession,
  pb,
  pocketbaseUrl,
  sessionToken,
  setSession,
} from './pocketbase'

export interface Account {
  id: string
  email: string
  name?: string
}

export interface Session {
  /** false: no account server configured, the shelf lives in this browser only */
  enabled: boolean
  account: Account | null
  /** signed in, but the server can't be reached: work from this device's copy */
  offline?: boolean
}

interface AuthResponse {
  token: string
  record: { id: string; email: string; name?: string }
}

const toAccount = (r: AuthResponse['record']): Account => ({
  id: r.id,
  email: r.email,
  ...(r.name && { name: r.name }),
})

/** Who is signed in. Renews the token on every visit, so regular use never logs out. */
export const getSession = createServerFn({ method: 'GET' }).handler(async (): Promise<Session> => {
  if (!pocketbaseUrl()) return { enabled: false, account: null }
  const token = sessionToken()
  if (!token) return { enabled: true, account: null }
  try {
    const r = await pb<AuthResponse>('/api/collections/users/auth-refresh', { method: 'POST', token })
    setSession(r.token)
    return { enabled: true, account: toAccount(r.record) }
  } catch (e) {
    // the browser knows who it was and keeps a copy of the shelf
    if (e instanceof Unreachable) return { enabled: true, account: null, offline: true }
    if (e instanceof PocketBaseError && e.status < 500) {
      clearSession()
      return { enabled: true, account: null }
    }
    throw e
  }
})

export const signIn = createServerFn({ method: 'POST' })
  .validator((input: { email: string; password: string }) => {
    const email = typeof input?.email === 'string' ? input.email.trim() : ''
    const password = typeof input?.password === 'string' ? input.password : ''
    if (!email || !password || email.length > 200 || password.length > 200) {
      throw new Error('Enter your email and password.')
    }
    return { email, password }
  })
  .handler(async ({ data }): Promise<Account> => {
    try {
      const r = await pb<AuthResponse>('/api/collections/users/auth-with-password', {
        method: 'POST',
        body: { identity: data.email, password: data.password },
      })
      setSession(r.token)
      return toAccount(r.record)
    } catch (e) {
      if (e instanceof PocketBaseError) {
        if (e.status === 429) throw new Error('Too many attempts. Wait a minute and try again.')
        if (e.status === 400) throw new Error("That email and password don't match.")
      }
      throw e
    }
  })

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  clearSession()
  return { ok: true }
})
