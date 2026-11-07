import { useEffect, useState } from 'react'
import type { Book, NewBook } from '#/lib/library'
import { GOOGLE_CLIENT_ID, fetchGoogleLibrary, loadGoogleSignIn, requestGoogleToken } from '#/lib/googleLibrary'
import { importGoogleBooks } from '#/lib/googleImport'
import type { ImportSummary } from '#/lib/storytelImport'

type Phase =
  | { kind: 'idle' }
  | { kind: 'signing-in' }
  | { kind: 'reading' }
  | { kind: 'importing'; done: number; total: number }
  | { kind: 'done'; summary: ImportSummary; total: number }

/**
 * Import from Google Play Books (#67): her "To read", "Reading now" and "Have
 * read" shelves, plus the books she bought or uploaded there. Importing again
 * adds new books and moves statuses forward.
 */
export function GoogleTab({
  existing,
  onAdd,
  onUpdate,
}: {
  existing: Book[]
  onAdd: (b: NewBook) => void
  onUpdate: (id: string, patch: Partial<Book>) => void
}) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // load Google's sign-in ahead, so the click can open its pop-up straight away
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    loadGoogleSignIn()
      .then(() => setReady(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="tab-panel">
        <p className="muted">
          Importing from Google Play Books isn't set up on this site yet: it needs a Google sign-in key. Searching
          Google Books works from the Search tab.
        </p>
      </div>
    )
  }

  async function start() {
    setError(null)
    setPhase({ kind: 'signing-in' })
    try {
      // must be the first thing after the click, or the browser blocks Google's pop-up
      const token = await requestGoogleToken()
      setPhase({ kind: 'reading' })
      const items = await fetchGoogleLibrary(token)
      const summary = await importGoogleBooks(items, existing, {
        addBook: onAdd,
        updateBook: onUpdate,
        onProgress: (done, total) => setPhase({ kind: 'importing', done, total }),
      })
      setPhase({ kind: 'done', summary, total: items.length })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
      setPhase({ kind: 'idle' })
    }
  }

  if (phase.kind === 'done') {
    const { summary, total } = phase
    return (
      <div className="tab-panel">
        <p className="success">
          Found {total} book{total === 1 ? '' : 's'} in your Google Play Books library: {summary.added} added
          {summary.updated ? `, ${summary.updated} updated` : ''}
          {summary.unchanged ? `, ${summary.unchanged} already up to date` : ''}.
        </p>
        <button className="btn" onClick={() => setPhase({ kind: 'idle' })}>
          Done
        </button>
      </div>
    )
  }

  const busy = phase.kind !== 'idle'
  return (
    <div className="tab-panel">
      <p className="muted">
        Import the books in your Google Play Books library: <em>To read</em>, <em>Reading now</em> and{' '}
        <em>Have read</em>, plus the e-books you bought or uploaded. Importing again adds new books and moves statuses
        forward; it never moves a book back.
      </p>
      {error && <p className="error">{error}</p>}
      <button className="btn primary" disabled={busy || !ready} onClick={start}>
        {phase.kind === 'signing-in'
          ? 'Signing in with Google…'
          : phase.kind === 'reading'
            ? 'Reading your library…'
            : phase.kind === 'importing'
              ? `Adding books ${phase.done} / ${phase.total}…`
              : ready
                ? 'Sign in with Google and import'
                : 'Getting Google sign-in ready…'}
      </button>
      <p className="muted small-text">
        Google asks for permission to see and manage your Google Books library (it has no read-only option). The app
        only reads it, and the permission is only used for this import.
      </p>
    </div>
  )
}
