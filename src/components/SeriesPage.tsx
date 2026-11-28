import { useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { SORT_LABELS, allSeries, isRead, sortSeries } from '#/lib/seriesPage'
import type { SeriesSort } from '#/lib/seriesPage'
import { Cover } from './common'

/**
 * The Series page (T-0132, D-0100): every series on her shelf, its books as covers in order;
 * read ones in colour, the rest greyed, the one she is reading with a thin progress bar, and a
 * dashed spot for a number the series skips. A–Z, or sorted as she chooses (kept on this device).
 */

const SORT_KEY = 'hannas-reading-list:series-sort'
const SORTS: readonly SeriesSort[] = ['az', 'progress', 'author', 'recent']

function readSort(): SeriesSort {
  try {
    const v = localStorage.getItem(SORT_KEY)
    return SORTS.includes(v as SeriesSort) ? (v as SeriesSort) : 'az'
  } catch {
    return 'az'
  }
}

export function SeriesPage({ books, onShowBook }: { books: Book[]; onShowBook: (id: string) => void }) {
  const [sort, setSort] = useState<SeriesSort>(readSort)
  const [query, setQuery] = useState('')
  const all = useMemo(() => allSeries(books), [books])
  const q = query.trim().toLowerCase()
  const rows = useMemo(
    () => sortSeries(q ? all.filter((r) => r.name.toLowerCase().includes(q) || r.author.toLowerCase().includes(q)) : all, sort),
    [all, sort, q],
  )
  const pick = (next: SeriesSort) => {
    setSort(next)
    try {
      localStorage.setItem(SORT_KEY, next)
    } catch {
      /* only this device's choice */
    }
  }

  return (
    <div className="dashboard">
      <div className="series-page">
        <header className="series-head">
          <h1>Series</h1>
          <div className="series-tools">
            <input className="input" type="search" placeholder="Find a series…" aria-label="Find a series" value={query} onChange={(e) => setQuery(e.target.value)} />
            <label className="sort">
              <span className="muted">Sort</span>
              <select className="input" value={sort} onChange={(e) => pick(e.target.value as SeriesSort)}>
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
        {all.length === 0 ? (
          <p className="muted">No series on your shelf yet: a series shows here once two of its books are on your shelf.</p>
        ) : rows.length === 0 ? (
          <p className="muted">No series matches “{query}”.</p>
        ) : (
          <ul className="series-rows-page">
            {rows.map((r) => (
              <li key={r.key} className="dash-card series-page-row">
                <div className="series-row-head">
                  <h2>
                    {r.read === r.total && <span aria-label="finished">★ </span>}
                    {r.name}
                  </h2>
                  <span className="muted small-text">
                    {r.author && `${r.author} · `}
                    {r.read} of {r.total} read
                  </span>
                </div>
                <ol className="series-covers">
                  {r.slots.map((s, i) =>
                    s.book ? (
                      <SeriesCover key={s.book.id} book={s.book} index={s.index} onShowBook={onShowBook} />
                    ) : (
                      <li key={`gap-${i}`} className="series-gap" aria-label={`Number ${s.index}: not on your shelf`}>
                        <span>#{s.index}</span>
                        <span className="small-text">not on your shelf</span>
                      </li>
                    ),
                  )}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function SeriesCover({ book, index, onShowBook }: { book: Book; index?: number; onShowBook: (id: string) => void }) {
  const read = isRead(book)
  const reading = book.status === 'reading'
  const state = read ? 'read' : reading ? `reading, ${Math.round((book.progress ?? 0) * 100)}%` : 'not read yet'
  return (
    <li className={read || reading ? 'series-cover lit' : 'series-cover'}>
      <button type="button" className="cover-btn" onClick={() => onShowBook(book.id)} aria-label={`${index !== undefined ? `#${index} ` : ''}${book.title}: ${state}`} title={book.title}>
        <Cover book={book} />
      </button>
      {reading && (
        <span className="series-progress" aria-hidden>
          <span style={{ width: `${Math.round((book.progress ?? 0) * 100)}%` }} />
        </span>
      )}
      {index !== undefined && <span className="series-number small-text muted">#{index}</span>}
    </li>
  )
}
