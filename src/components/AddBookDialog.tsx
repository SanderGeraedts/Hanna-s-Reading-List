import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { getWorkDetails, lookupIsbn, searchBooks } from '#/server/openLibrary'
import type { SearchResult } from '#/server/openLibrary'
import type { Book, NewBook } from '#/lib/library'
import { analyzeCover, colorFromString, coverUrlForId, coverUrlForIsbn } from '#/lib/cover'
import { forgetStorytelLogin, importStorytelLibrary, storytelLoginStatus } from '#/server/storytel'
import type { StorytelLogin } from '#/lib/useStorytelSync'
import { importStorytelBooks } from '#/lib/storytelImport'
import type { ImportSummary } from '#/lib/storytelImport'

export type Tab = 'search' | 'isbn' | 'manual' | 'storytel'

interface Props {
  existing: Book[]
  onAdd: (book: NewBook) => void
  onUpdate: (id: string, patch: Partial<Book>) => void
  onClose: () => void
  /** the Storytel login remembered on this device, if any */
  storytelLogin: StorytelLogin
  onStorytelLogin: (login: StorytelLogin) => void
  initialTab?: Tab
}

/** Turns an Open Library result into a book, sampling the cover for spine colour + shape. */
async function buildBook(r: SearchResult, description?: string): Promise<NewBook> {
  const coverUrl = r.coverId
    ? coverUrlForId(r.coverId)
    : r.isbn
      ? coverUrlForIsbn(r.isbn)
      : undefined
  const analysis = coverUrl ? await analyzeCover(coverUrl) : null
  return {
    title: r.title,
    authors: r.authors,
    year: r.year,
    pages: r.pages,
    isbn: r.isbn,
    workKey: r.workKey || undefined,
    description,
    coverUrl: analysis ? coverUrl : undefined,
    coverAspect: analysis?.aspect,
    color: analysis?.color ?? colorFromString(r.title),
  }
}

export function AddBookDialog({
  existing,
  onAdd,
  onUpdate,
  onClose,
  storytelLogin,
  onStorytelLogin,
  initialTab = 'search',
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    d.showModal()
    // showModal() focuses the first focusable element (the close button); move focus to the input
    d.querySelector<HTMLInputElement>('.tab-panel input')?.focus()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) dialog.current?.close()
      }}
    >
      <div className="dialog-body">
        <header className="dialog-header">
          <h2>Add a book</h2>
          <button className="icon-btn" onClick={() => dialog.current?.close()} aria-label="Close">
            ×
          </button>
        </header>
        <div className="tabs" role="tablist">
          {(
            [
              ['search', 'Search'],
              ['isbn', 'ISBN'],
              ['manual', 'Manual'],
              ['storytel', 'Storytel'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? 'tab active' : 'tab'}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'search' && <SearchTab existing={existing} onAdd={onAdd} />}
        {tab === 'isbn' && <IsbnTab onAdd={onAdd} />}
        {tab === 'manual' && <ManualTab onAdd={onAdd} />}
        {tab === 'storytel' && (
          <StorytelTab
            existing={existing}
            onAdd={onAdd}
            onUpdate={onUpdate}
            login={storytelLogin}
            onLogin={onStorytelLogin}
          />
        )}
        <p className="attribution">
          Book data and covers from{' '}
          <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
            Open Library
          </a>
          . Spines and back covers are generated from the book's details.
        </p>
      </div>
    </dialog>
  )
}

function SearchTab({ existing, onAdd }: { existing: Book[]; onAdd: (b: NewBook) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await searchBooks({ data: { query: q } })
        if (!cancelled) setResults(res)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Search failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  const onShelf = new Set(existing.map((b) => b.workKey).filter(Boolean))

  async function add(r: SearchResult) {
    setAdding(r.workKey)
    try {
      const details = await getWorkDetails({ data: { workKey: r.workKey } }).catch(() => ({
        description: undefined,
      }))
      onAdd(await buildBook(r, details.description))
      setAdded((s) => new Set(s).add(r.workKey))
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="tab-panel">
      <input
        className="input"
        type="search"
        autoFocus
        placeholder="Title, author or both…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <p className="muted">Searching Open Library…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && query.trim().length >= 2 && results.length === 0 && !error && (
        <p className="muted">No books found.</p>
      )}
      <ul className="results">
        {results.map((r) => {
          const isAdded = added.has(r.workKey) || onShelf.has(r.workKey)
          return (
            <li key={r.workKey} className="result">
              <div className="thumb">
                {r.coverId ? (
                  <img src={coverUrlForId(r.coverId, 'M')} alt="" loading="lazy" />
                ) : (
                  <span>No cover</span>
                )}
              </div>
              <div className="result-text">
                <strong>{r.title}</strong>
                <span>{r.authors.join(', ') || 'Unknown author'}</span>
                <span className="muted">
                  {[r.year, r.pages && `${r.pages} pages`].filter(Boolean).join(' · ')}
                </span>
              </div>
              <button
                className="btn small"
                disabled={isAdded || adding === r.workKey}
                onClick={() => add(r)}
              >
                {isAdded ? 'On shelf' : adding === r.workKey ? 'Adding…' : 'Add'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function IsbnTab({ onAdd }: { onAdd: (b: NewBook) => void }) {
  const [isbn, setIsbn] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError(null)
    try {
      const found = await lookupIsbn({ data: { isbn } })
      if (!found) {
        setError('Open Library does not know this ISBN. Try the manual tab.')
        setStatus('idle')
        return
      }
      onAdd(await buildBook(found, found.description))
      setStatus('done')
      setIsbn('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
      setStatus('idle')
    }
  }

  return (
    <form className="tab-panel" onSubmit={submit}>
      <label className="field">
        <span>ISBN-10 or ISBN-13</span>
        <input
          className="input"
          autoFocus
          inputMode="numeric"
          placeholder="9780141439518"
          value={isbn}
          onChange={(e) => {
            setIsbn(e.target.value)
            setStatus('idle')
          }}
        />
      </label>
      {error && <p className="error">{error}</p>}
      {status === 'done' && <p className="success">Added to the shelf.</p>}
      <button className="btn" disabled={status === 'loading' || isbn.trim().length < 10}>
        {status === 'loading' ? 'Looking up…' : 'Look up & add'}
      </button>
    </form>
  )
}

function ManualTab({ onAdd }: { onAdd: (b: NewBook) => void }) {
  const [form, setForm] = useState({ title: '', author: '', year: '', pages: '', description: '' })
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setDone(false)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return
    onAdd({
      title,
      authors: form.author
        .split(/,|&/)
        .map((a) => a.trim())
        .filter(Boolean),
      year: Number(form.year) || undefined,
      pages: Number(form.pages) || undefined,
      description: form.description.trim() || undefined,
      color: colorFromString(title),
    })
    setForm({ title: '', author: '', year: '', pages: '', description: '' })
    setDone(true)
  }

  return (
    <form className="tab-panel" onSubmit={submit}>
      <label className="field">
        <span>Title *</span>
        <input className="input" autoFocus required value={form.title} onChange={set('title')} />
      </label>
      <label className="field">
        <span>Author(s)</span>
        <input className="input" placeholder="Separate with commas" value={form.author} onChange={set('author')} />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Year</span>
          <input className="input" inputMode="numeric" value={form.year} onChange={set('year')} />
        </label>
        <label className="field">
          <span>Pages</span>
          <input className="input" inputMode="numeric" value={form.pages} onChange={set('pages')} />
        </label>
      </div>
      <label className="field">
        <span>Blurb (shown on the back cover)</span>
        <textarea className="input" rows={3} value={form.description} onChange={set('description')} />
      </label>
      {done && <p className="success">Added to the shelf.</p>}
      <button className="btn" disabled={!form.title.trim()}>
        Add book
      </button>
    </form>
  )
}

type StorytelPhase =
  | { kind: 'form' }
  | { kind: 'signing-in' }
  | { kind: 'importing'; done: number; total: number }
  | { kind: 'done'; summary: ImportSummary; total: number }

function StorytelTab({
  existing,
  onAdd,
  onUpdate,
  login,
  onLogin,
}: {
  existing: Book[]
  onAdd: (b: NewBook) => void
  onUpdate: (id: string, patch: Partial<Book>) => void
  login: StorytelLogin
  onLogin: (login: StorytelLogin) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phase, setPhase] = useState<StorytelPhase>({ kind: 'form' })
  const [error, setError] = useState<string | null>(null)
  const busy = phase.kind === 'signing-in' || phase.kind === 'importing'

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPhase({ kind: 'signing-in' })
    try {
      const items = await importStorytelLibrary({ data: { email, password } })
      // the server keeps the login (sealed in a cookie); the page doesn't need it
      setPassword('')
      onLogin(await storytelLoginStatus().catch(() => ({ saved: false })))
      const summary = await importStorytelBooks(items, existing, {
        addBook: onAdd,
        updateBook: onUpdate,
        onProgress: (done, total) => setPhase({ kind: 'importing', done, total }),
      })
      setPhase({ kind: 'done', summary, total: items.length })
    } catch (err) {
      setPassword('')
      setError(err instanceof Error ? err.message : 'Import failed')
      setPhase({ kind: 'form' })
    }
  }

  if (phase.kind === 'done') {
    const { summary, total } = phase
    return (
      <div className="tab-panel">
        <p className="success">
          Found {total} book{total === 1 ? '' : 's'} on your Storytel shelf: {summary.added} added
          {summary.updated ? `, ${summary.updated} updated` : ''}
          {summary.unchanged ? `, ${summary.unchanged} already up to date` : ''}.
        </p>
        <button className="btn" onClick={() => setPhase({ kind: 'form' })}>
          Done
        </button>
      </div>
    )
  }

  if (login.saved && phase.kind === 'form') {
    return (
      <div className="tab-panel">
        <p className="muted">
          Signed in to Storytel as <strong>{login.account}</strong>. Use the ↻ button in the top
          bar to add new books and bring statuses and progress up to date.
        </p>
        <button
          className="btn"
          onClick={async () => onLogin(await forgetStorytelLogin().catch(() => login))}
        >
          Sign out of Storytel
        </button>
      </div>
    )
  }

  return (
    <form className="tab-panel" onSubmit={submit}>
      <p className="muted">
        Import the books on your Storytel bookshelf. Statuses carry over: <em>want to read</em>,{' '}
        <em>reading</em> and <em>finished</em>. Importing again adds new books and updates statuses.
      </p>
      <label className="field">
        <span>Storytel email</span>
        <input
          className="input"
          type="email"
          autoComplete="username"
          required
          disabled={busy}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Storytel password</span>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          required
          disabled={busy}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="error">{error}</p>}
      {phase.kind === 'importing' && (
        <div className="progress" aria-live="polite">
          <progress max={Math.max(1, phase.total)} value={phase.done} />
          <span className="muted">
            Adding books {phase.done} / {phase.total} (fetching covers and details)
          </span>
        </div>
      )}
      <button className="btn primary" disabled={busy || !email || !password}>
        {phase.kind === 'signing-in'
          ? 'Signing in…'
          : phase.kind === 'importing'
            ? 'Importing…'
            : 'Sign in & import'}
      </button>
      <p className="attribution">
        Your password goes to this app&apos;s server to sign in to Storytel. To keep you signed in,
        it is kept encrypted in a cookie on this device that only the server can read, until you
        sign out here. Storytel has no public API, so this uses the same
        private endpoints as its apps and may stop working if Storytel changes them. Accounts that
        sign in with Google, Apple or Facebook have no password to use here.
      </p>
    </form>
  )
}
