import { useEffect, useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { challengeYears, yearTrophies } from '#/lib/trophies'
import type { Trophy } from '#/lib/trophies'
import { GoalCard } from './DashboardExtras'
import { useYearGoal } from './useYearGoal'
import { BingoCard } from './DashboardMore'
import { AlphabetCard } from './AlphabetCard'
import { ChallengeCard } from './ChallengeCard'
import { ArrangeGrid } from './ArrangeGrid'
import { useNarrow } from './Dashboard'
import { cleanTwoColumns, showIn } from '#/lib/twoColumns'
import type { TwoColumns } from '#/lib/twoColumns'

export type ChallengeSection = 'goal' | 'monthly' | 'bingo' | 'alphabet'

const CHALLENGE_IDS: readonly ChallengeSection[] = ['goal', 'monthly', 'bingo', 'alphabet']
const CHALLENGE_NAMES: Record<ChallengeSection, string> = {
  goal: 'Reading goal',
  monthly: 'Monthly challenge',
  bingo: 'Book bingo',
  alphabet: 'A–Z challenge',
}
const DEFAULT_ORDER: TwoColumns<ChallengeSection> = {
  columns: [
    ['goal', 'bingo'],
    ['monthly', 'alphabet'],
  ],
  hidden: [],
}

/** The Challenges page's arrangement, remembered on this device for this account. */
function useChallengeLayout(accountId: string | null) {
  const key = `hannas-reading-list:challenges-layout:${accountId ?? 'local'}`
  const [layout, setState] = useState<TwoColumns<ChallengeSection>>(() => {
    try {
      return cleanTwoColumns(JSON.parse(localStorage.getItem(key) ?? 'null'), CHALLENGE_IDS, DEFAULT_ORDER)
    } catch {
      return DEFAULT_ORDER
    }
  })
  const setLayout = (next: TwoColumns<ChallengeSection>) => {
    setState(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* storage blocked: it still holds for this visit */
    }
  }
  return [layout, setLayout] as const
}

interface Props {
  books: Book[]
  accountId: string | null
  onShowBook: (id: string) => void
  onUpdate: (id: string, patch: Partial<Book> | ((book: Book) => Partial<Book>)) => void
  /** the challenge to scroll to, from "Open ›" on the dashboard */
  focus?: ChallengeSection
}

/**
 * All challenges on one page, big and complete, with a year switch to look
 * back (the dashboard has a compact version of each, with "Open ›"). Earlier
 * years are shown, not changed.
 */
export function ChallengesPage({ books, accountId, onShowBook, onUpdate, focus }: Props) {
  const years = useMemo(() => challengeYears(books), [books])
  const thisYear = years[years.length - 1]
  const [year, setYear] = useState(thisYear)
  const [editing, setEditing] = useState(false)
  // the order of the challenges, which she arranges like the dashboard (per device)
  const [layout, setLayout] = useChallengeLayout(accountId)
  const [arranging, setArranging] = useState(false)
  const narrow = useNarrow()
  const goal = useYearGoal(accountId, year)
  const trophies = useMemo(() => yearTrophies(books, year, goal), [books, year, goal])
  const at = years.indexOf(year)

  // "Open ›" on the dashboard: scroll to that challenge
  useEffect(() => {
    if (focus) document.getElementById(`challenge-${focus}`)?.scrollIntoView({ block: 'start' })
  }, [focus])

  return (
    // the same scrolling layer over the shelf as the dashboard
    <div className="dashboard">
    <div className="challenges-page">
      <header className="challenges-head">
        <h1>Challenges</h1>
        <div className="period-pick" role="group" aria-label="Year">
          <button
            className="btn icon small"
            aria-label="Previous year"
            disabled={at <= 0}
            onClick={() => setYear(years[at - 1])}
          >
            ‹
          </button>
          <strong className="challenges-year">{year}</strong>
          <button
            className="btn icon small"
            aria-label="Next year"
            disabled={at >= years.length - 1}
            onClick={() => setYear(years[at + 1])}
          >
            ›
          </button>
        </div>
      </header>

      <Trophies trophies={trophies} year={year} />

      <div className={`dashboard-bar${arranging ? ' arranging' : ''}`}>
        {arranging ? (
          <>
            <div className="dashboard-bar-actions">
              <button className="btn small" onClick={() => setLayout(DEFAULT_ORDER)}>
                Reset
              </button>
              <button className="btn small primary" onClick={() => setArranging(false)}>
                Done
              </button>
            </div>
            {layout.hidden.length > 0 && (
              <div className="hidden-blocks">
                <span className="muted small-text">Hidden:</span>
                {layout.hidden.map((id) => (
                  <button key={id} className="btn small" onClick={() => setLayout(showIn(layout, id))}>
                    + {CHALLENGE_NAMES[id]}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <button className="btn small" onClick={() => setArranging(true)}>
            <span aria-hidden>⠿</span> Arrange
          </button>
        )}
      </div>
      <ArrangeGrid
        layout={layout}
        onLayout={setLayout}
        arranging={arranging}
        narrow={narrow}
        label={(id) => CHALLENGE_NAMES[id]}
        anchor={(id) => `challenge-${id}`}
        render={(id) =>
          id === 'goal' ? (
            <GoalCard key={`goal-${year}`} books={books} accountId={accountId} year={year} />
          ) : id === 'monthly' ? (
            <ChallengeCard
              key={`monthly-${year}`}
              books={books}
              onShowBook={onShowBook}
              onUpdate={onUpdate}
              editing={editing}
              onEditing={setEditing}
              year={year}
            />
          ) : id === 'bingo' ? (
            <BingoCard key={`bingo-${year}`} books={books} onUpdate={onUpdate} year={year} />
          ) : (
            <AlphabetCard key={`alphabet-${year}`} books={books} onShowBook={onShowBook} onUpdate={onUpdate} year={year} />
          )
        }
      />
    </div>
    </div>
  )
}

/** What she completed that year, one line per challenge. */
function Trophies({ trophies, year }: { trophies: Trophy[]; year: number }) {
  if (trophies.length === 0) return <p className="muted small-text">No challenges in {year} yet.</p>
  return (
    <ul className="trophies" aria-label={`Challenges in ${year}`}>
      {trophies.map((t) => (
        <li key={t.id} className={t.done ? 'trophy done' : 'trophy'}>
          <span aria-hidden>{t.done ? '🏆' : '·'}</span> {t.label}
        </li>
      ))}
    </ul>
  )
}
