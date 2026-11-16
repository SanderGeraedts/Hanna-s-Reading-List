import { useMemo } from 'react'
import { LETTERS, alphabetYear } from '#/lib/alphabet'
import type { Props } from './Dashboard'

/** The A–Z challenge (#143): a book for every letter this year, how it's going, and tips from the pile. */
export function AlphabetCard({ books, onShowBook }: Props) {
  const year = new Date().getFullYear()
  const a = useMemo(() => alphabetYear(books, year), [books, year])
  return (
    <section className="dash-card" aria-labelledby="alphabet-title">
      <div className="dash-card-head">
        <h2 id="alphabet-title">A–Z challenge {year}</h2>
        <span className={`small-text${a.onTrack ? ' muted' : ' alphabet-behind'}`}>{a.pace}</span>
      </div>
      <div className="alphabet" role="list" aria-label={`A–Z challenge ${year}`}>
        {LETTERS.map((l) => {
          const hit = a.done.get(l)
          const label = hit ? `${l}: ${hit.book.title}` : `${l}: not yet`
          return hit ? (
            <button
              key={l}
              role="listitem"
              className="alphabet-letter on"
              title={label}
              aria-label={label}
              onClick={() => onShowBook(hit.book.id)}
            >
              {l}
            </button>
          ) : (
            <span key={l} role="listitem" className="alphabet-letter" title={label} aria-label={label}>
              {l}
            </span>
          )
        })}
      </div>
      {a.tips.length > 0 && (
        <div className="alphabet-tips">
          <p className="muted small-text">From your pile:</p>
          <ul className="book-list">
            {a.tips.slice(0, 5).map(({ letter, book }) => (
              <li key={letter}>
                <strong className="alphabet-tip-letter">{letter}</strong>{' '}
                <button className="link-btn" onClick={() => onShowBook(book.id)}>
                  {book.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
