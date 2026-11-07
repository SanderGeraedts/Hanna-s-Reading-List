import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import type { SeriesInfo } from '#/lib/series'
import { searchShelf } from '#/lib/search'

interface Props {
  books: Book[]
  detectedSeries: Map<string, SeriesInfo>
  /** take the book off the shelf */
  onPick: (id: string) => void
}

const SHOWN = 50

/** Search the shelf: a button that opens a search field with a list of matching books. Also opens with "/". */
export function SearchBox({ books, detectedSeries, onPick }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const hits = useMemo(() => searchShelf(books, query, detectedSeries), [books, query, detectedSeries])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target
      const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement
      if (e.key === '/' && !typing && !document.querySelector('dialog[open]')) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // a click or tap anywhere else closes it
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  const pick = (id: string) => {
    setOpen(false)
    onPick(id)
  }

  return (
    <div className="search" ref={box}>
      <button
        className="btn search-btn"
        aria-label="Search the shelf"
        aria-expanded={open}
        title="Search the shelf (/)"
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M15.5 15.5 21 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="search-pop">
          <input
            className="input"
            type="search"
            autoFocus
            aria-label="Search the shelf"
            placeholder="Title, author, genre, language, friend…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setOpen(false)
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((i) => Math.min(i + 1, Math.min(hits.length, SHOWN) - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter' && hits[active]) {
                pick(hits[active].book.id)
              }
            }}
          />
          {query.trim() && (
            <p className="muted search-count" role="status">
              {hits.length === 0
                ? 'No book on the shelf matches.'
                : `${hits.length} book${hits.length === 1 ? '' : 's'}${hits.length > SHOWN ? ` (first ${SHOWN} shown)` : ''}`}
            </p>
          )}
          {hits.length > 0 && (
            <ul className="search-results">
              {hits.slice(0, SHOWN).map((h, i) => (
                <li key={h.book.id}>
                  <button
                    className={i === active ? 'active' : undefined}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(h.book.id)}
                  >
                    <span className="swatch" style={{ background: h.book.color }} aria-hidden />
                    <span className="search-text">
                      <strong>{h.book.title}</strong>
                      <span>{h.book.authors.join(', ') || 'Unknown author'}</span>
                      {h.hint && <span className="muted">{h.hint}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
