import { useMemo, useState } from 'react'
import type { Book, NewBook } from '#/lib/library'
import { moreByAuthor, seriesOnShelf } from '#/lib/seriesGaps'
import type { SeriesOnShelf } from '#/lib/seriesGaps'
import { coverUrlForId } from '#/lib/cover'
import { browseBooks, getWorkDetails } from '#/server/openLibrary'
import type { SearchResult } from '#/server/openLibrary'
import { buildBook } from './AddBookDialog'

interface Props {
  /** the books on the shelf */
  books: Book[]
  /** books not out yet, so they aren't offered twice */
  upcoming: Book[]
  onAdd: (book: NewBook) => void
}

const numberText = (n: number) => String(n).replace('.5', '½')
const list = (ns: number[]) => ns.map(numberText).join(', ')

/**
 * Complete your series: for every series on the shelf, which books are
 * missing. Gaps in the numbers show straight away. "Find the rest" lists the
 * author's other books from Open Library, those that look like the series
 * first, so she can add the ones that belong in a tap. A book with a
 * publication date still to come goes to Upcoming releases.
 */
export function CompleteSeriesCard({ books, upcoming, onAdd }: Props) {
  const series = useMemo(() => seriesOnShelf(books), [books])
  const [all, setAll] = useState(false)
  const shown = all ? series : series.slice(0, 6)
  return (
    <section className="dash-card complete-card" aria-labelledby="complete-title">
      <h2 id="complete-title">Complete your series</h2>
      {series.length === 0 && <p className="muted small-text">No series on the shelf yet.</p>}
      <ul className="complete-list">
        {shown.map((s) => (
          <SeriesLine key={s.key} s={s} shelf={[...books, ...upcoming]} onAdd={onAdd} />
        ))}
      </ul>
      {series.length > 6 && (
        <button className="btn small" onClick={() => setAll(!all)}>
          {all ? 'Fewer' : `All ${series.length} series`}
        </button>
      )}
    </section>
  )
}

function SeriesLine({ s, shelf, onAdd }: { s: SeriesOnShelf; shelf: Book[]; onAdd: Props['onAdd'] }) {
  const [found, setFound] = useState<SearchResult[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  const find = async () => {
    setBusy(true)
    setError(null)
    try {
      setFound(moreByAuthor(await browseBooks({ data: { author: s.author } }), s, shelf))
    } catch {
      setError('Open Library could not be reached. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const add = async (r: SearchResult) => {
    setAdded((prev) => new Set(prev).add(r.workKey))
    const details = r.workKey ? await getWorkDetails({ data: { workKey: r.workKey } }).catch(() => undefined) : undefined
    onAdd({ ...(await buildBook(r, details)), series: s.name, status: 'want' })
  }
  const left = (found ?? []).filter((r) => !added.has(r.workKey))

  return (
    <li>
      <div className="series-line">
        <span className="series-name">{s.name}</span>
        <span className="muted small-text">
          {s.books.length} {s.books.length === 1 ? 'book' : 'books'}
        </span>
      </div>
      <p className="small-text complete-gap">
        {s.missing.length > 0 ? (
          <>
            Missing {s.missing.length === 1 ? 'book' : 'books'} <strong>{list(s.missing)}</strong>
          </>
        ) : s.numbers.length > 0 ? (
          <span className="muted">You have {list(s.numbers)}</span>
        ) : (
          <span className="muted">Numbers not known</span>
        )}
        {s.author && found === null && (
          <button className="link-btn find-rest" onClick={find} disabled={busy}>
            {busy ? 'Looking…' : 'Find the rest'}
          </button>
        )}
      </p>
      {error && <p className="error small-text">{error}</p>}
      {found && left.length === 0 && <p className="muted small-text">No other books by {s.author} found.</p>}
      {left.length > 0 && (
        <>
          <p className="muted small-text">More by {s.author}: add the ones that belong to this series.</p>
          <ul className="complete-missing">
            {left.map((r) => (
              <li key={r.workKey}>
                <span className="complete-book">
                  {r.coverId && <img className="dash-cover tiny" src={coverUrlForId(r.coverId, 'S')} alt="" loading="lazy" />}
                  <span>
                    {r.title}
                    {r.year ? <span className="muted small-text"> · {r.year}</span> : null}
                  </span>
                </span>
                <button className="btn small" onClick={() => add(r)}>
                  + Add
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </li>
  )
}
