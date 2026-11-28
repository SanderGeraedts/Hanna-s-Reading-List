import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { DETAILS, DETAIL_LABEL, DETAIL_TAB, LOOKABLE, foundPatch, missingByDetail, misses } from '#/lib/missingDetails'
import type { Detail, Found } from '#/lib/missingDetails'
import { findBackText } from '#/lib/findBackText'
import { lookUpGenres, lookUpPlaces } from '#/lib/useBookDetails'
import { openNextBookOn } from './BookPanel'
import { walkList } from './MissingWalk'

/**
 * Missing details (T-0129, D-0097): per detail, the books on her shelf that miss it; "Look them
 * up" asks Open Library for back texts, genres and countries, shows what it found per book with a
 * tick to keep, and saves only what she keeps, only into empty fields. Tropes and characters are
 * hers to add: tap a book and its panel opens on the tab where they go.
 */

type Lookable = 'back' | 'genres' | 'places'
const WORKERS = 3
const NOT_FOUND_KEY = 'hannas-reading-list:missing-not-found'

/** "id:detail" for what Open Library didn't know, on this device, so it isn't asked again every time. */
function readNotFound(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(NOT_FOUND_KEY) ?? '[]')
    return new Set(Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}
function writeNotFound(s: Set<string>) {
  try {
    localStorage.setItem(NOT_FOUND_KEY, JSON.stringify([...s]))
  } catch {
    /* a note about this device only */
  }
}

type Update = (id: string, patch: Partial<Book> | ((book: Book) => Partial<Book>)) => void

export function MissingDetails({
  books,
  onUpdate,
  onShowBook,
  onClose,
  onWalk,
}: {
  books: Book[]
  onUpdate: Update
  onShowBook: (id: string) => void
  onClose: () => void
  /** go through the books one at a time, starting with this one */
  onWalk?: (first: Book) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  const missing = useMemo(() => missingByDetail(books), [books])
  const [notFound, setNotFound] = useState(readNotFound)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [found, setFound] = useState<Found[] | null>(null)
  const [keep, setKeep] = useState<Record<string, Set<Lookable>>>({})
  const [said, setSaid] = useState('')

  /** books with something Open Library might know, not already asked without luck */
  const toLookUp = useMemo(
    () =>
      books.filter((b) => !b.wish && LOOKABLE.some((d) => misses(b, d) && !notFound.has(`${b.id}:${d}`))),
    [books, notFound],
  )

  const lookUp = async () => {
    const queue = [...toLookUp]
    const total = queue.length
    const results: Found[] = []
    const missed = new Set(notFound)
    let done = 0
    setFound(null)
    setProgress({ done, total })
    const one = async (b: Book) => {
      const f: Found = { id: b.id }
      try {
        if (misses(b, 'back') && !missed.has(`${b.id}:back`)) {
          const t = await findBackText(b).catch(() => undefined)
          if (t) f.back = t
          else missed.add(`${b.id}:back`)
        }
        if (misses(b, 'genres') && !missed.has(`${b.id}:genres`)) {
          const g = await lookUpGenres(b).catch(() => [])
          if (g.length) f.genres = g
          else missed.add(`${b.id}:genres`)
        }
        if (misses(b, 'places') && !missed.has(`${b.id}:places`)) {
          const p = await lookUpPlaces(b).catch(() => [])
          if (p.length) f.places = p
          else missed.add(`${b.id}:places`)
        }
      } finally {
        if (f.back || f.genres || f.places) results.push(f)
        done++
        setProgress({ done, total })
      }
    }
    const worker = async () => {
      for (let b = queue.shift(); b; b = queue.shift()) await one(b)
    }
    await Promise.all(Array.from({ length: Math.min(WORKERS, queue.length) }, worker))
    writeNotFound(missed)
    setNotFound(missed)
    const order = new Map(books.map((b, i) => [b.id, i]))
    results.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    setFound(results)
    setKeep(Object.fromEntries(results.map((r) => [r.id, new Set<Lookable>(LOOKABLE.filter((d) => r[d as Lookable] !== undefined) as Lookable[])])))
    setProgress(null)
    setSaid(results.length ? `Found something for ${results.length} ${results.length === 1 ? 'book' : 'books'}. Untick what you don’t want, then Save.` : 'Open Library had nothing new.')
  }

  const toggle = (id: string, d: Lookable) =>
    setKeep((k) => {
      const next = new Set(k[id] ?? [])
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return { ...k, [id]: next }
    })

  const save = () => {
    if (!found) return
    let n = 0
    for (const f of found) {
      const kept = keep[f.id] ?? new Set()
      if (kept.size === 0) continue
      onUpdate(f.id, foundPatch(f, kept))
      n++
    }
    setFound(null)
    setSaid(n ? `Saved for ${n} ${n === 1 ? 'book' : 'books'}.` : 'Nothing saved.')
  }

  const open = (b: Book, d: Detail) => {
    openNextBookOn(DETAIL_TAB[d])
    dialog.current?.close()
    onShowBook(b.id)
  }
  const title = (id: string) => books.find((b) => b.id === id)?.title ?? ''

  return (
    <dialog className="dialog missing-dialog" ref={dialog} onClose={onClose} aria-labelledby="missing-title">
      <div className="dialog-body">
        <div className="dialog-header">
          <h2 id="missing-title">Missing details</h2>
          <button type="button" className="btn icon small" aria-label="Close" onClick={() => dialog.current?.close()}>
            ×
          </button>
        </div>

        {found === null ? (
          <div className="missing-lookup">
            <p className="small-text">
              Back texts, genres and countries can be looked up on Open Library. You see what it finds before anything is saved, and it only fills
              empty fields.
            </p>
            <button type="button" className="btn primary small" disabled={progress !== null || toLookUp.length === 0} onClick={() => void lookUp()}>
              {progress ? `Looking up ${progress.done} of ${progress.total}…` : toLookUp.length ? `Look them up (${toLookUp.length} ${toLookUp.length === 1 ? 'book' : 'books'})` : 'Nothing left to look up'}
            </button>
          </div>
        ) : (
          <section className="missing-found" aria-label="Found on Open Library">
            <ul>
              {found.map((f) => (
                <li key={f.id}>
                  <strong>{title(f.id)}</strong>
                  {(['back', 'genres', 'places'] as const).map(
                    (d) =>
                      f[d] !== undefined && (
                        <label key={d} className="missing-pick">
                          <input type="checkbox" checked={keep[f.id]?.has(d) ?? false} onChange={() => toggle(f.id, d)} />
                          <span>
                            <span className="muted small-text">{DETAIL_LABEL[d]}: </span>
                            {d === 'back' ? (f.back!.length > 220 ? `${f.back!.slice(0, 220)}…` : f.back) : (f[d] as string[]).join(', ')}
                          </span>
                        </label>
                      ),
                  )}
                </li>
              ))}
            </ul>
            <div className="challenge-actions">
              <button type="button" className="btn primary small" onClick={save}>
                Save
              </button>
              <button type="button" className="btn small" onClick={() => setFound(null)}>
                Skip all
              </button>
            </div>
          </section>
        )}

        {onWalk && walkList(books).length > 0 && (
          <button
            type="button"
            className="btn small"
            onClick={() => {
              const first = walkList(books)[0]
              dialog.current?.close()
              onWalk(first)
            }}
          >
            Go through them one by one ({walkList(books).length} {walkList(books).length === 1 ? 'book' : 'books'})
          </button>
        )}

        {DETAILS.map((d) => (
          <details key={d} className="missing-detail">
            <summary>
              {DETAIL_LABEL[d]} <span className="muted small-text">· {missing[d].length ? `${missing[d].length} missing` : 'all filled in ✓'}</span>
            </summary>
            {missing[d].length > 0 && (
              <ul className="missing-books">
                {missing[d].map((b) => (
                  <li key={b.id}>
                    <button type="button" className="link-btn" onClick={() => open(b, d)}>
                      {b.title}
                    </button>
                    {notFound.has(`${b.id}:${d}`) && <span className="muted small-text"> · not found online</span>}
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}

        <p className="visually-hidden" role="status" aria-live="polite">
          {said}
        </p>
        {said && <p className="small-text">{said}</p>}
      </div>
    </dialog>
  )
}
