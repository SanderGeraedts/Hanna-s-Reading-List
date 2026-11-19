import { useEffect, useMemo, useState } from 'react'
import type { Book } from '#/lib/library'
import { loadGoals } from '#/server/shelf'
import { challengeYears, yearTrophies } from '#/lib/trophies'
import type { Trophy } from '#/lib/trophies'
import { GoalCard, goalKey, readLocalGoal } from './DashboardExtras'
import { BingoCard } from './DashboardMore'
import { AlphabetCard } from './AlphabetCard'
import { ChallengeCard } from './ChallengeCard'

export type ChallengeSection = 'goal' | 'monthly' | 'bingo' | 'alphabet'

interface Props {
  books: Book[]
  accountId: string | null
  onShowBook: (id: string) => void
  onUpdate: (id: string, patch: Partial<Book> | ((book: Book) => Partial<Book>)) => void
  /** the challenge to scroll to, from "Open ›" on the dashboard */
  focus?: ChallengeSection
}

/** That year's reading goal: the copy in this browser, then the server's. */
function useYearGoal(accountId: string | null, year: number): number | null {
  const key = goalKey(accountId, year)
  const [goal, setGoal] = useState(() => readLocalGoal(key))
  useEffect(() => {
    setGoal(readLocalGoal(key))
    if (!accountId) return
    let live = true
    loadGoals()
      .then((goals) => {
        const remote = goals?.[String(year)]
        if (live && typeof remote === 'number') setGoal(remote)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [accountId, key, year])
  return goal
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

      <div className="challenges-grid">
        <div id="challenge-goal">
          <GoalCard key={`goal-${year}`} books={books} accountId={accountId} year={year} />
        </div>
        <div id="challenge-monthly">
          <ChallengeCard
            key={`monthly-${year}`}
            books={books}
            onShowBook={onShowBook}
            onUpdate={onUpdate}
            editing={editing}
            onEditing={setEditing}
            year={year}
          />
        </div>
        <div id="challenge-bingo">
          <BingoCard key={`bingo-${year}`} books={books} onUpdate={onUpdate} year={year} />
        </div>
        <div id="challenge-alphabet">
          <AlphabetCard key={`alphabet-${year}`} books={books} onShowBook={onShowBook} onUpdate={onUpdate} year={year} />
        </div>
      </div>
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
