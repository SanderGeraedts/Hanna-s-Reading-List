import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { formatDuration } from '#/lib/listening'
import { amountText } from '#/lib/readingLog'
import { cleanSpice, ratingText } from '#/lib/ratings'
import { readingYears } from '#/lib/stats'
import { medalLine, yearMedals } from '#/lib/medals'
import {
  favouriteAuthors,
  finishEstimates,
  heatmap,
  reviewYear,
  spiceStats,
  yearReview,
} from '#/lib/insightsMore'
import type { HeatDay } from '#/lib/insightsMore'
import { SQUARES, SQUARE_IDS, bingoLines, bingoYear, rememberCard } from '#/lib/bingo'
import type { BingoSwaps } from '#/lib/bingoSwap'
import { drawSuggestion, suggestible, suggestionPool } from '#/lib/bingoSuggest'
import { StarRating } from './StarRating'
import { ShareButton } from './ShareButton'
import { OpenLink } from './OpenLink'
import { BookLine } from './DashboardExtras'
import { Cover, PeriodSelect, PeriodTabs, monthName, periodLabel, toPeriod } from './Dashboard'
import type { PeriodPick, Props } from './Dashboard'

/** More for the dashboard: pace, heatmap, authors, spice, year in review and bingo. */

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`

/** "12 Nov", or with the weekday: "Thu 12 Nov". */
const dayText = (day: string, weekday = false) =>
  new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(weekday && { weekday: 'short' }),
  })

const hours = (minutes: number) => {
  const h = minutes / 60
  return h >= 10 ? `${Math.round(h)} h` : `${h.toFixed(1).replace(/\.0$/, '')} h`
}

/** A year to look at: the years with something finished, and this one. */
function YearSelect({ books, year, onYear }: { books: Book[]; year: number; onYear: (y: number) => void }) {
  const years = useMemo(() => readingYears(books), [books])
  return (
    <select className="input year-select" value={year} onChange={(e) => onYear(Number(e.target.value))} aria-label="Year">
      {(years.includes(year) ? years : [...years, year].sort((a, b) => b - a)).map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  )
}

// ---- finish-by estimate ------------------------------------------------------------

export function PaceCard({ books, onShowBook }: Props) {
  const estimates = useMemo(() => finishEstimates(books), [books])
  return (
    <section className="dash-card" aria-labelledby="pace-title">
      <h2 id="pace-title">Finish by</h2>
      {estimates.length === 0 ? (
        <p className="muted">Nothing on the go right now.</p>
      ) : (
        <ul className="book-list">
          {estimates.map((e) => (
            <BookLine key={e.book.id} book={e.book} onShowBook={onShowBook}>
              {e.known ? (
                <>
                  <span className="pace-when">
                    {e.daysAway === 0 ? 'Today' : e.daysAway === 1 ? 'Tomorrow' : `Around ${dayText(e.day, e.daysAway < 7)}`}
                  </span>
                  {e.perReadingDay > 0 && (
                    <span className="muted small-text">
                      at about {amountText(e.book, e.perReadingDay)} a day, reading {e.readingDays} of the last{' '}
                      {plural(e.days, 'day')}
                    </span>
                  )}
                </>
              ) : (
                <span className="muted small-text">
                  Read a little more over the next few days and this guesses when you'll finish.
                </span>
              )}
            </BookLine>
          ))}
        </ul>
      )}
    </section>
  )
}

// ---- heatmap ------------------------------------------------------------------------

const CELL = 11
const GAP = 2
const STEP = CELL + GAP
const LEFT = 26
const TOP = 14

function heatTitle(d: HeatDay) {
  if (d.books === 0) return `${dayText(d.day, true)}: nothing read`
  const parts = [d.pages > 0 && plural(d.pages, 'page'), d.minutes > 0 && formatDuration(d.minutes)].filter(Boolean)
  const what = parts.length ? parts.join(' and ') : `${Math.round(d.share * 100)}% of a book`
  return `${dayText(d.day, true)}: ${what}${d.books > 1 ? ` in ${d.books} books` : ''}`
}

export function HeatmapCard({ books }: { books: Book[] }) {
  const h = useMemo(() => heatmap(books), [books])
  const scroller = useRef<HTMLDivElement>(null)
  // the newest weeks are on the right: start there
  useLayoutEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [h.weeks.length])
  const W = LEFT + h.weeks.length * STEP
  const H = TOP + 7 * STEP
  const summary = [
    h.pages > 0 && `${h.pages.toLocaleString('en-GB')} pages`,
    h.minutes > 0 && `${formatDuration(h.minutes)} listened`,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <section className="dash-card" aria-labelledby="heatmap-title">
      <div className="dash-card-head">
        <h2 id="heatmap-title">A year of reading</h2>
        <span className="muted small-text">{plural(h.readingDays, 'reading day')}</span>
      </div>
      <div className="heatmap-scroll" ref={scroller}>
        <svg
          className="heatmap"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Reading days over the last twelve months: ${plural(h.readingDays, 'day')} with reading${summary ? `, ${summary}` : ''}.`}
        >
          {h.months.map((m) => (
            <text key={`${m.column}-${m.month}`} className="axis" x={LEFT + m.column * STEP} y={9}>
              {monthName(m.month, 'short')}
            </text>
          ))}
          {['Mon', 'Wed', 'Fri'].map((d, i) => (
            <text key={d} className="axis" x={0} y={TOP + (i * 2) * STEP + CELL - 2}>
              {d}
            </text>
          ))}
          {h.weeks.map((week, c) =>
            week.map(
              (d, r) =>
                d && (
                  <rect
                    key={d.day}
                    className={`heat l${d.level}`}
                    x={LEFT + c * STEP}
                    y={TOP + r * STEP}
                    width={CELL}
                    height={CELL}
                    rx={2}
                  >
                    <title>{heatTitle(d)}</title>
                  </rect>
                ),
            ),
          )}
        </svg>
      </div>
      <div className="heat-legend muted small-text" aria-hidden>
        <span>{summary || 'Move a book on to fill this in.'}</span>
        <span className="heat-scale">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <svg key={l} width={CELL} height={CELL}>
              <rect className={`heat l${l}`} width={CELL} height={CELL} rx={2} />
            </svg>
          ))}
          More
        </span>
      </div>
    </section>
  )
}

// ---- favourite authors -----------------------------------------------------------

export function AuthorsCard({ books }: { books: Book[] }) {
  const authors = useMemo(() => favouriteAuthors(books), [books])
  return (
    <section className="dash-card" aria-labelledby="authors-title">
      <h2 id="authors-title">Favourite authors</h2>
      {authors.length === 0 ? (
        <p className="muted">Finish a book and its author shows up here.</p>
      ) : (
        <ol className="top-list">
          {authors.map((a, i) => (
            <li key={a.name}>
              <span className="top-place">{i + 1}</span>
              <span className="top-info">
                <span>{a.name}</span>
                <span className="top-ratings muted small-text">
                  {plural(a.books, 'book')}
                  {a.rating !== undefined && (
                    <span title={`On average ${ratingText(Math.round(a.rating * 2) / 2)}`}>
                      <StarRating value={Math.round(a.rating * 2) / 2} size="small" />
                    </span>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// ---- spice meter -----------------------------------------------------------------

export function SpiceCard({ books, onShowBook, switcher }: Props & { switcher?: React.ReactNode }) {
  const now = new Date()
  const [pick, setPick] = useState<PeriodPick>({ kind: 'year', year: now.getFullYear(), month: now.getMonth() + 1 })
  const s = useMemo(() => spiceStats(books, toPeriod(pick)), [books, pick])
  const label = periodLabel(pick)
  return (
    <section className="dash-card" aria-labelledby="spice-title">
      <div className="dash-card-head">
        <h2 id="spice-title">{switcher ? 'My ratings' : 'Spice meter'}</h2>
        {switcher}
        <PeriodTabs pick={pick} onPick={setPick} />
      </div>
      <PeriodSelect books={books} pick={pick} onPick={setPick} />
      {s.average === undefined ? (
        <p className="muted small-text">
          {s.read === 0
            ? `Nothing read ${label} yet.`
            : 'Give finished books a spice level (🌶️ or No spice in the book panel) to see how hot your reading runs.'}
        </p>
      ) : (
        <>
          <div className="spice-meter">
            <span className="big-number">
              <strong>{s.average.toFixed(1)}</strong> <span className="muted">of 5</span>
            </span>
            <span
              className="spice-track"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={Math.round(s.average * 10) / 10}
              aria-label={`Average spice ${label}`}
            >
              <span className="spice-fill" style={{ width: `${(s.average / 5) * 100}%` }} />
            </span>
          </div>
          <p className="muted small-text">
            Average of {plural(s.rated, 'book')} with spice scored, read {label}
          </p>
          <ul className="book-list">
            {s.spiciest.map((b) => (
              <BookLine key={b.id} book={b} onShowBook={onShowBook}>
                <StarRating kind="spice" value={cleanSpice(b.spice)} size="small" />
              </BookLine>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

// ---- year in review ----------------------------------------------------------------

export function WrappedCard({ books, onShowBook }: Props) {
  const [year, setYear] = useState(() => reviewYear())
  const r = useMemo(() => yearReview(books, year), [books, year])
  // medals won this year: a book's for each finish, a series' when its last book needed is finished
  const medals = useMemo(() => {
    const m = yearMedals(books, year)
    return [
      ['Medals', medalLine(m.books)],
      ['Series medals', medalLine(m.series)],
    ].filter(([, line]) => line)
  }, [books, year])
  const bookBtn = (b: Book) => (
    <button className="link-btn" onClick={() => onShowBook(b.id)}>
      {b.title}
    </button>
  )
  const facts: Array<[string, React.ReactNode]> = []
  if (r.topRated) facts.push(['Top-rated', bookBtn(r.topRated)])
  if (r.spiciest) facts.push(['Spiciest', bookBtn(r.spiciest)])
  if (r.genre) facts.push(['Favourite genre', r.genre])
  if (r.busiest)
    facts.push(['Busiest month', `${monthName(r.busiest.month)} (${plural(r.busiest.books, 'book')})`])
  if (r.streak > 1) facts.push(['Longest streak', plural(r.streak, 'day')])
  if (r.bingoCards > 0) facts.push(['Bingo cards', `${r.bingoCards} full 🎉`])
  return (
    <section className="dash-card wrapped-card" aria-labelledby="wrapped-title">
      <div className="dash-card-head">
        <h2 id="wrapped-title">
          <span aria-hidden>✨ </span>
          {year} in books
        </h2>
        <YearSelect books={books} year={year} onYear={setYear} />
      </div>
      {r.books === 0 ? (
        <p className="muted">No books finished in {year} yet. The year's story starts with the first one.</p>
      ) : (
        <>
          <p className="story-line">Once upon a time…</p>
          <div className="wrapped-numbers">
            <p>
              <strong>{r.books}</strong>
              <span>{r.books === 1 ? 'book' : 'books'}</span>
            </p>
            {r.pages > 0 && (
              <p>
                <strong>{r.pages.toLocaleString('en-GB')}</strong>
                <span>pages</span>
              </p>
            )}
            {r.minutes > 0 && (
              <p>
                <strong>{hours(r.minutes).replace(' h', '')}</strong>
                <span>hours listened</span>
              </p>
            )}
          </div>
          {r.topRated && (
            <div className="wrapped-top">
              <button className="cover-btn" aria-label={r.topRated.title} onClick={() => onShowBook(r.topRated!.id)}>
                <Cover book={r.topRated} />
              </button>
              <div>
                <p className="muted small-text">Book of the year</p>
                <p className="next-title">{r.topRated.title}</p>
                <StarRating value={r.topRated.rating} size="small" />
              </div>
            </div>
          )}
          {facts.length > 0 && (
            <dl className="records">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {medals.length > 0 && (
            <dl className="records">
              {medals.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="story-line end">
            {year < new Date().getFullYear() ? '…and she read happily ever after.' : '…and the story continues.'}
          </p>
        </>
      )}
    </section>
  )
}

// ---- book bingo ----------------------------------------------------------------------

export function BingoCard({
  books,
  onUpdate,
  year: forYear,
  compact = false,
  onOpen,
  onShowBook,
  swaps,
  onSwap,
}: {
  books: Book[]
  onUpdate: (id: string, patch: (book: Book) => Partial<Book>) => void
  /** another year than this one, on the Challenges page */
  year?: number
  /** on the dashboard: just the card being played, no share */
  compact?: boolean
  onOpen?: () => void
  /** opens a suggested book in the book panel (T-0017) */
  onShowBook?: (id: string) => void
  /** her own swaps (D-0063): the card is drawn with them everywhere */
  swaps?: BingoSwaps
  /** saves a swap; without it (the dashboard) no Swap is offered */
  onSwap?: (slot: number, square: string) => void
}) {
  const thisYear = new Date().getFullYear()
  const year = forYear ?? thisYear
  const b = useMemo(() => bingoYear(books, year, undefined, swaps), [books, year, swaps])
  // suggestions for the empty squares of the card being played (T-0017)
  const playing = year === thisYear
  const suggestId = useId()
  const [chosen, setChosen] = useState<string | null>(null)
  const [shown, setShown] = useState<string[]>([])
  const [focusTick, setFocusTick] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const squareRefs = useRef(new Map<string, HTMLButtonElement>())
  const chosenSquare = chosen ? b.squares.find((s) => s.id === chosen && !s.ticked) : undefined
  const pool = useMemo(() => (chosen ? suggestionPool(chosen, books, year) : null), [chosen, books, year])
  const currentId = shown.at(-1)
  const suggested = pool?.find((c) => c.book.id === currentId)?.book
  const open = (id: string) => {
    setChosen(id)
    setSwapping(false)
    setShown(drawSuggestion(suggestionPool(id, books, year) ?? [])?.shown ?? [])
    setFocusTick((n) => n + 1)
  }
  // her own swap (D-0063): only on the card being played, while nothing is ticked
  const [swapping, setSwapping] = useState(false)
  const canSwap = playing && !!onSwap && b.squares.every((s) => !s.ticked)
  const close = (toSquare: boolean) => {
    const id = chosen
    setChosen(null)
    setShown([])
    setSwapping(false)
    if (toSquare && id) squareRefs.current.get(id)?.focus()
  }
  const another = () => {
    const next = pool && drawSuggestion(pool, shown)
    if (next) setShown(next.shown)
  }
  // focus moves to the card's heading when it opens or switches square
  useEffect(() => {
    if (!focusTick) return
    const h = headingRef.current
    if (!h) return
    h.focus({ preventScroll: true })
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    h.closest('.bingo-suggest')?.scrollIntoView?.({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [focusTick])
  // the shelf changed under an open card: the square ticked (or the card moved on) closes it;
  // a book that no longer fits makes room for another one
  useEffect(() => {
    if (!chosen) return
    if (!chosenSquare) {
      const inside = !!document.activeElement && !!document.querySelector(`[id="${suggestId}"]`)?.contains(document.activeElement)
      setChosen(null)
      setShown([])
      if (inside) document.getElementById('bingo-title')?.focus()
      return
    }
    if (pool && pool.length && !suggested) setShown((s) => drawSuggestion(pool, s)?.shown ?? [])
  }, [chosen, chosenSquare, pool, suggested, suggestId])
  // a card just found full is remembered on the book that filled it, so it stays full (#119)
  useEffect(() => {
    if (year !== thisYear) return
    for (const { bookId, card } of b.toRemember) onUpdate(bookId, (book) => rememberCard(book, card))
  }, [b.toRemember, onUpdate, year, thisYear])
  const byId = useMemo(() => new Map(books.map((x) => [x.id, x])), [books])
  const ticked = b.squares.map((s) => s.ticked)
  const done = ticked.filter(Boolean).length
  const lines = bingoLines(ticked)
  const full = b.finished.length
  const title = `Book bingo ${year}${b.card > 1 ? ` · card ${b.card}` : ''}`
  // a picture for friends (#153): the card, with the covers of the books that ticked it
  const share = () => ({
    title,
    subtitle: `${done} of ${b.squares.length}${lines > 0 ? ` · ${lines === 1 ? 'Bingo!' : `${lines} bingos!`}` : ''}${
      full > 0 ? ` · ${full === 1 ? '1 full card' : `${full} full cards`}` : ''
    }`,
    columns: 4,
    aspect: 1,
    tiles: b.squares.map((s) => ({
      label: '',
      caption: s.label,
      cover: s.book?.coverUrl,
      color: s.book?.color,
      on: s.ticked,
    })),
  })
  return (
    <section
      className="dash-card"
      aria-labelledby="bingo-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && chosen) {
          e.stopPropagation()
          close(true)
        }
      }}
    >
      <div className="dash-card-head">
        <h2 id="bingo-title" tabIndex={-1}>
          Book bingo {year}
          {b.card > 1 && <span className="muted"> · card {b.card}</span>}
        </h2>
        <span className="muted small-text">
          {done} of {b.squares.length}
          {lines > 0 && ` · ${lines === 1 ? 'Bingo!' : `${lines} bingos!`} 🎉`}
        </span>
        <OpenLink onOpen={onOpen} label="Book bingo" />
      </div>
      {full > 0 && (
        <p className="small-text bingo-full">
          {full === 1 ? '1 full card' : `${full} full cards`} this year 🎉
        </p>
      )}
      <div className="bingo" role="group" aria-label={`Book bingo ${year}, card ${b.card}`}>
        {b.squares.map((s) => {
          const how = s.ticked ? (s.book ? `Done: ${s.book.title}` : 'Done') : 'Ticks itself when a finished book fits'
          // an empty square of the card being played suggests a book from her pile (T-0017),
          // and on an untouched card it can be swapped for another one (T-0093, D-0063)
          if (playing && !s.ticked && (suggestible(s.id) || canSwap)) {
            const isChosen = chosen === s.id
            return (
              <button
                key={s.id}
                type="button"
                ref={(el) => {
                  if (el) squareRefs.current.set(s.id, el)
                  else squareRefs.current.delete(s.id)
                }}
                className={`bingo-square tappable${isChosen ? ' chosen' : ''}`}
                title={suggestible(s.id) ? 'Suggest a book' : 'Swap this square'}
                aria-label={`${s.label}, ${suggestible(s.id) ? 'suggest a book' : 'swap this square'}`}
                aria-expanded={isChosen}
                aria-controls={isChosen ? suggestId : undefined}
                onClick={() => (isChosen ? close(false) : open(s.id))}
              >
                <span className="bingo-label">{s.label}</span>
              </button>
            )
          }
          return (
            <div
              key={s.id}
              className={`bingo-square${s.ticked ? ' on auto' : ''}`}
              role="img"
              title={how}
              aria-label={`${s.label}. ${how}`}
            >
              {s.book ? (
                <span className="bingo-cover" aria-hidden>
                  <Cover book={s.book} small />
                </span>
              ) : (
                s.ticked && (
                  <span className="bingo-tick" aria-hidden>
                    ✓
                  </span>
                )
              )}
              <span className="bingo-label">{s.label}</span>
            </div>
          )
        })}
      </div>
      {chosenSquare && (
        <section className="bingo-suggest" id={suggestId} aria-labelledby={`${suggestId}-title`}>
          <div className="bingo-suggest-top">
            <h3 id={`${suggestId}-title`} ref={headingRef} tabIndex={-1}>
              {chosenSquare.label}
            </h3>
          </div>
          {swapping ? (
            <div className="bingo-swap">
              <p className="muted small-text" id={`${suggestId}-swap`}>
                Pick another square
              </p>
              <div className="bingo-swap-list" role="group" aria-label="Pick another square">
                {SQUARE_IDS.filter((id) => !b.squares.some((s) => s.id === id)).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="btn small"
                    onClick={() => {
                      const slot = b.squares.findIndex((s) => s.id === chosenSquare.id)
                      if (slot >= 0) onSwap?.(slot, id)
                      close(true)
                    }}
                  >
                    {SQUARES[id]?.label ?? id}
                  </button>
                ))}
              </div>
              <button type="button" className="btn small" onClick={() => setSwapping(false)}>
                Cancel
              </button>
            </div>
          ) : suggested ? (
            <div className="next-book">
              <Cover book={suggested} />
              <div>
                <div aria-live="polite" aria-atomic="true">
                  <p className="next-title bingo-suggest-title">{suggested.title}</p>
                  {suggested.authors.length > 0 && <p className="muted">{suggested.authors.join(', ')}</p>}
                </div>
                <div className="next-actions bingo-suggest-actions">
                  <button
                    type="button"
                    className="btn primary"
                    aria-label={`Open ${suggested.title}`}
                    onClick={() => onShowBook?.(suggested.id)}
                  >
                    Open
                  </button>
                  {(pool?.length ?? 0) > 1 && (
                    <button
                      type="button"
                      className="btn"
                      aria-label={`Another book for ${chosenSquare.label}`}
                      onClick={another}
                    >
                      <span aria-hidden>🎲</span> Another one
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="muted">No book on your shelf fits this one yet.</p>
          )}
          {canSwap && !swapping && (
            <button
              type="button"
              className="btn small bingo-swap-start"
              aria-label="Swap this square"
              aria-expanded={false}
              aria-controls={suggestId}
              onClick={() => setSwapping(true)}
            >
              <span aria-hidden>⇄</span> Swap
            </button>
          )}
          {/* last in tab order (after Open and Another one), drawn top right */}
          <button type="button" className="btn icon small bingo-suggest-close" aria-label="Close" onClick={() => close(true)}>
            ×
          </button>
        </section>
      )}
      {!compact && b.finished.length > 0 && (
        <div className="bingo-history">
          <h3 className="waiting-subtitle">Full cards in {year}</h3>
          <div className="bingo-history-cards">
            {b.finished.map((card) => (
              <div key={card.card} className="bingo-mini" role="group" aria-label={`Card ${card.card}, full`}>
                <p className="small-text muted">Card {card.card} ✓</p>
                <div className="bingo">
                  {card.squares.map((id) => {
                    const book = card.ticks[id] ? byId.get(card.ticks[id]) : undefined
                    const label = SQUARES[id]?.label ?? id
                    return (
                      <div
                        key={id}
                        className="bingo-square on auto"
                        role="img"
                        title={book ? `${label}: ${book.title}` : label}
                        aria-label={book ? `${label}: ${book.title}` : label}
                      >
                        {book ? (
                          <span className="bingo-cover" aria-hidden>
                            <Cover book={book} small />
                          </span>
                        ) : (
                          <span className="bingo-tick" aria-hidden>
                            ✓
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
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
