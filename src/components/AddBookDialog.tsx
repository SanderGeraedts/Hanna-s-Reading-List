import { guessLanguage } from '#/lib/languages'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { getWorkDetails, lookupIsbn, searchBooks } from '#/server/openLibrary'
import type { SearchResult } from '#/server/openLibrary'
import type { Book, NewBook } from '#/lib/library'
import { colorFromString, coverUrlForId } from '#/lib/cover'
import { buildBook, bookWithCover } from '#/lib/buildBook'
import type { PickedCover } from '#/lib/buildBook'
import { forgetStorytelLogin, importStorytelLibrary, storytelLoginStatus } from '#/server/storytel'
import type { StorytelLogin } from '#/lib/useStorytelSync'
import { importStorytelBooks } from '#/lib/storytelImport'
import type { ImportSummary } from '#/lib/storytelImport'
import { normalizeIsbn, parsePublished, publishedYear } from '#/lib/bookFacts'
import { seriesGuesses } from '#/lib/seriesGuess'
import { cleanBuyLink, shelfBooks } from '#/lib/wishlist'
import { parsePrice } from '#/lib/price'
import { BatchScan } from './BatchScan'
import { CoverStep } from './CoverStep'
import { AddFollowUp, WishFollowUp } from './AddFollowUp'
import type { FollowUpHandle } from './AddFollowUp'
import { PriceInput } from './PriceField'

export type Tab = 'search' | 'scan' | 'isbn' | 'manual' | 'storytel' | 'wish'

/** The tabs that ask "Part of a series?" after adding (T-0070); a batch and an import don't. */
const ASKS_SERIES: Tab[] = ['search', 'isbn', 'manual']

export { buildBook }

interface Props {
  existing: Book[]
  /** adds the book and gives it back with its id, so the follow-up can patch it */
  onAdd: (book: NewBook) => Book
  onUpdate: (id: string, patch: Partial<Book>) => void
  onClose: () => void
  /** the Storytel login remembered on this device, if any */
  storytelLogin: StorytelLogin
  onStorytelLogin: (login: StorytelLogin) => void
  initialTab?: Tab
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
  /** an ISBN Open Library didn't know, carried over to the manual tab */
  const [manualIsbn, setManualIsbn] = useState<string | undefined>()
  /** the book just added, while the follow-up asks how she has it (T-0016) */
  const [followUp, setFollowUp] = useState<{ book: Book; from: Tab } | null>(null)
  /** her shelf without the wishlist, for the series guess (D-0053) */
  const shelf = useMemo(() => shelfBooks(existing), [existing])
  const followUpHandle = useRef<FollowUpHandle>(null)
  const tabsArea = useRef<HTMLDivElement>(null)
  /** after the follow-up, focus goes back into the tab she was on */
  const refocus = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    d.showModal()
    // showModal() focuses the first focusable element (the close button); move focus to the input
    d.querySelector<HTMLInputElement>('.tab-panel input')?.focus()
  }, [])

  useEffect(() => {
    if (followUp || !refocus.current) return
    refocus.current = false
    const area = tabsArea.current
    ;(area?.querySelector<HTMLElement>('.tab-panel input') ?? area?.querySelector<HTMLElement>('.tab.active'))?.focus()
  }, [followUp])

  /** Adds a book from Search, Scan, ISBN or Manual, then asks how she has it. */
  const addFrom = (from: Tab) => (b: NewBook) => {
    const book = onAdd(b)
    setFollowUp({ book, from })
  }
  // the follow-up reads the book as it is now, with the formats and price she just gave
  const followUpBook = followUp && (existing.find((b) => b.id === followUp.book.id) ?? followUp.book)

  return (
    <dialog
      ref={dialog}
      className="dialog"
      onClose={() => {
        // closing early keeps what was valid in the follow-up
        followUpHandle.current?.flush()
        onClose()
      }}
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
        {followUp &&
          followUpBook &&
          (followUp.from === 'wish' ? (
            <WishFollowUp
              key={followUp.book.id}
              book={followUpBook}
              onUpdate={onUpdate}
              handle={followUpHandle}
              onDone={() => {
                refocus.current = true
                setFollowUp(null)
              }}
            />
          ) : (
            <AddFollowUp
              key={followUp.book.id}
              book={followUpBook}
              from={followUp.from}
              onUpdate={onUpdate}
              handle={followUpHandle}
              askSeries={
                ASKS_SERIES.includes(followUp.from) && !followUpBook.series?.trim() && !followUpBook.seriesAsked
              }
              seriesGuesses={seriesGuesses(followUpBook, shelf.filter((b) => b.id !== followUpBook.id))}
              onDone={() => {
                refocus.current = true
                setFollowUp(null)
              }}
            />
          ))}
        {/* the tabs stay as she left them (her search, the scanner) while the follow-up shows */}
        <div className="add-tabs" ref={tabsArea} hidden={!!followUp}>
        <div className="tabs" role="tablist">
          {(
            [
              ['search', 'Search'],
              ['scan', 'Scan'],
              ['isbn', 'ISBN'],
              ['manual', 'Manual'],
              ['storytel', 'Storytel'],
              ['wish', 'Wishlist'],
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
        {tab === 'search' && <SearchTab existing={existing} onAdd={addFrom('search')} />}
        {tab === 'scan' && (
          <BatchScan
            existing={existing}
            onAdd={onAdd}
            onClose={() => dialog.current?.close()}
            paused={!!followUp}
            onManual={(isbn) => {
              setManualIsbn(isbn)
              setTab('manual')
            }}
          />
        )}
        {tab === 'isbn' && <IsbnTab onAdd={addFrom('isbn')} />}
        {tab === 'manual' && <ManualTab onAdd={addFrom('manual')} isbn={manualIsbn} />}
        {tab === 'wish' && (
          <WishTab
            existing={existing}
            onAdd={addFrom('wish')}
            onAddScanned={onAdd}
            paused={!!followUp}
            onClose={() => dialog.current?.close()}
            onManual={(isbn) => {
              setManualIsbn(isbn)
              setTab('manual')
            }}
          />
        )}
        {tab === 'storytel' && (
          <StorytelTab
            existing={existing}
            onAdd={onAdd}
            onUpdate={onUpdate}
            login={storytelLogin}
            onLogin={onStorytelLogin}
          />
        )}
        </div>
        <p className="attribution">
          Book data and covers from{' '}
          <a href="https://openlibrary.org" target="_blank" rel="noreferrer">
            Open Library
          </a>
          .
        </p>
      </div>
    </dialog>
  )
}

/** Whether a search result is already in her library, and on which list (D-0053). */
function alreadyThere(existing: Book[]): Map<string, 'shelf' | 'wish'> {
  const out = new Map<string, 'shelf' | 'wish'>()
  for (const b of existing) if (b.workKey) out.set(b.workKey, b.wish ? 'wish' : 'shelf')
  return out
}

/**
 * Search Open Library, then **pick the cover before the book is added**
 * (T-0070). `mode: 'wish'` adds to the wishlist instead of the shelf (T-0072);
 * everything else about the search is the same, so there is one search to fix
 * and one to test.
 */
function SearchTab({
  existing,
  onAdd,
  mode = 'shelf',
}: {
  existing: Book[]
  onAdd: (b: NewBook) => void
  mode?: 'shelf' | 'wish'
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  /** the result she tapped, while the cover step is open; nothing is added yet */
  const [choosing, setChoosing] = useState<SearchResult | null>(null)

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

  const there = alreadyThere(existing)

  async function add(r: SearchResult, cover: PickedCover) {
    const details = await getWorkDetails({ data: { workKey: r.workKey } }).catch(() => undefined)
    onAdd({ ...bookWithCover(r, details, cover), ...(mode === 'wish' && { wish: true as const }) })
    setAdded((s) => new Set(s).add(r.workKey))
    setChoosing(null)
  }

  if (choosing) {
    return (
      <CoverStep
        result={choosing}
        addLabel={mode === 'wish' ? 'Add to wishlist' : 'Add this one'}
        onAdd={(cover) => add(choosing, cover)}
        onBack={() => setChoosing(null)}
      />
    )
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
          const where = added.has(r.workKey) ? (mode === 'wish' ? 'wish' : 'shelf') : there.get(r.workKey)
          const label = where === 'wish' ? 'On your wishlist' : where === 'shelf' ? 'On shelf' : mode === 'wish' ? 'Add to wishlist' : 'Add'
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
              <button className="btn small" disabled={!!where} onClick={() => setChoosing(r)}>
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * **Add to wishlist** (T-0072): the same search, adding a wish instead of a
 * shelf book, with a small *By hand* form under it for a book Open Library
 * doesn't have (a pre-order, a small press).
 *
 * **Scan** is there too (D-0082): standing in a bookshop with a book she wants to
 * read but isn't buying today, she points the camera at the barcode and it goes
 * on the wishlist. The same scanner the shelf uses, in its wishlist mode.
 */
function WishTab({
  existing,
  onAdd,
  onAddScanned,
  onManual,
  onClose,
  paused,
}: {
  existing: Book[]
  onAdd: (b: NewBook) => void
  /** a scanned wish: added whole, without the follow-up that asks how she has it */
  onAddScanned: (b: NewBook) => void
  onManual: (isbn: string) => void
  onClose: () => void
  paused: boolean
}) {
  const [scanning, setScanning] = useState(false)
  const empty = { title: '', author: '', price: '', buy: '' }
  const [form, setForm] = useState(empty)
  const [problem, setProblem] = useState<string | null>(null)
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setProblem(null)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return
    const price = parsePrice(form.price)
    if (!price.ok) return setProblem('Try 12.50 or 12,50.')
    const typedBuy = form.buy.trim()
    const buyUrl = typedBuy ? cleanBuyLink(typedBuy) : undefined
    if (typedBuy && !buyUrl) return setProblem('Only links that start with https:// or http:// can be opened here.')
    onAdd({
      title,
      authors: form.author
        .split(/,|&/)
        .map((a) => a.trim())
        .filter(Boolean),
      language: guessLanguage(title),
      color: colorFromString(title),
      wish: true,
      ...(price.price !== undefined && { price: price.price }),
      ...(buyUrl && { buyUrl }),
    })
    setForm(empty)
  }

  if (scanning) {
    return (
      <>
        <button type="button" className="btn small wish-scan-back" onClick={() => setScanning(false)}>
          ‹ Search instead
        </button>
        <BatchScan existing={existing} onAdd={onAddScanned} onManual={onManual} onClose={onClose} paused={paused} mode="wish" />
      </>
    )
  }

  return (
    <>
      <button type="button" className="btn wish-scan" onClick={() => setScanning(true)}>
        <span aria-hidden>📷</span> Scan a book in a shop
      </button>
      <SearchTab existing={existing} onAdd={onAdd} mode="wish" />
      <details className="tab-panel wish-by-hand">
        <summary>By hand</summary>
        <form onSubmit={submit}>
          <label className="field">
            <span>Title *</span>
            <input className="input" required value={form.title} onChange={set('title')} />
          </label>
          <label className="field">
            <span>Author(s)</span>
            <input className="input" placeholder="Separate with commas" value={form.author} onChange={set('author')} />
          </label>
          <PriceInput
            label={
              <>
                What will it cost?<span className="visually-hidden"> (euros)</span>
              </>
            }
            problem={null}
            value={form.price}
            onChange={set('price')}
          />
          <label className="field">
            <span>Where to buy it</span>
            {/* not type="url": the browser's own check would stop the form before our own
                message about https:// and http:// could be shown */}
            <input className="input" type="text" inputMode="url" placeholder="https://…" value={form.buy} onChange={set('buy')} />
          </label>
          {problem && <p className="error">{problem}</p>}
          <button className="btn" disabled={!form.title.trim()}>
            Add to wishlist
          </button>
        </form>
      </details>
    </>
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
      onAdd(await buildBook(found, found))
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

function ManualTab({ onAdd, isbn }: { onAdd: (b: NewBook) => void; isbn?: string }) {
  const empty = { title: '', author: '', published: '', pages: '', isbn: isbn ?? '', description: '' }
  const [form, setForm] = useState(empty)
  const [problem, setProblem] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setDone(false)
    setProblem(null)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return
    const published = form.published.trim() ? parsePublished(form.published) : null
    if (form.published.trim() && !published) return setProblem('Published: try 2008, 03.2008 or 12.03.2008.')
    const typedIsbn = form.isbn.trim() ? normalizeIsbn(form.isbn) : null
    if (form.isbn.trim() && !typedIsbn) return setProblem('Not a valid ISBN: check the digits.')
    onAdd({
      title,
      authors: form.author
        .split(/,|&/)
        .map((a) => a.trim())
        .filter(Boolean),
      ...(published && { published, year: publishedYear(published) }),
      pages: Number(form.pages) || undefined,
      description: form.description.trim() || undefined,
      language: guessLanguage(title),
      color: colorFromString(title),
      // scanned in a shop or at home: a physical copy
      ...(typedIsbn && { isbn: typedIsbn }),
      ...(isbn && { formats: ['paperback' as const] }),
    })
    setForm({ ...empty, isbn: '' })
    setDone(true)
  }

  return (
    <form className="tab-panel" onSubmit={submit}>
      {isbn && <p className="muted">Scanned ISBN {isbn}. Open Library doesn't know it, so fill in the rest by hand.</p>}
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
          <span>Published</span>
          <input className="input" placeholder="2008 or 12.03.2008" value={form.published} onChange={set('published')} />
        </label>
        <label className="field">
          <span>Pages</span>
          <input className="input" inputMode="numeric" value={form.pages} onChange={set('pages')} />
        </label>
      </div>
      <label className="field">
        <span>ISBN</span>
        <input className="input" inputMode="numeric" value={form.isbn} onChange={set('isbn')} />
      </label>
      <label className="field">
        <span>Blurb (shown on the back cover)</span>
        <textarea className="input" rows={3} value={form.description} onChange={set('description')} />
      </label>
      {problem && <p className="error">{problem}</p>}
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
