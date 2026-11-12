import { useEffect, useMemo, useState } from 'react'
import type { Book, NewBook } from '#/lib/library'
import { localDay } from '#/lib/library'
import { notOnShelf, seriesOnShelf } from '#/lib/seriesGaps'
import type { SeriesBook, SeriesOnShelf } from '#/lib/seriesGaps'
import { findOnOpenLibrary } from '#/lib/storytelImport'
import { colorFromString } from '#/lib/cover'
import { releaseDayText } from '#/lib/upcoming'
import { getWorkDetails } from '#/server/openLibrary'
import { findSeriesBooks, seriesBooksAvailable } from '#/server/seriesBooks'
import { buildBook } from './AddBookDialog'

interface Props {
  /** the books on the shelf */
  books: Book[]
  /** books not out yet, so they aren't offered twice */
  upcoming: Book[]
  onAdd: (book: NewBook) => void
}

let available: Promise<boolean> | null = null

const numberText = (n: number) => String(n).replace('.5', '½')
const list = (ns: number[]) => ns.map(numberText).join(', ')

/**
 * Complete your series: for every series on the shelf, which books are
 * missing. Gaps show straight away; "Find the rest" looks up the whole
 * series, so the books after her last one, and ones not out yet, can be
 * added in a tap. A book not out yet goes to Upcoming releases (#103).
 */
export function CompleteSeriesCard({ books, upcoming, onAdd }: Props) {
  const series = useMemo(() => seriesOnShelf(books), [books])
  const [ai, setAi] = useState(false)
  const [all, setAll] = useState(false)
  useEffect(() => {
    available ??= seriesBooksAvailable().catch(() => false)
    let live = true
    available.then((ok) => live && setAi(ok))
    return () => {
      live = false
    }
  }, [])

  const shown = all ? series : series.slice(0, 6)
  return (
    <section className="dash-card complete-card" aria-labelledby="complete-title">
      <h2 id="complete-title">Complete your series</h2>
      {series.length === 0 && <p className="muted small-text">No series on the shelf yet.</p>}
      <ul className="complete-list">
        {shown.map((s) => (
          <SeriesLine key={s.key} s={s} ai={ai} shelf={[...books, ...upcoming]} onAdd={onAdd} />
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

function SeriesLine({ s, ai, shelf, onAdd }: { s: SeriesOnShelf; ai: boolean; shelf: Book[]; onAdd: Props['onAdd'] }) {
  const [found, setFound] = useState<SeriesBook[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  const find = async () => {
    setBusy(true)
    setError(null)
    try {
      const have = s.books.map((b) => b.title)
      setFound(await findSeriesBooks({ data: { series: s.name, author: s.author, have } }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const missing = found ? notOnShelf(found, s, shelf).filter((b) => !added.has(b.title)) : []
  const add = async (b: SeriesBook) => {
    setAdded((prev) => new Set(prev).add(b.title))
    const author = s.author ? [s.author] : []
    const today = localDay()
    const extra: Partial<NewBook> = {
      series: s.name,
      ...(b.number !== undefined && { seriesIndex: b.number }),
      status: 'want',
      ...(b.releaseDate && b.releaseDate > today && { releaseDate: b.releaseDate }),
    }
    const match = await findOnOpenLibrary({ title: b.title, authors: author })
    if (match) {
      const details = match.workKey
        ? await getWorkDetails({ data: { workKey: match.workKey } }).catch(() => undefined)
        : undefined
      onAdd({ ...(await buildBook(match, details)), ...extra })
    } else {
      onAdd({ title: b.title, authors: author, year: b.year, color: colorFromString(b.title), ...extra })
    }
  }

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
        {ai && found === null && (
          <button className="link-btn find-rest" onClick={find} disabled={busy}>
            {busy ? 'Looking…' : 'Find the rest'}
          </button>
        )}
      </p>
      {error && <p className="error small-text">{error}</p>}
      {found && missing.length === 0 && (
        <p className="muted small-text">{found.length ? 'Complete! 🎉 You have every book.' : "Couldn't find this series."}</p>
      )}
      {missing.length > 0 && (
        <ul className="complete-missing">
          {missing.map((b) => (
            <li key={`${b.number}-${b.title}`}>
              <span>
                {b.number !== undefined && <span className="muted">{numberText(b.number)}. </span>}
                {b.title}
                {b.releaseDate ? (
                  <span className="muted small-text"> · out {releaseDayText(b.releaseDate)}</span>
                ) : b.year ? (
                  <span className="muted small-text"> · {b.year}</span>
                ) : null}
              </span>
              <button className="btn small" onClick={() => add(b)}>
                {b.releaseDate ? '+ Upcoming' : '+ Add'}
              </button>
            </li>
          ))}
          {missing.length > 1 && (
            <li>
              <span />
              <button className="btn small" onClick={() => missing.forEach(add)}>
                Add all {missing.length}
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  )
}
