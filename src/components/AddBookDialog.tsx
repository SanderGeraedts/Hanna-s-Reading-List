import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { getWorkDetails, lookupIsbn, searchBooks } from '#/server/openLibrary'
import type { SearchResult } from '#/server/openLibrary'
import type { Book, NewBook } from '#/lib/library'
import { analyzeCover, colorFromString, coverUrlForId, coverUrlForIsbn } from '#/lib/cover'

type Tab = 'search' | 'isbn' | 'manual'

interface Props {
  existing: Book[]
  onAdd: (book: NewBook) => void
  onClose: () => void
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

export function AddBookDialog({ existing, onAdd, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('search')
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
