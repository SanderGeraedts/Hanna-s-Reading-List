import { useState } from 'react'
import type { FormEvent } from 'react'

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>
  /** shown instead of the form when the server can't be reached */
  problem?: string
  onRetry?: () => void
}

export function SignIn({ onSignIn, problem, onRetry }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSignIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing in failed.')
      setBusy(false)
    }
  }

  return (
    <div className="signin">
      <div className="signin-card">
        <h1>Hanna's Reading List</h1>
        {problem ? (
          <>
            <p className="error">{problem}</p>
            <button className="btn primary" onClick={onRetry}>
              Try again
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="muted">Sign in to open your shelf.</p>
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                autoComplete="username"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
