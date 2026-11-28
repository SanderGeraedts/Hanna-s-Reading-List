import { useEffect, useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { breakdown } from '#/lib/insights'
import type { BreakdownKind } from '#/lib/insights'
import { readingYears } from '#/lib/stats'
import { compareChoices, compareLine, statsPeriod, yearNumbers } from '#/lib/yearCompare'
import type { StatsYear } from '#/lib/yearCompare'
import { CompareNote } from './CompareNote'
import { GoalCard, MonthlyChart, RecordsCard } from './DashboardExtras'
import { HeatmapCard } from './DashboardMore'
import { GenreFlowerCard, PagesPerMonthCard } from './PictureBlocks'
import { RhythmCard } from './NewBlocks'
import { WrappedCard } from './DashboardMore'
import { YearStory } from './YearStory'
import { AuthorsCard } from './DashboardMore'
import { OnThisDayCard, PileCard } from './DashboardExtras'
import { RatingsCard } from './Dashboard'
import { BooksWorldMapCard } from './PictureBlocks'
import { BadgesCard, CoverWallCard } from './NewBlocks'
import { TropesCard, tropesBlock } from './TropesCard'
import { useChallengeExtras } from './useChallengeExtras'

/**
 * The Stats page (T-0080, D-0060): everything about how much Hanna read, for
 * one year at a time, with another year's value beside each number.
 *
 * One year picker and one "compare with" picker at the top drive every block
 * below, so a chart never argues with its neighbour about which year it is
 * showing. The page is not arrangeable: she stars what she wants to keep an
 * eye on over on the dashboard.
 */

const BREAKDOWNS: Array<{ kind: BreakdownKind; label: string }> = [
  { kind: 'genre', label: 'Genres' },
  { kind: 'language', label: 'Languages' },
  { kind: 'format', label: 'Formats' },
]

interface Props {
  books: Book[]
  accountId: string | null
  onShowBook: (id: string) => void
  /** "Open ›" on the goal ring: the Challenges page, where the goal is set */
  onOpenGoal?: () => void
  /** opened from the 📍 line on the dashboard: scroll to the map (T-0128) */
  focusMap?: boolean
  onFocused?: () => void
}

export function StatsPage({ books, accountId, onShowBook, onOpenGoal, focusMap = false, onFocused }: Props) {
  useEffect(() => {
    if (!focusMap) return
    const el = document.getElementById('world-title')
    el?.scrollIntoView({ block: 'start' })
    el?.focus({ preventScroll: true })
    onFocused?.()
  }, [focusMap, onFocused])
  const years = useMemo(() => readingYears(books), [books])
  const [year, setYear] = useState<StatsYear>(years[0])
  const [compare, setCompare] = useState<number | null>(null)
  // the wrap-up story she opened with ▶ Play (T-0081); null: no story open
  const [storyYear, setStoryYear] = useState<number | null>(null)
  const others = compareChoices(years, year)
  // a compare year stays what she set it to, even when she then looks at that year itself
  const options = compare !== null && !others.includes(compare) ? [...others, compare].sort((a, b) => b - a) : others
  const against = year === 'all' || compare === null ? undefined : compare

  const numbers = useMemo(() => yearNumbers(books, year), [books, year])
  // the blocks that left the dashboard (T-0121): her books over all the years, one place only
  const badgeExtras = useChallengeExtras(accountId)
  const noTropes = useMemo(() => tropesBlock(books).empty, [books])
  const other = useMemo(() => (against === undefined ? null : yearNumbers(books, against)), [books, against])

  const rows: Array<{ key: string; value: string; label: string; now: number; then: number | undefined }> = [
    { key: 'books', value: numbers.books.toLocaleString('en-GB'), label: numbers.books === 1 ? 'book' : 'books', now: numbers.books, then: other?.books },
    { key: 'pages', value: numbers.pages.toLocaleString('en-GB'), label: 'pages in finished books', now: numbers.pages, then: other?.pages },
    { key: 'hours', value: numbers.hours.toLocaleString('en-GB'), label: 'hours listened', now: numbers.hours, then: other?.hours },
    {
      key: 'days',
      value: numbers.readingDays.toLocaleString('en-GB'),
      label: numbers.readingDays === 1 ? 'reading day' : 'reading days',
      now: numbers.readingDays,
      then: other?.readingDays,
    },
  ].filter((r) => r.now > 0 || (r.then ?? 0) > 0 || r.key === 'books')

  return (
    <div className="dashboard">
      {storyYear !== null && (
        <YearStory books={books} year={storyYear} onShowBook={onShowBook} onClose={() => setStoryYear(null)} />
      )}
      <div className="stats-page">
        <header className="challenges-head stats-head">
          <h1>Stats</h1>
          <div className="stats-pickers">
            <label className="stats-field">
              <span className="muted">Year</span>
              <select
                className="input"
                value={year === 'all' ? 'all' : String(year)}
                onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
                <option value="all">All time</option>
              </select>
            </label>
            <label className="stats-field">
              <span className="muted">Compare with</span>
              <select
                className="input"
                value={compare === null ? '' : String(compare)}
                disabled={year === 'all' || options.length === 0}
                onChange={(e) => setCompare(e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">—</option>
                {options.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <section className="dash-card stats-numbers-card" aria-labelledby="stats-numbers-title">
          <h2 id="stats-numbers-title">{year === 'all' ? 'All time in numbers' : `${year} in numbers`}</h2>
          <div className="stats-numbers" aria-live="polite">
            {numbers.books === 0 && numbers.readingDays === 0 ? (
              <p className="muted">
                {year === 'all' ? 'Nothing finished yet.' : `Nothing finished in ${year} yet.`}
              </p>
            ) : (
              rows.map((r) => {
                const line = compareLine(r.now, r.then, against)
                return (
                  <p key={r.key} className="stats-number">
                    <strong>{r.value}</strong>
                    <span className="muted">{r.label}</span>
                    {line && <CompareNote line={line} big />}
                  </p>
                )
              })
            )}
          </div>
        </section>

        <div className="stats-grid">
          <div className="dash-column">
            {year !== 'all' && <GoalCard books={books} accountId={accountId} year={year} onOpen={onOpenGoal} readOnly />}
            <HeatmapCard books={books} year={year === 'all' ? undefined : year} compareDays={other?.readingDays} compareYear={against} />
            {year !== 'all' && <MonthlyChart books={books} year={year} compare={against} />}
            <GenreFlowerCard books={books} year={year} compare={against} />
          </div>
          <div className="dash-column">
            {year !== 'all' && <PagesPerMonthCard books={books} year={year} compare={against} />}
            <RhythmCard books={books} year={year} />
            <StatsBreakdown books={books} year={year} compare={against} />
            <RecordsCard books={books} period={statsPeriod(year)} label={year === 'all' ? 'all time' : `in ${year}`} onShowBook={onShowBook} />
            <WrappedCard
              books={books}
              onShowBook={onShowBook}
              year={year === 'all' ? new Date().getFullYear() : year}
              onPlay={setStoryYear}
            />
          </div>
        </div>

        <h2 className="stats-section-title">Your books, all the years</h2>
        <div className="stats-grid">
          <div className="dash-column">
            <RatingsCard books={books} onShowBook={onShowBook} />
            <AuthorsCard books={books} />
            <PileCard books={books} />
            {!noTropes && <TropesCard books={books} onShowBook={onShowBook} />}
          </div>
          <div className="dash-column">
            <BadgesCard books={books} extras={badgeExtras} />
            <OnThisDayCard books={books} onShowBook={onShowBook} />
            <CoverWallCard books={books} onShowBook={onShowBook} />
            <BooksWorldMapCard books={books} onShowBook={onShowBook} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** "What I read" with the compare year's count beside each bar. */
function StatsBreakdown({ books, year, compare }: { books: Book[]; year: StatsYear; compare?: number }) {
  const [kind, setKind] = useState<BreakdownKind>('genre')
  const slices = useMemo(() => breakdown(books, statsPeriod(year), kind), [books, year, kind])
  const other = useMemo(
    () => (compare === undefined ? null : new Map(breakdown(books, statsPeriod(compare), kind, 99).map((s) => [s.label, s.count]))),
    [books, compare, kind],
  )
  const max = Math.max(1, ...slices.map((s) => s.count))
  const label = year === 'all' ? 'all time' : `in ${year}`
  return (
    <section className="dash-card" aria-labelledby="breakdown-title">
      <div className="dash-card-head">
        <h2 id="breakdown-title">What I read</h2>
        <div className="segmented" role="group" aria-label="Group by">
          {BREAKDOWNS.map((b) => (
            <button key={b.kind} className={kind === b.kind ? 'active' : ''} aria-pressed={kind === b.kind} onClick={() => setKind(b.kind)}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small-text">Books read {label}</p>
      {slices.length === 0 ? (
        <p className="muted">Nothing read {label} yet.</p>
      ) : (
        <ul className="hbars">
          {slices.map((s) => {
            const line = other && compare !== undefined ? compareLine(s.count, other.get(s.label) ?? 0, compare) : null
            return (
              <li key={s.label}>
                <span className="hbar-label">{s.label}</span>
                <span className="hbar-track">
                  <span className="hbar" style={{ width: `${(s.count / max) * 100}%` }} />
                </span>
                <span className="hbar-value">{s.count}</span>
                {line && <CompareNote line={line} />}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
