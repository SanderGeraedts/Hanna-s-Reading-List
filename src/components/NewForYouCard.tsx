import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book, NewBook } from '#/lib/library'
import { NOTES, bookLine, findSuggestions, titleKey } from '#/lib/recommend'
import type { Suggestion } from '#/lib/recommend'
import { findOnOpenLibrary } from '#/lib/storytelImport'
import { coverUrlForId, colorFromString } from '#/lib/cover'
import { browseBooks, getWorkDetails } from '#/server/openLibrary'
import type { SearchResult } from '#/server/openLibrary'
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

const lineKey = (s: Suggestion) => `${s.title}-${s.author}`

/**
 * New for you (#186; "Recommended for you" before #123): newer books by her
 * favourite authors and new books in her favourite genres, from Open Library.
 * One tap puts one on the shelf as want-to-read; "Not for me" makes sure it
 * isn't suggested again on this device. The last suggestions are kept on this
 * device, so it only asks Open Library when she presses the button.
 */
export function NewForYouCard({ books, accountId, onAdd }: Props) {
  const [items, setItems] = useState<Suggestion[]>(() => load(key('recommended', accountId), []))
  const [notForMe, setNotForMe] = useState<string[]>(() => load(key('not-for-me', accountId), []))
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  // after a line leaves the list, focus goes to the next line's "+ Want to read", or the head button
  const [focusAfter, setFocusAfter] = useState<number | null>(null)
  const headButton = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)

  // a suggestion she has since put on the shelf drops off
  const onShelf = useMemo(() => new Set(books.map((b) => titleKey(b.title))), [books])
  const shown = items.filter((s) => !onShelf.has(titleKey(s.title)))

  useEffect(() => {
    if (focusAfter === null) return
    setFocusAfter(null)
    const buttons = list.current?.querySelectorAll<HTMLButtonElement>('.recommend-add')
    ;(buttons?.[Math.min(focusAfter, buttons.length - 1)] ?? headButton.current)?.focus()
  }, [focusAfter, shown.length])

  const keep = (next: Suggestion[]) => {
    setItems(next)
    save(key('recommended', accountId), next)
  }
  const suggest = async () => {
    setBusy(true)
    setNote(null)
    setAdded(null)
    try {
      const found = await findSuggestions(books, notForMe, (q) => browseBooks({ data: q }))
      setNote(found.note ?? null)
      // with Open Library out of reach, the suggestions shown before stay
      if (found.note !== NOTES.unreachable) keep(found.suggestions)
    } catch {
      setNote(NOTES.unreachable)
    } finally {
      setBusy(false)
    }
  }
  const leave = (s: Suggestion) => {
    const at = shown.indexOf(s)
    keep(items.filter((i) => i !== s))
    setFocusAfter(Math.max(0, at))
  }
  const dismiss = (s: Suggestion) => {
    const next = [...notForMe, bookLine(s.title, s.author)].slice(-200)
    setNotForMe(next)
    save(key('not-for-me', accountId), next)
    setAdded(null)
    leave(s)
  }
  const addedOne = (s: Suggestion) => {
    setAdded(`“${s.title}” is on your shelf.`)
    leave(s)
  }

  return (
    <section className="dash-card recommend-card" aria-labelledby="recommend-title">
      <div className="dash-card-head">
        <h2 id="recommend-title">New for you</h2>
        <button ref={headButton} className="btn small" onClick={suggest} disabled={busy}>
          {busy ? 'Looking…' : shown.length ? 'New suggestions' : 'Suggest books'}
        </button>
      </div>
      <p className="muted small-text recommend-status" role="status">
        {added ?? ''}
      </p>
      {note && <p className="muted small-text">{note}</p>}
      {shown.length === 0 && !busy && !note && (
        // the empty-block message; no "how to" hint (D-0014)
        <p className="muted small-text">New books by your favourite authors and in your favourite genres.</p>
      )}
      <ul className="recommend-list" ref={list} aria-busy={busy}>
        {shown.map((s) => (
          <SuggestionLine key={lineKey(s)} s={s} onAdd={onAdd} onAdded={() => addedOne(s)} onDismiss={() => dismiss(s)} />
        ))}
      </ul>
    </section>
  )
}

function SuggestionLine({
  s,
  onAdd,
  onAdded,
  onDismiss,
}: {
  s: Suggestion
  onAdd: Props['onAdd']
  onAdded: () => void
  onDismiss: () => void
}) {
  // its Open Library match, for the cover and the details when she adds it
  const [match, setMatch] = useState<SearchResult | null | undefined>(s.result)
  const [adding, setAdding] = useState(false)
  useEffect(() => {
    if (s.result) return
    let live = true
    findOnOpenLibrary({ title: s.title, authors: s.author ? [s.author] : [] })
      .then((r) => live && setMatch(r ?? null))
      .catch(() => live && setMatch(null))
    return () => {
      live = false
    }
  }, [s.title, s.author, s.result])

  const add = async () => {
    setAdding(true)
    try {
      if (match) {
        const details = match.workKey
          ? ((await getWorkDetails({ data: { workKey: match.workKey } }).catch(() => undefined)) ?? undefined)
          : undefined
        onAdd({ ...(await buildBook(match, details)), status: 'want' })
      } else {
        onAdd({ title: s.title, authors: s.author ? [s.author] : [], year: s.year, color: colorFromString(s.title), status: 'want' })
      }
      onAdded()
    } catch {
      // the cover or details couldn't be fetched: add what is known
      onAdd({ title: s.title, authors: s.author ? [s.author] : [], year: s.year, color: colorFromString(s.title), status: 'want' })
      onAdded()
    } finally {
      setAdding(false)
    }
  }

  const cover = match?.coverId ? coverUrlForId(match.coverId, 'M') : undefined
  return (
    <li>
      {cover ? (
        <img
          className="dash-cover small"
          src={cover}
          alt=""
          loading="lazy"
          style={{ background: colorFromString(s.title) }}
        />
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
          <button
            className="btn small recommend-add"
            onClick={add}
            disabled={adding}
            aria-label={adding ? undefined : `Add “${s.title}” as Want to read`}
          >
            {adding ? 'Adding…' : '+ Want to read'}
          </button>
          <button className="btn small quiet" onClick={onDismiss} aria-label={`Not for me: “${s.title}”`}>
            Not for me
          </button>
        </span>
      </span>
    </li>
  )
}
