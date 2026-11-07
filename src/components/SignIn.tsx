import { useState } from 'react'
import type { FormEvent } from 'react'

interface Props {
  onSignIn: (email: string, password: string) => Promise<void>
  /** create an account; only addresses on the server's allowlist can */
  onSignUp: (name: string, email: string, password: string) => Promise<void>
  /** shown instead of the form when the server can't be reached */
  problem?: string
  onRetry?: () => void
}

export function SignIn({ onSignIn, onSignUp, problem, onRetry }: Props) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signingUp = mode === 'sign-up'

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (signingUp) await onSignUp(name, email, password)
      else await onSignIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : signingUp ? 'Creating the account failed.' : 'Signing in failed.')
      setBusy(false)
    }
  }

  function switchMode() {
    setMode(signingUp ? 'sign-in' : 'sign-up')
    setError(null)
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
            <p className="muted">{signingUp ? 'Create your account.' : 'Sign in to open your shelf.'}</p>
            {signingUp && (
              <label className="field">
                <span>Name</span>
                <input
                  className="input"
                  autoComplete="given-name"
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                autoComplete={signingUp ? 'email' : 'username'}
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
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                minLength={signingUp ? 8 : undefined}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {signingUp && <small className="muted">At least 8 characters.</small>}
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? (signingUp ? 'Creating…' : 'Signing in…') : signingUp ? 'Create account' : 'Sign in'}
            </button>
            <button type="button" className="link-btn" onClick={switchMode}>
              {signingUp ? 'I already have an account' : 'New here? Create an account'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
