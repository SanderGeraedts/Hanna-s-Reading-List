import { useEffect, useMemo, useState } from 'react'
import type { Book, NewBook } from '#/lib/library'
import { bookLine, shelfSummary, titleKey } from '#/lib/recommend'
import type { Suggestion } from '#/lib/recommend'
import { findOnOpenLibrary } from '#/lib/storytelImport'
import { coverUrlForId, colorFromString } from '#/lib/cover'
import { getWorkDetails } from '#/server/openLibrary'
import type { SearchResult } from '#/server/openLibrary'
import { recommendBooks, recommendationsAvailable } from '#/server/recommend'
import { buildBook } from './AddBookDialog'

interface Props {
  books: Book[]
  accountId: string | null
  onAdd: (book: NewBook) => void
}

const key = (what: string, accountId: string | null) => `hannas-reading-list:${what}:${accountId ?? 'local'}`
function load<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function save(k: string, value: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(value))
  } catch {
    // private mode: kept for this visit only
  }
}

let available: Promise<boolean> | null = null

/**
 * Recommended for you: new books picked from what her shelf says she loves
 * (her best-rated books, favourite authors and genres). One tap puts one on
 * the shelf as want-to-read; "Not for me" makes sure it isn't suggested again.
 * The last suggestions are kept on this device, so opening the dashboard
 * doesn't ask again every time.
 */
export function RecommendCard({ books, accountId, onAdd }: Props) {
  const [ready, setReady] = useState<boolean | null>(null)
  const [items, setItems] = useState<Suggestion[]>(() => load(key('recommended', accountId), []))
  const [notForMe, setNotForMe] = useState<string[]>(() => load(key('not-for-me', accountId), []))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    available ??= recommendationsAvailable().catch(() => false)
    let live = true
    available.then((ok) => live && setReady(ok))
    return () => {
      live = false
    }
  }, [])

  // a suggestion she has since put on the shelf drops off
  const onShelf = useMemo(() => new Set(books.map((b) => titleKey(b.title))), [books])
  const shown = items.filter((s) => !onShelf.has(titleKey(s.title)))

  const keep = (next: Suggestion[]) => {
    setItems(next)
    save(key('recommended', accountId), next)
  }
  const suggest = async () => {
    setBusy(true)
    setError(null)
    try {
      keep(await recommendBooks({ data: shelfSummary(books, notForMe) }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }
  const dismiss = (s: Suggestion) => {
    const next = [...notForMe, bookLine(s.title, s.author)].slice(-200)
    setNotForMe(next)
    save(key('not-for-me', accountId), next)
    keep(items.filter((i) => i !== s))
  }

  if (ready === false) {
    return (
      <section className="dash-card" aria-labelledby="recommend-title">
        <h2 id="recommend-title">Recommended for you</h2>
        <p className="muted small-text">
          Book suggestions need a signed-in account and the AI to be set up on the server.
        </p>
      </section>
    )
  }

  return (
    <section className="dash-card recommend-card" aria-labelledby="recommend-title">
      <div className="dash-card-head">
        <h2 id="recommend-title">Recommended for you</h2>
        <button className="btn small" onClick={suggest} disabled={busy || ready === null}>
          {busy ? 'Thinking…' : shown.length ? 'New suggestions' : 'Suggest books'}
        </button>
      </div>
      {error && <p className="error small-text">{error}</p>}
      {shown.length === 0 && !busy && (
        <p className="muted small-text">
          New books picked for you from your best-rated reads, favourite authors and genres. Rate a few books for
          better picks.
        </p>
      )}
      <ul className="recommend-list">
        {shown.map((s) => (
          <SuggestionLine key={`${s.title}-${s.author}`} s={s} onAdd={onAdd} onDismiss={() => dismiss(s)} />
        ))}
      </ul>
    </section>
  )
}

function SuggestionLine({ s, onAdd, onDismiss }: { s: Suggestion; onAdd: Props['onAdd']; onDismiss: () => void }) {
  // its Open Library match, for the cover and the details when she adds it
  const [match, setMatch] = useState<SearchResult | null | undefined>(undefined)
  const [adding, setAdding] = useState(false)
  useEffect(() => {
    let live = true
    findOnOpenLibrary({ title: s.title, authors: s.author ? [s.author] : [] }).then((r) => live && setMatch(r ?? null))
    return () => {
      live = false
    }
  }, [s.title, s.author])

  const add = async () => {
    setAdding(true)
    try {
      if (match) {
        const details = match.workKey
          ? await getWorkDetails({ data: { workKey: match.workKey } }).catch(() => undefined)
          : undefined
        onAdd({ ...(await buildBook(match, details)), status: 'want' })
      } else {
        onAdd({ title: s.title, authors: s.author ? [s.author] : [], year: s.year, color: colorFromString(s.title), status: 'want' })
      }
    } finally {
      setAdding(false)
    }
  }

  const cover = match?.coverId ? coverUrlForId(match.coverId) : undefined
  return (
    <li>
      {cover ? (
        <img className="dash-cover small" src={cover} alt="" loading="lazy" />
      ) : (
        <span className="dash-cover blank small" style={{ background: colorFromString(s.title) }} aria-hidden />
      )}
      <span className="recommend-info">
        <strong>{s.title}</strong>
        <span className="muted small-text">
          {s.author}
          {s.year ? ` · ${s.year}` : ''}
        </span>
        {s.why && <span className="small-text">{s.why}</span>}
        <span className="recommend-actions">
          <button className="btn small" onClick={add} disabled={adding}>
            {adding ? 'Adding…' : '+ Want to read'}
          </button>
          <button className="btn small ghost" onClick={onDismiss}>
            Not for me
          </button>
        </span>
      </span>
    </li>
  )
}
