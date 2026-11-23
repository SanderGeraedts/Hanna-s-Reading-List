import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { drawSuggestion } from '#/lib/bingoSuggest'
import { letterPool } from '#/lib/alphabetSuggest'
import type { Book } from '#/lib/library'
import { LETTERS, alphabetYear, pickLetter, type AlphabetKind } from '#/lib/alphabet'
import type { ShareSpec } from '#/lib/shareImage'
import { Cover } from './Dashboard'
import { ShareButton } from './ShareButton'
import { OpenLink } from './OpenLink'

interface Props {
  books: Book[]
  onShowBook: (id: string) => void
  onUpdate: (id: string, patch: Partial<Book>) => void
  /** which challenge it opens on: titles (#143) or authors (#151); a switch changes it */
  kind?: AlphabetKind
  /** another year than this one, on the Challenges page */
  year?: number
  /** on the dashboard: the letters only, no tips or share */
  compact?: boolean
  onOpen?: () => void
}

const TITLES: Record<AlphabetKind, string> = { title: 'A–Z challenge', author: 'A–Z authors' }
const KINDS: Array<[AlphabetKind, string]> = [
  ['title', 'Titles'],
  ['author', 'Authors'],
]

/**
 * An A–Z challenge: a book for every letter this year, how it's going, and
 * tips from the pile. A letter that's done shows its book's cover (#150);
 * tapping it lets Hanna pick which of the books that count stands for it
 * (#152). See alphabet.ts.
 */
export function AlphabetCard({ books, onShowBook, onUpdate, kind: firstKind = 'title', year: forYear, compact = false, onOpen }: Props) {
  const year = forYear ?? new Date().getFullYear()
  // the titles and the authors challenge in one block, with a switch
  const [kind, setKind] = useState<AlphabetKind>(firstKind)
  const a = useMemo(() => alphabetYear(books, year, undefined, kind), [books, year, kind])
  const [open, setOpen] = useState<string | null>(null)
  const title = `${TITLES[kind]} ${year}`
  const id = `alphabet-${kind}-title`
  const choosing = open ? a.done.get(open) : undefined
  // a letter she has not read yet suggests a book from her pile, as a bingo square does (D-0070)
  const suggestId = useId()
  const [asking, setAsking] = useState<string | null>(null)
  const [shown, setShown] = useState<string[]>([])
  const [focusTick, setFocusTick] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const letterRefs = useRef(new Map<string, HTMLButtonElement>())
  const pool = useMemo(() => (asking ? letterPool(asking, books, kind) : null), [asking, books, kind])
  const suggested = pool?.find((c) => c.book.id === shown.at(-1))?.book
  const openAsking = (letter: string) => {
    setOpen(null)
    setAsking(letter)
    setShown(drawSuggestion(letterPool(letter, books, kind))?.shown ?? [])
    setFocusTick((n) => n + 1)
  }
  const closeAsking = (toLetter: boolean) => {
    const letter = asking
    setAsking(null)
    setShown([])
    if (toLetter && letter) letterRefs.current.get(letter)?.focus()
  }
  const another = () => {
    const next = pool && drawSuggestion(pool, shown)
    if (next) setShown(next.shown)
  }
  useEffect(() => {
    if (!focusTick) return
    const h = headingRef.current
    if (!h) return
    h.focus({ preventScroll: true })
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    h.closest('.bingo-suggest')?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [focusTick])
  // the shelf changed under an open letter: a letter now read closes it, and a book that no
  // longer counts makes room for another one
  useEffect(() => {
    if (!asking) return
    if (a.done.has(asking)) {
      setAsking(null)
      setShown([])
      return
    }
    if (pool && pool.length && !suggested) setShown((old) => drawSuggestion(pool, old)?.shown ?? [])
  }, [asking, a, pool, suggested])
  const options = open ? (a.options.get(open) ?? []) : []

  const share = (): ShareSpec => ({
    title,
    subtitle: a.pace,
    columns: 6,
    aspect: 1.5,
    tiles: LETTERS.map((l) => {
      const hit = a.done.get(l)
      return hit
        ? { label: l, cover: hit.book.coverUrl, color: hit.book.color, on: true }
        : { label: l, on: false }
    }),
  })

  return (
    <section className="dash-card" aria-labelledby={id}>
      <div className="dash-card-head">
        <h2 id={id}>{title}</h2>
        <OpenLink onOpen={onOpen} label="A–Z challenge" />
      </div>
      <div className="alphabet-switch">
        <div className="segmented" role="group" aria-label="Which A–Z challenge">
          {KINDS.map(([k, name]) => (
            <button
              key={k}
              type="button"
              className={kind === k ? 'active' : undefined}
              aria-pressed={kind === k}
              onClick={() => {
                setKind(k)
                setOpen(null)
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <span className={`small-text${a.onTrack ? ' muted' : ' alphabet-behind'}`}>{a.pace}</span>
      </div>
      {kind === 'author' && (
        <p className="muted small-text alphabet-rule">An author’s first name and surname both count.</p>
      )}
      <div className="alphabet" role="list" aria-label={title}>
        {LETTERS.map((l) => {
          const hit = a.done.get(l)
          if (!hit) {
            // on the dashboard the letters only look back; on the page an empty one suggests (D-0070)
            if (compact)
              return (
                <span key={l} role="listitem" className="alphabet-letter" title={`${l}: not yet`} aria-label={`${l}: not yet`}>
                  {l}
                </span>
              )
            const label = `${l}: not yet, suggest a book`
            return (
              <button
                key={l}
                type="button"
                role="listitem"
                ref={(el) => {
                  if (el) letterRefs.current.set(l, el)
                  else letterRefs.current.delete(l)
                }}
                className={`alphabet-letter${asking === l ? ' open' : ''}`}
                title={label}
                aria-label={label}
                aria-expanded={asking === l}
                aria-controls={asking === l ? suggestId : undefined}
                onClick={() => (asking === l ? closeAsking(true) : openAsking(l))}
              >
                {l}
              </button>
            )
          }
          const count = a.options.get(l)?.length ?? 1
          const label = `${l}: ${hit.book.title}${count > 1 ? ` (${count} books count, tap to choose)` : ''}`
          return (
            <button
              key={l}
              role="listitem"
              className={`alphabet-letter on${open === l ? ' open' : ''}`}
              title={label}
              aria-label={label}
              aria-expanded={open === l}
              onClick={() => {
                closeAsking(false)
                setOpen(open === l ? null : l)
              }}
            >
              <span className="alphabet-cover" aria-hidden>
                <Cover book={hit.book} small />
              </span>
              <span className="alphabet-badge">{l}</span>
              {count > 1 && <span className="alphabet-more" aria-hidden>{count}</span>}
            </button>
          )
        })}
      </div>
      {asking && (
        <section className="bingo-suggest alphabet-suggest" id={suggestId} aria-labelledby={`${suggestId}-title`}>
          <div className="bingo-suggest-top">
            <h3 id={`${suggestId}-title`} ref={headingRef} tabIndex={-1}>
              {kind === 'author' ? `An author with ${asking}` : `A title with ${asking}`}
            </h3>
          </div>
          {suggested ? (
            <div className="next-book">
              <Cover book={suggested} />
              <div>
                <div aria-live="polite" aria-atomic="true">
                  <p className="next-title bingo-suggest-title">{suggested.title}</p>
                  {suggested.authors.length > 0 && <p className="muted">{suggested.authors.join(', ')}</p>}
                </div>
                <div className="next-actions bingo-suggest-actions">
                  <button type="button" className="btn primary" aria-label={`Open ${suggested.title}`} onClick={() => onShowBook(suggested.id)}>
                    Open
                  </button>
                  {(pool?.length ?? 0) > 1 && (
                    <button type="button" className="btn" aria-label={`Another book for ${asking}`} onClick={another}>
                      <span aria-hidden>🎲</span> Another one
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="muted">No book on your shelf counts for {asking} yet.</p>
          )}
          {/* last in tab order (after Open and Another one), drawn top right */}
          <button type="button" className="btn icon small bingo-suggest-close" aria-label="Close" onClick={() => closeAsking(true)}>
            ×
          </button>
        </section>
      )}
      {open && choosing && (
        <div className="alphabet-choose">
          <p className="small-text">
            {options.length > 1 ? (
              <>
                Which book stands for <strong>{open}</strong>?
              </>
            ) : (
              <>
                <strong>{choosing.book.title}</strong> is the only book for <strong>{open}</strong> so far.
              </>
            )}
          </p>
          {options.length > 1 && (
            <ul className="alphabet-options">
              {options.map((b) => {
                const on = b.id === choosing.book.id
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      className={`alphabet-option${on ? ' on' : ''}`}
                      aria-pressed={on}
                      onClick={() => {
                        for (const [bookId, patch] of pickLetter(books, kind, year, open, b.id)) onUpdate(bookId, patch)
                      }}
                    >
                      <Cover book={b} small />
                      <span>{b.title}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <button type="button" className="link-btn small-text" onClick={() => onShowBook(choosing.book.id)}>
            Show {choosing.book.title} on the shelf
          </button>
        </div>
      )}
      {!compact && (
        <div className="challenge-actions">
          <ShareButton spec={share} label={title} />
        </div>
      )}
    </section>
  )
}
