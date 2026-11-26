import { useMemo } from 'react'
import type { Book } from '#/lib/library'
import { timesRead } from '#/lib/library'
import { tropeCounts } from '#/lib/tropes'
import { favouriteCharacters } from '#/lib/characters'
import { Cover } from './common'

/** At most this many trope rows and favourite characters in the block. */
const MAX_TROPES = 6
const MAX_FAVOURITES = 8

/** What the block has to show: her most-read tropes and her ♥ characters (D-0042). */
export function tropesBlock(books: Book[]) {
  const tropes = tropeCounts(books.filter((b) => timesRead(b) > 0)).slice(0, MAX_TROPES)
  const favourites = favouriteCharacters(books).slice(0, MAX_FAVOURITES)
  return { tropes, favourites, empty: tropes.length === 0 && favourites.length === 0 }
}

/**
 * The dashboard block "Tropes & characters" (D-0042): the tropes of her
 * finished books, biggest first, and her favourite characters with the cover of
 * the book they are from. It hides itself when she has neither.
 */
export function TropesCard({ books, onShowBook }: { books: Book[]; onShowBook: (id: string) => void }) {
  const { tropes, favourites } = useMemo(() => tropesBlock(books), [books])
  const most = tropes[0]?.count ?? 1

  return (
    <section className="dash-card" aria-labelledby="tropes-title">
      <h2 id="tropes-title">Tropes &amp; characters</h2>
      {tropes.length > 0 && (
        <>
          <h3 className="dash-sub muted small-text">Most-read tropes</h3>
          <ul className="trope-bars">
            {tropes.map((t) => (
              <li key={t.name}>
                <span className="trope-name">{t.name}</span>
                <span className="trope-bar" aria-hidden>
                  <span className="trope-bar-fill" style={{ width: `${Math.round((t.count / most) * 100)}%` }} />
                </span>
                <span className="trope-count muted small-text" aria-hidden>
                  {t.count}
                </span>
                <span className="visually-hidden">
                  {t.count} {t.count === 1 ? 'book' : 'books'}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {favourites.length > 0 && (
        <>
          <h3 className="dash-sub muted small-text">Favourites</h3>
          <ul className="favourite-characters">
            {favourites.map((f) => (
              <li key={`${f.book.id}-${f.name}`}>
                <button
                  className="favourite-character"
                  onClick={() => onShowBook(f.book.id)}
                  aria-label={`${f.name}, from ${f.book.title}`}
                >
                  <Cover book={f.book} small />
                  <span className="small-text">{f.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
