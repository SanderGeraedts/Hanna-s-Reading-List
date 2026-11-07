import { useCallback, useEffect, useState } from 'react'
import { getSession, signIn as signInFn, signOut as signOutFn, signUp as signUpFn } from '#/server/auth'
import type { Account } from '#/server/auth'

export type { Account }

export type SessionState =
  | { kind: 'loading' }
  /** no account server: one shelf per browser, as before */
  | { kind: 'local' }
  | { kind: 'signed-out' }
  | { kind: 'signed-in'; account: Account; offline: boolean }
  | { kind: 'error'; message: string }

// who was signed in last on this device, for when the server can't be reached
const LAST_ACCOUNT_KEY = 'hannas-reading-list:account'

function lastAccount(): Account | null {
  try {
    const a = JSON.parse(localStorage.getItem(LAST_ACCOUNT_KEY) ?? 'null')
    return a && typeof a.id === 'string' && typeof a.email === 'string' ? a : null
  } catch {
    return null
  }
}

function rememberAccount(a: Account | null) {
  try {
    if (a) localStorage.setItem(LAST_ACCOUNT_KEY, JSON.stringify(a))
    else localStorage.removeItem(LAST_ACCOUNT_KEY)
  } catch {
    /* ignore */
  }
}

export function useSession() {
  const [state, setState] = useState<SessionState>({ kind: 'loading' })

  const check = useCallback(async () => {
    try {
      const s = await getSession()
      if (!s.enabled) return setState({ kind: 'local' })
      if (s.account) {
        rememberAccount(s.account)
        return setState({ kind: 'signed-in', account: s.account, offline: false })
      }
      const last = s.offline ? lastAccount() : null
      if (last) return setState({ kind: 'signed-in', account: last, offline: true })
      if (s.offline) {
        return setState({ kind: 'error', message: "The reading-list server can't be reached right now." })
      }
      rememberAccount(null)
      setState({ kind: 'signed-out' })
    } catch {
      // this app's own server is unreachable (no network at all)
      const last = lastAccount()
      setState(
        last
          ? { kind: 'signed-in', account: last, offline: true }
          : { kind: 'error', message: 'No connection. Try again in a moment.' },
      )
    }
  }, [])

  useEffect(() => {
    check()
  }, [check])

  const signIn = useCallback(async (email: string, password: string) => {
    const account = await signInFn({ data: { email, password } })
    rememberAccount(account)
    setState({ kind: 'signed-in', account, offline: false })
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const account = await signUpFn({ data: { name, email, password } })
    rememberAccount(account)
    setState({ kind: 'signed-in', account, offline: false })
  }, [])

  const signOut = useCallback(async () => {
    await signOutFn()
    rememberAccount(null)
    setState({ kind: 'signed-out' })
  }, [])

  /** the server said the session ended (e.g. the password was changed) */
  const expired = useCallback(() => {
    rememberAccount(null)
    setState({ kind: 'signed-out' })
  }, [])

  return { state, signIn, signUp, signOut, expired, retry: check }
}
