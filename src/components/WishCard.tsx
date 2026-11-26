import { useEffect, useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { REASON_TEXT, grantWish, wishOptions } from '#/lib/wish'
import type { Granted, Length, Wish } from '#/lib/wish'
import { Cover } from './common'
import { sparkle } from './Sparkles'

/**
 * Make a wish, version 2: step 1 the wishes (length, genre, language; all
 * optional, fresh each time), step 2 three books granted with a sparkle.
 * Tap one to open it, or wish again for three others.
 */
export function WishCard({
  books,
  choices,
  startGenre,
  onPick,
  onClose,
}: {
  books: Book[]
  /** what she could read next (readNextChoices) */
  choices: Book[]
  /** the genre picked at the top of the shelf, if any */
  startGenre?: string
  onPick: (id: string) => void
  onClose: () => void
}) {
  const options = useMemo(() => wishOptions(choices), [choices])
  const [wish, setWish] = useState<Wish>(() => (startGenre && options.genres.includes(startGenre) ? { genre: startGenre } : {}))
  const [granted, setGranted] = useState<Granted | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const grant = (avoid: string[] = []) => {
    setGranted(grantWish(choices, books, wish, { avoid }))
    sparkle()
  }
  const set = (patch: Partial<Wish>) => setWish((w) => ({ ...w, ...patch }))

  return (
    <div className="quick-backdrop" onClick={onClose}>
      <section className="quick-sheet wish-sheet" role="dialog" aria-modal="true" aria-label="Make a wish" onClick={(e) => e.stopPropagation()}>
        <div className="quick-head">
          {granted ? (
            <button className="btn small" onClick={() => setGranted(null)}>
              ‹ Change wishes
            </button>
          ) : (
            <h2>
              <span aria-hidden>⭐</span> Make a wish
            </h2>
          )}
          <button className="btn icon small" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>

        {!granted ? (
          <div className="wish-form">
            <div className="wish-row" role="group" aria-label="Length">
              <span className="muted small-text">Length</span>
              <div className="segmented">
                {([undefined, 'short', 'long'] as Array<Length | undefined>).map((l) => (
                  <button key={l ?? 'any'} className={wish.length === l ? 'active' : ''} aria-pressed={wish.length === l} onClick={() => set({ length: l })}>
                    {l === 'short' ? 'Short' : l === 'long' ? 'Long' : 'Any'}
                  </button>
                ))}
              </div>
            </div>
            {options.genres.length > 0 && (
              <label className="wish-row">
                <span className="muted small-text">Genre</span>
                <select className="input" value={wish.genre ?? ''} onChange={(e) => set({ genre: e.target.value || undefined })}>
                  <option value="">Any genre</option>
                  {options.genres.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {options.tropes.length > 0 && (
              <label className="wish-row">
                <span className="muted small-text">Trope</span>
                <select className="input" value={wish.trope ?? ''} onChange={(e) => set({ trope: e.target.value || undefined })}>
                  <option value="">Any trope</option>
                  {options.tropes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {options.languages.length > 1 && (
              <div className="wish-row" role="group" aria-label="Language">
                <span className="muted small-text">Language</span>
                <div className="segmented">
                  <button className={!wish.language ? 'active' : ''} aria-pressed={!wish.language} onClick={() => set({ language: undefined })}>
                    Any
                  </button>
                  {options.languages.map((l) => (
                    <button key={l.code} className={wish.language === l.code ? 'active' : ''} aria-pressed={wish.language === l.code} onClick={() => set({ language: l.code })}>
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button className="btn primary wish-grant" onClick={() => grant()}>
              ✨ Grant my wish
            </button>
          </div>
        ) : (
          <div className="wish-granted">
            {!granted.exact && <p className="muted small-text">No book matches all your wishes. These come closest:</p>}
            <ul className="wish-books">
              {granted.books.map(({ book, reasons }) => (
                <li key={book.id}>
                  <button className="wish-book" onClick={() => onPick(book.id)}>
                    <Cover book={book} />
                    <span className="wish-book-text">
                      <strong>{book.title}</strong>
                      {book.authors[0] && <span className="muted small-text">{book.authors[0]}</span>}
                      {reasons.map((r) => (
                        <span key={r} className="wish-reason small-text">
                          ✨ {REASON_TEXT[r]}
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {choices.length > granted.books.length && (
              <button className="btn" onClick={() => grant(granted.books.map((x) => x.book.id))}>
                ⭐ Wish again
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
