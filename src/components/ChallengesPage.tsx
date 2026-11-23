import { useEffect, useMemo, useRef, useState } from 'react'
import type { Book } from '#/lib/library'
import { challengeYears, yearTrophies } from '#/lib/trophies'
import type { Trophy } from '#/lib/trophies'
import { GoalCard } from './DashboardExtras'
import { useYearGoal } from './useYearGoal'
import { BingoCard } from './DashboardMore'
import { AlphabetCard } from './AlphabetCard'
import { ChallengeCard } from './ChallengeCard'
import { ArrangeGrid } from './ArrangeGrid'
import { useArrangeBarHeight } from './useArrangeBarHeight'
import { useNarrow } from './Dashboard'
import { cleanTwoColumns, showIn } from '#/lib/twoColumns'
import type { TwoColumns } from '#/lib/twoColumns'
import { NewChallengeForm, OwnChallengeCard, useOwnChallenges } from './OwnChallenges'
import { PILE_CHALLENGE } from '#/lib/ownChallenges'

export type ChallengeSection = 'goal' | 'monthly' | 'bingo' | 'alphabet'

const CHALLENGE_IDS: readonly ChallengeSection[] = ['goal', 'monthly', 'bingo', 'alphabet']
/** a block on the page: one of the fixed challenges, or one of her own ("own:<id>") */
type ChallengeId = ChallengeSection | `own:${string}`
const CHALLENGE_NAMES: Record<ChallengeSection, string> = {
  goal: 'Reading goal',
  monthly: 'Monthly challenge',
  bingo: 'Book bingo',
  alphabet: 'A–Z challenge',
}
const DEFAULT_ORDER: TwoColumns<ChallengeId> = {
  columns: [
    ['goal', 'bingo'],
    ['monthly', 'alphabet'],
  ],
  hidden: [],
}

/** The Challenges page's arrangement, remembered on this device for this account. */
function useChallengeLayout(accountId: string | null) {
  const key = `hannas-reading-list:challenges-layout:${accountId ?? 'local'}`
  // kept as saved; cleaned against the challenges shown when it is used
  const [layout, setState] = useState<unknown>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null')
    } catch {
      return null
    }
  })
  const setLayout = (next: TwoColumns<ChallengeId>) => {
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
  const [savedLayout, setLayout] = useChallengeLayout(accountId)
  const [own, setOwn] = useOwnChallenges(accountId)
  // the new-challenge form: empty, or filled in by the Pile challenge button (T-0014)
  const [adding, setAdding] = useState<false | 'new' | 'pile'>(false)
  const ownThisYear = useMemo(() => own.filter((c) => c.year === year), [own, year])
  const known = useMemo<ChallengeId[]>(() => [...CHALLENGE_IDS, ...ownThisYear.map((c) => `own:${c.id}` as const)], [ownThisYear])
  const layout = useMemo(() => cleanTwoColumns(savedLayout, known, DEFAULT_ORDER), [savedLayout, known])
  const nameOf = (id: ChallengeId) =>
    id.startsWith('own:') ? (ownThisYear.find((c) => `own:${c.id}` === id)?.name ?? 'Challenge') : CHALLENGE_NAMES[id as ChallengeSection]
  const [arranging, setArranging] = useState(false)
  const arrangeBar = useArrangeBarHeight()
  const narrow = useNarrow()
  const goal = useYearGoal(accountId, year)
  const trophies = useMemo(() => yearTrophies(books, year, goal), [books, year, goal])
  const at = years.indexOf(year)

  // "Open ›" on the dashboard: scroll to that challenge
  useEffect(() => {
    if (focus) document.getElementById(`challenge-${focus}`)?.scrollIntoView({ block: 'start' })
  }, [focus])

  /** A Hidden chip was restored (Enter): focus moves to the next chip or to the block's handle (T-0044, F7). */
  const pageRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<{ nextId: ChallengeId | null; blockId: ChallengeId } | null>(null)
  useEffect(() => {
    const r = restoreFocus.current
    if (!r) return
    restoreFocus.current = null
    const q = (sel: string) => pageRef.current?.querySelector<HTMLElement>(sel) ?? null
    const chip = r.nextId ? q(`.hidden-blocks [data-hidden="${CSS.escape(r.nextId)}"]`) : null
    if (chip) return chip.focus()
    q(`.dashboard-grid [data-block="${CSS.escape(r.blockId)}"] .block-handle`)?.focus()
  }, [layout])

  return (
    // the same scrolling layer over the shelf as the dashboard
    <div className="dashboard" ref={pageRef}>
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

      <div className={`dashboard-bar${arranging ? ' arranging' : ''}`} ref={arrangeBar}>
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
                {layout.hidden.map((id, i) => (
                  <button
                    key={id}
                    data-hidden={id}
                    className="btn small"
                    onClick={() => {
                      restoreFocus.current = { nextId: layout.hidden[i + 1] ?? null, blockId: id }
                      setLayout(showIn(layout, id))
                    }}
                  >
                    + {nameOf(id)}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="dashboard-bar-actions">
            {year === thisYear && (
              <>
                <button className="btn small tall" onClick={() => setAdding('new')} disabled={!!adding}>
                  ＋ New challenge
                </button>
                <button className="btn small tall" onClick={() => setAdding('pile')} disabled={!!adding}>
                  <span aria-hidden>📚</span> Pile challenge
                </button>
              </>
            )}
            <button className="btn small tall" onClick={() => setArranging(true)}>
              <span aria-hidden>⠿</span> Arrange
            </button>
          </div>
        )}
      </div>
      {adding && (
        <NewChallengeForm
          key={adding}
          books={books}
          year={year}
          preset={adding === 'pile' ? PILE_CHALLENGE : undefined}
          onSave={(c) => {
            setOwn([...own, c])
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      <ArrangeGrid
        layout={layout}
        onLayout={setLayout}
        arranging={arranging}
        narrow={narrow}
        label={nameOf}
        anchor={(id) => `challenge-${id}`}
        render={(id) =>
          id.startsWith('own:') ? (
            (() => {
              const c = ownThisYear.find((x) => `own:${x.id}` === id)
              return c ? (
                <OwnChallengeCard
                  challenge={c}
                  books={books}
                  onShowBook={onShowBook}
                  editable={year === thisYear}
                  onChange={(next) => setOwn(own.map((x) => (x.id === c.id ? next : x)))}
                  onDelete={() => setOwn(own.filter((x) => x.id !== c.id))}
                />
              ) : null
            })()
          ) : id === 'goal' ? (
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
            <BingoCard key={`bingo-${year}`} books={books} onUpdate={onUpdate} year={year} onShowBook={onShowBook} />
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
