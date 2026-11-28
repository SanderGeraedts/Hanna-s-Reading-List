import { useEffect, useMemo, useRef, useState } from 'react'
import { Cover, PILE, WEEKDAYS, dayPile, mark, monthName, useNarrow } from './common'
import type { Book, NewBook } from '#/lib/library'
import { localDay } from '#/lib/library'
import {
  BookLine,
  CurrentlyReadingCard,
  LentCard,
  FactCard,
  OnThisDayCard,
  PileCard,
  RecentCard,
  SeriesCard,
  dayStory,
} from './DashboardExtras'
import { AuthorsCard, BingoCard, PaceCard, SpiceCard, WrappedCard } from './DashboardMore'
import { MyYearCard } from './MyYearCard'
import { YearStory } from './YearStory'
import { pickReadNext, readNextChoices } from '#/lib/readNext'
import { pendingRatings } from '#/lib/ratingAsk'
import { seriesQuestions } from '#/lib/sleepSeries'
import { WaitingCard } from './WaitingCard'
import { BooksWorldMapCard } from './PictureBlocks'
import { WrapUpCard } from './WrapUpCard'
import { wrapKey, wrapUpDue } from '#/lib/wrapup'
import { cleanDustOff, dustOffDismiss, dustOffPick, dustOffSeen, waitedText, weekOf } from '#/lib/pile'
import type { DustOffState } from '#/lib/pile'
import { AgainCard } from './AgainCard'
import { AlphabetCard } from './AlphabetCard'
import { NewForYouCard } from './NewForYouCard'
import { storytelLink } from '#/lib/storytelLink'
import { OpenLink } from './OpenLink'
import type { ChallengeSection } from './ChallengesPage'
import { topRated } from '#/lib/ratings'
import { StarRating } from './StarRating'
import { monthWeeks, readingYears } from '#/lib/stats'
import { amountText, amountUnit, finishedIn, monthEntries, startedIn } from '#/lib/readingLog'
import type { DayEntry } from '#/lib/readingLog'
import { percentText } from '#/lib/progress'
import { AddBookForDay, ChangeButton, DayChangeEditor } from './DayEditor'
import {
  BLOCKS,
  SECTIONS,
  SECTION_IDS,
  hideBlock,
  moveBlock,
  placeOf,
  resetLayout,
  showBlock,
  singleColumn,
  toggleFold,
  toggleFavourite,
  favouriteColumns,
  favouritePlace,
  moveFavouriteTo,
  stepFavourite,
} from '#/lib/dashboardLayout'
import type { ArrowKey, BlockId, SectionId } from '#/lib/dashboardLayout'
import { ReadingTodayCard } from './ReadingTodayCard'
import { ThisMonthChallenges } from './ChallengeCard'
import { useOwnChallenges } from './OwnChallenges'
import { isMonthly } from '#/lib/ownChallenges'
import { YourWorldCard, hasWorldNews, useWorldNews } from './YourWorldCard'
import { BookshopHost } from './bookshop/BookshopCard'
import { addedToday, longLent, pickKind, showPick } from '#/lib/todayDashboard'
import { onThisDay } from '#/lib/insights'
import { useDashboardLayout } from './useDashboardLayout'
import { useArrangeBarHeight } from './useArrangeBarHeight'
import { BadgesCard, CoverWallCard, useBirthday } from './NewBlocks'
import { TropesCard, tropesBlock } from './TropesCard'
import { badges, newBadges } from '#/lib/badges'
import { useChallengeExtras } from './useChallengeExtras'
import { CreaturesCard } from './CreaturesCard'
import { useCreatures } from './creatures/CreaturesContext'
import { useGarden } from './garden/useGarden'
import { GardenCard } from './GardenCard'
import { BookshopCard } from './bookshop/BookshopCard'
import type { TroubleKind } from '#/lib/trouble'
import { useSeen } from './garden/useSeen'
import { waitingLine } from '#/lib/garden/seen'

const BADGES_SEEN = 'hannas-reading-list:badges-seen'
/** the month whose wrap-up was opened or put away under Waiting for you (yyyy-mm) */
const WRAP_SEEN = 'hannas-reading-list:wrapup-seen'
/** the dust-off's week, its pick and the books she said Not now to (T-0014) */
const DUST_OFF = 'hannas-reading-list:dust-off'
import type { Period } from '#/lib/stats'

/**
 * The dashboard (#59): how many books Hanna read, what to read next, and a
 * calendar of what she read each day (#76). The extras (#66) are in
 * DashboardExtras. She arranges the blocks herself (#85): see dashboardLayout.ts.
 */

export interface Props {
  books: Book[]
  /** open a book on the shelf */
  onShowBook: (id: string) => void
}

interface DashboardProps extends Props {
  /** the signed-in account, or null when the shelf lives in this browser only */
  accountId: string | null
  /** change a book: book bingo remembers a full card on the book that filled it (#119) */
  onUpdate: (id: string, patch: Partial<Book> | ((book: Book) => Partial<Book>)) => void
  /** "Open ›" on a challenge block: the Challenges page, at that challenge */
  onOpenChallenges?: (section: ChallengeSection) => void
  /** "Open ›" on the calendar block: the Calendar page at that month (yyyy-mm) */
  onOpenCalendar?: (month: string) => void
  /** put a suggested book on the shelf ("New for you") */
  onAdd?: (book: NewBook) => void
  /**
   * the Creatures tab; `choose`: straight to choosing the first creature, `hatch`: hatching the
   * oldest egg, `duplicate`: the choice for a duplicate (a Hatch or Choose button)
   */
  onOpenCreatures?: (step?: 'choose' | 'hatch' | 'duplicate') => void
  /** "Open ›" on the Garden block: the Garden tab (T-0065) */
  onOpenGarden?: () => void
  /** "Open ›" on My year: the Stats page (T-0080) */
  onOpenStats?: () => void
  /** the 📍 line: Stats, at the map (T-0128) */
  onOpenMap?: () => void
  /** how far along her facts are (D-0079), so one can never come round twice */
  factMark?: number
  /** a wish she already has on her shelf, to offer in Waiting for you (D-0086) */
  wishDone?: { text: string; title: string; onRemove: () => void; onKeep: () => void }
  /** something has gone wrong and is still wrong (D-0088): one line in Waiting for you */
  trouble?: { kind: TroubleKind; onRetry?: () => void; busy?: boolean }
}

export interface PeriodPick {
  kind: Period['kind']
  year: number
  month: number
}

export const toPeriod = ({ kind, year, month }: PeriodPick): Period =>
  kind === 'all' ? { kind } : kind === 'year' ? { kind, year } : { kind, year, month }

export const periodLabel = ({ kind, year, month }: PeriodPick) =>
  kind === 'all' ? 'all time' : kind === 'year' ? `in ${year}` : `in ${monthName(month)} ${year}`



/** Where a dragged block would land, and which block (or column end) shows the drop line. */
interface Drop {
  section: SectionId
  column: 0 | 1
  index: number
  /** the block it goes before, or `end:<section>:<n>` for the end of visual column n */
  marker: string
}

/** Where a block dragged within Favourites would land (T-0020): a list place, and where the drop line shows. */
interface FavDrop {
  /** list place among the other favourites (past the end: the end) */
  index: number
  /** the favourite it goes before, or `fav-end:<n>` for the end of visual column n */
  marker: string
}

/** A drag knows where it started: in a section, or in Favourites (the same block's other copy stays put). */
type Drag = { id: BlockId; dx: number; dy: number } & (
  | { place: 'section'; drop: Drop | null }
  | { place: 'favourites'; drop: FavDrop | null }
)

export function Dashboard({
  books,
  onShowBook,
  accountId,
  onUpdate,
  onOpenChallenges,
  onOpenCalendar,
  onAdd,
  onOpenCreatures,
  onOpenGarden,
  onOpenStats,
  onOpenMap,
  factMark = 0,
  wishDone,
  trouble,
}: DashboardProps) {
  const open = (section: ChallengeSection) => (onOpenChallenges ? () => onOpenChallenges(section) : undefined)
  // the year wrap-up story she opened with ▶ Play (T-0081); null: no story open
  const [storyYear, setStoryYear] = useState<number | null>(null)
  const [layout, setLayout] = useDashboardLayout(accountId)
  const [arranging, setArranging] = useState(false)
  /** quiet blocks she opened from "Hidden today", for this visit */
  const [openedAnyway, setOpenedAnyway] = useState<BlockId[]>([])
  const arrangeBar = useArrangeBarHeight()
  // the monthly challenge's editor is open (#144)
  const [drag, setDrag] = useState<Drag | null>(null)
  const narrow = useNarrow()
  const root = useRef<HTMLDivElement>(null)
  const start = useRef({ x: 0, y: 0, scroll: 0 })

  // finished books to rate and new books that might be in a series, instead of pop-ups
  const toRate = useMemo(() => pendingRatings(books), [books])
  const questions = useMemo(() => seriesQuestions(books), [books])
  // a new badge waits until "Nice!" (remembered on this device), or for a week
  const [seenBadges, setSeenBadges] = useState<string[]>(() => {
    try {
      const v: unknown = JSON.parse(localStorage.getItem(BADGES_SEEN) ?? '[]')
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
    } catch {
      return []
    }
  })
  // this device's birthday counts here too (D-0039), so the Birthday book can wait for you
  const birthday = useBirthday()
  // her own challenges, bingo swaps and goals: the challenges-N medals count them (D-0064 §6)
  const badgeExtras = useChallengeExtras(accountId)
  const freshBadges = useMemo(
    () => newBadges(badges(books, undefined, { birthday, ...badgeExtras })).filter((b) => !seenBadges.includes(b.id)),
    [books, seenBadges, birthday, badgeExtras],
  )
  const seeBadge = (id: string) => {
    const next = [...seenBadges, id]
    setSeenBadges(next)
    try {
      localStorage.setItem(BADGES_SEEN, JSON.stringify(next))
    } catch {
      /* storage blocked: it still holds for this visit */
    }
  }
  // last month's wrap-up waits for the first week of a new month, until opened or put away (on this device)
  const due = wrapUpDue()
  const [wrapSeen, setWrapSeen] = useState<string | null>(() => {
    try {
      return localStorage.getItem(WRAP_SEEN)
    } catch {
      return null
    }
  })
  const [wrapOpen, setWrapOpen] = useState<{ year: number; month: number } | null>(null)
  const seeWrap = () => {
    if (!due) return
    setWrapSeen(wrapKey(due.year, due.month))
    try {
      localStorage.setItem(WRAP_SEEN, wrapKey(due.year, due.month))
    } catch {
      /* storage blocked: it still holds for this visit */
    }
  }
  const wrapUp =
    due && wrapSeen !== wrapKey(due.year, due.month)
      ? {
          label: `Your ${monthName(due.month)} wrap-up is ready`,
          onOpen: () => {
            setWrapOpen(due)
            seeWrap()
          },
          onDismiss: seeWrap,
        }
      : undefined
  // once a week, the want-to-read book that has waited longest, until Not now (on this device; T-0014)
  const [dustState, setDustState] = useState<DustOffState>(() => {
    try {
      return cleanDustOff(JSON.parse(localStorage.getItem(DUST_OFF) ?? 'null'))
    } catch {
      return { dismissed: [] }
    }
  })
  const today = localDay()
  const dustBook = useMemo(() => dustOffPick(books, dustState, today), [books, dustState, today])
  const keepDust = (next: DustOffState) => {
    setDustState(next)
    try {
      localStorage.setItem(DUST_OFF, JSON.stringify(next))
    } catch {
      /* storage blocked: it still holds for this visit */
    }
  }
  // remember the week's pick, so it stays the same all week
  useEffect(() => {
    if (dustBook && (dustState.week !== weekOf(today) || dustState.pick !== dustBook.id)) keepDust(dustOffSeen(dustState, dustBook, today))
  }, [dustBook, dustState, today])
  const dustOff = dustBook
    ? { book: dustBook, waited: waitedText(dustBook, today), onDismiss: () => keepDust(dustOffDismiss(dustState, dustBook, today)) }
    : undefined
  // her creature (T-0029): the welcome egg and the newest level-up wait here too, never in a pop-up
  const creatures = useCreatures(books)
  // her garden (T-0065): the block shows this year's, and keeps out of the way before the first plant
  const garden = useGarden(books)
  const hatchEgg = onOpenCreatures ? () => onOpenCreatures('choose') : undefined
  const creatureEgg = creatures.c.egg && hatchEgg ? { onHatch: hatchEgg } : undefined
  // milestone eggs and duplicates waiting for her choice (T-0030), only once she has her first pet
  const hatchMilestone = onOpenCreatures ? () => onOpenCreatures('hatch') : undefined
  const creatureEggs = creatures.c.pet && creatures.c.eggs.length && hatchMilestone ? { eggs: creatures.c.eggs, onHatch: hatchMilestone } : undefined
  const waitingDup = creatures.c.pet ? creatures.c.waiting[0] : undefined
  const creatureDuplicate =
    waitingDup && onOpenCreatures ? { species: waitingDup.species, onChoose: () => onOpenCreatures('duplicate') } : undefined
  const levelUp = creatures.levelUp
  const creatureLevelUp = levelUp
    ? {
        text: levelUp.text,
        onNice: () => creatures.api.see(levelUp.pet.id, levelUp.pet.level),
        onVisit: () => {
          creatures.api.see(levelUp.pet.id, levelUp.pet.level)
          onOpenCreatures?.()
        },
      }
    : undefined
  // the garden's news, without clearing it: only opening the Garden tab counts as looking
  const gardenSeen = useSeen(garden.garden, false)
  const gardenLine = waitingLine(gardenSeen.plants, gardenSeen.unlocked, gardenSeen.scenery)
  const gardenWaiting = gardenLine && onOpenGarden ? { line: gardenLine, onVisit: onOpenGarden } : undefined
  const nothingWaiting =
    toRate.length === 0 &&
    questions.length === 0 &&
    freshBadges.length === 0 &&
    !wrapUp &&
    !dustOff &&
    !creatureEgg &&
    !creatureEggs &&
    !creatureDuplicate &&
    !creatureLevelUp &&
    !gardenWaiting &&
    !trouble

  const [ownChallenges] = useOwnChallenges(accountId)
  const world = useWorldNews(creatures.c, garden.garden, books, creatures.api.choices.log, accountId)

  // nothing noted anywhere yet: the Tropes & characters block keeps out of the way
  const noTropes = tropesBlock(books).empty

  const blocks: Record<BlockId, React.ReactNode> = {
    waiting: (
      <WaitingCard
        toRate={toRate}
        questions={questions}
        onUpdate={onUpdate}
        onShowBook={onShowBook}
        newBadges={freshBadges}
        onSeenBadge={seeBadge}
        wrapUp={wrapUp}
        dustOff={dustOff}
        creatureEgg={creatureEgg}
        creatureEggs={creatureEggs}
        creatureDuplicate={creatureDuplicate}
        creatureLevelUp={creatureLevelUp}
        garden={gardenWaiting}
        wishDone={wishDone}
        trouble={trouble}
      />
    ),
    creatures: (
      <CreaturesCard
        c={creatures.c}
        onFeed={creatures.feed}
        onOpen={onOpenCreatures ? () => onOpenCreatures() : undefined}
        onHatch={hatchEgg}
        onHatchMilestone={hatchMilestone}
      />
    ),
    garden: <GardenCard garden={garden.garden} onOpen={onOpenGarden} />,
    readingtoday: (
      <ReadingTodayCard
        books={books}
        onShowBook={onShowBook}
        onUpdate={onUpdate}
        onOpenCalendar={onOpenCalendar && (() => onOpenCalendar(localDay().slice(0, 7)))}
        onOpenMap={onOpenMap ?? onOpenStats}
      />
    ),
    yourworld: (
      <YourWorldCard
        news={world}
        onFeed={creatures.c.pet ? () => void creatures.feed() : undefined}
        onOpenCreatures={onOpenCreatures ? () => onOpenCreatures() : undefined}
        onOpenGarden={onOpenGarden}
      />
    ),
    pick: <PickOfTheDay books={books} accountId={accountId} onShowBook={onShowBook} onUpdate={onUpdate} onAdd={onAdd ?? (() => {})} />,
    // the shop that trades while she is away (D-0084); "Open ›" opens it over the dashboard
    bookshop: (
      <BookshopCard books={books} log={creatures.api.choices.log} record={creatures.api.choices.record} accountId={accountId} />
    ),
    badges: <BadgesCard books={books} extras={badgeExtras} />,
    tropes: <TropesCard books={books} onShowBook={onShowBook} />,
    covers: <CoverWallCard books={books} onShowBook={onShowBook} />,
    world: <BooksWorldMapCard books={books} onShowBook={onShowBook} />,
    // one row per monthly challenge (T-0126, D-0094)
    challenge: (
      <ThisMonthChallenges
        books={books}
        own={ownChallenges.filter((c) => isMonthly(c) && c.year === new Date().getFullYear())}
        onShowBook={onShowBook}
        onOpen={open('monthly')}
      />
    ),
    // the one block about her reading left on the dashboard (D-0060); the charts are on the Stats page
    myyear: <MyYearCard books={books} accountId={accountId} onOpen={onOpenStats} onShowBook={onShowBook} />,
    next: <ReadNextCard books={books} onShowBook={onShowBook} />,
    newforyou: <NewForYouCard books={books} accountId={accountId} onAdd={onAdd ?? (() => {})} />,
    reading: <CurrentlyReadingCard books={books} onShowBook={onShowBook} />,
    series: <SeriesCard books={books} onShowBook={onShowBook} />,
    calendar: <Calendar books={books} onShowBook={onShowBook} onOpen={onOpenCalendar} onUpdate={onUpdate} />,
    pile: <PileCard books={books} />,
    onthisday: <OnThisDayCard books={books} onShowBook={onShowBook} />,
    // only the books away a month or more (T-0124)
    lent: <LentCard books={longLent(books)} onShowBook={onShowBook} />,
    again: <AgainCard books={books} onShowBook={onShowBook} onUpdate={onUpdate} />,
    // Top 5 and the spice meter in one block, with a switch
    top: <RatingsCard books={books} onShowBook={onShowBook} />,
    fact: <FactCard books={books} seen={factMark} />,
    pace: <PaceCard books={books} onShowBook={onShowBook} />,
    authors: <AuthorsCard books={books} />,
    wrapped: <WrappedCard books={books} onShowBook={onShowBook} onPlay={setStoryYear} />,
    // only what she added today (T-0124)
    recent: <RecentCard books={addedToday(books)} onShowBook={onShowBook} />,
    alphabet: <AlphabetCard books={books} onShowBook={onShowBook} onUpdate={onUpdate} compact onOpen={open('alphabet')} />,
    bingo: <BingoCard books={books} onUpdate={onUpdate} compact onOpen={open('bingo')} onShowBook={onShowBook} />,
  }

  /** a block with nothing to say today (T-0124): it hides, and "Hidden today" names it */
  const quiet = (id: BlockId) =>
    (id === 'waiting' && nothingWaiting) ||
    (id === 'yourworld' && !hasWorldNews(world)) ||
    (id === 'pick' && !showPick(books)) ||
    (id === 'onthisday' && onThisDay(books).length === 0) ||
    (id === 'lent' && longLent(books).length === 0) ||
    (id === 'recent' && addedToday(books).length === 0) ||
    (id === 'tropes' && noTropes)
  /** shown: always while arranging, else unless quiet (or she opened it from Hidden today) */
  const showing = (id: BlockId) => arranging || !quiet(id) || openedAnyway.includes(id)
  /** the quiet ones she can open anyway, in the dashboard's order (Waiting for you never: nothing waits) */
  const quietToday = SECTION_IDS.flatMap((s) => layout.sections[s].flat()).filter((id) => id !== 'waiting' && !showing(id))
  const columnsOf = (section: SectionId): BlockId[][] =>
    narrow ? [singleColumn(layout.sections[section])] : layout.sections[section]
  const scroller = () => root.current

  /** The drop place under the pointer: the section it is over, then before the first block whose middle is below it. */
  const dropAt = (x: number, y: number, id: BlockId): Drop | null => {
    const grids = [...(root.current?.querySelectorAll<HTMLElement>('.dash-section-grid') ?? [])]
    if (!grids.length) return null
    const vdist = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      return y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0
    }
    const grid = grids.reduce((best, el) => (vdist(el) < vdist(best) ? el : best), grids[0])
    const section = grid.dataset.section as SectionId
    const cols = [...grid.querySelectorAll<HTMLElement>(':scope > .dash-column')]
    if (!cols.length) return null
    const dist = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      return x < r.left ? r.left - x : x > r.right ? x - r.right : 0
    }
    const visual = cols.reduce((best, el, i) => (dist(el) < dist(cols[best]) ? i : best), 0)
    const others = [...cols[visual].querySelectorAll<HTMLElement>(':scope > .dash-block')].filter(
      (el) => el.dataset.block !== id,
    )
    const rest = hideBlock(layout, id)
    const before = others.find((el) => {
      const r = el.getBoundingClientRect()
      return y < r.top + r.height / 2
    })
    if (before) {
      const place = placeOf(rest, before.dataset.block as BlockId)
      return place && { ...place, marker: before.dataset.block! }
    }
    const last = others.at(-1)
    const end = `end:${section}:${visual}`
    if (last) {
      const place = placeOf(rest, last.dataset.block as BlockId)
      return place && { section, column: place.column, index: place.index + 1, marker: end }
    }
    return { section, column: visual as 0 | 1, index: 0, marker: end }
  }

  const favColumns = narrow ? 1 : 2

  /**
   * The drop place in Favourites (T-0020): only the Favourites grid counts, so a
   * drag over a section keeps its line at the nearest Favourites place. Column
   * c, before the block at row r (counted without the dragged one), is list
   * place 2r + c of the others (r with one column); past the end it is the end,
   * and the line shows at the end of the column where the end is.
   */
  const favDropAt = (x: number, y: number, id: BlockId): FavDrop | null => {
    const grid = root.current?.querySelector<HTMLElement>('.dash-favourites-grid')
    const cols = [...(grid?.querySelectorAll<HTMLElement>(':scope > .dash-column') ?? [])]
    if (!cols.length) return null
    const dist = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      return x < r.left ? r.left - x : x > r.right ? x - r.right : 0
    }
    const visual = cols.reduce((best, el, i) => (dist(el) < dist(cols[best]) ? i : best), 0)
    const others = [...cols[visual].querySelectorAll<HTMLElement>(':scope > .dash-block')].filter(
      (el) => el.dataset.favourite !== id,
    )
    const row = others.findIndex((el) => {
      const r = el.getBoundingClientRect()
      return y < r.top + r.height / 2
    })
    const count = layout.favourites.length - 1
    const r = row < 0 ? others.length : row
    const index = favColumns === 2 ? 2 * r + visual : r
    if (index >= count) return { index: count, marker: `fav-end:${favColumns === 2 ? count % 2 : 0}` }
    return { index, marker: row < 0 ? `fav-end:${visual}` : others[row].dataset.favourite! }
  }

  // the screen-reader line in Favourites, and the handle to focus again after a key move
  const [favSay, setFavSay] = useState('')
  const refocus = useRef<BlockId | null>(null)
  /** A Hidden chip was restored (Enter): after re-render, focus moves to the next chip or to the block's handle (T-0044, F7). */
  const restoreFocus = useRef<{ nextId: BlockId | null; blockId: BlockId } | null>(null)
  useEffect(() => {
    const id = refocus.current
    if (!id) return
    refocus.current = null
    root.current?.querySelector<HTMLElement>(`.dash-favourites-grid [data-favourite="${id}"] .block-handle`)?.focus()
  }, [layout])
  useEffect(() => {
    const r = restoreFocus.current
    if (!r) return
    restoreFocus.current = null
    const chip = r.nextId
      ? root.current?.querySelector<HTMLElement>(`.hidden-blocks [data-hidden="${r.nextId}"]`)
      : null
    if (chip) return chip.focus()
    root.current
      ?.querySelector<HTMLElement>(`.dashboard-grid [data-block="${r.blockId}"] .block-handle`)
      ?.focus()
  }, [layout])
  const say = (text: string) => {
    if (text !== favSay) return setFavSay(text)
    // the same words again: clear first, so they are read again
    setFavSay('')
    setTimeout(() => setFavSay(text), 50)
  }
  /** Puts a new Favourites order in place and says where the block went; nothing when nothing moved. */
  const moveInFavourites = (id: BlockId, next: typeof layout) => {
    if (next.favourites.every((x, i) => x === layout.favourites[i])) return false
    setLayout(next)
    const place = favouritePlace(next, id, favColumns)!
    say(
      favColumns === 2
        ? `${BLOCKS[id]}: ${place.column === 0 ? 'left' : 'right'} column, row ${place.row + 1} of the favourites.`
        : `${BLOCKS[id]}: place ${place.index + 1} of ${next.favourites.length} in the favourites.`,
    )
    return true
  }

  const handleProps = (id: BlockId, from: Drag['place'] = 'section') => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      start.current = { x: e.clientX, y: e.clientY, scroll: scroller()?.scrollTop ?? 0 }
      setDrag({ id, dx: 0, dy: 0, place: from, drop: null } as Drag)
    },
    onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (drag?.id !== id || drag.place !== from) return
      // scroll along near the top and bottom edges
      const el = scroller()
      if (el) {
        if (e.clientY < 80) el.scrollTop -= 14
        else if (e.clientY > window.innerHeight - 60) el.scrollTop += 14
      }
      const scrolled = (el?.scrollTop ?? 0) - start.current.scroll
      const moved = { id, dx: e.clientX - start.current.x, dy: e.clientY - start.current.y + scrolled }
      setDrag(
        from === 'favourites'
          ? { ...moved, place: from, drop: favDropAt(e.clientX, e.clientY, id) }
          : { ...moved, place: from, drop: dropAt(e.clientX, e.clientY, id) },
      )
    },
    onPointerUp: () => {
      if (drag?.id === id && drag.place === from && drag.drop) {
        if (drag.place === 'favourites') moveInFavourites(id, moveFavouriteTo(layout, id, drag.drop.index))
        else setLayout(moveBlock(layout, id, drag.drop.section, drag.drop.column, drag.drop.index))
      }
      setDrag(null)
    },
    onPointerCancel: () => setDrag(null),
    // without a pointer: arrow keys move the block; with Shift, up and down go to the next section
    onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (from === 'favourites') {
        // within Favourites: by row and column; Shift does nothing (there is no other section)
        if (e.shiftKey || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
        if (moveInFavourites(id, stepFavourite(layout, id, e.key as ArrowKey, favColumns))) {
          e.preventDefault()
          refocus.current = id
        }
        return
      }
      const place = placeOf(layout, id)
      if (!place) return
      const s = SECTION_IDS.indexOf(place.section)
      const to =
        e.shiftKey && e.key === 'ArrowUp' && s > 0
          ? { section: SECTION_IDS[s - 1], column: place.column, index: 999 }
          : e.shiftKey && e.key === 'ArrowDown' && s < SECTION_IDS.length - 1
            ? { section: SECTION_IDS[s + 1], column: place.column, index: 0 }
            : e.key === 'ArrowUp' && !e.shiftKey
              ? { ...place, index: place.index - 1 }
              : e.key === 'ArrowDown' && !e.shiftKey
                ? { ...place, index: place.index + 1 }
                : e.key === 'ArrowLeft' && !narrow
                  ? { ...place, column: 0 as const }
                  : e.key === 'ArrowRight' && !narrow
                    ? { ...place, column: 1 as const }
                    : null
      if (!to || to.index < 0) return
      e.preventDefault()
      setLayout(moveBlock(layout, id, to.section, to.column, to.index))
    },
  })

  const shown = SECTION_IDS.some((s) => layout.sections[s].flat().some(showing))
  const favFolded = layout.folded.includes('favourites') && !arranging
  /** ☆ / ★ in the block tools while arranging: a favourite also shows on top */
  const star = (id: BlockId) => {
    const on = layout.favourites.includes(id)
    return (
      <button
        className={`btn icon small block-star${on ? ' on' : ''}`}
        aria-pressed={on}
        aria-label={on ? `Take ${BLOCKS[id]} out of the favourites` : `Add ${BLOCKS[id]} to the favourites`}
        title={on ? 'Favourite' : 'Make a favourite'}
        onClick={() => setLayout(toggleFavourite(layout, id))}
      >
        {on ? '★' : '☆'}
      </button>
    )
  }
  return (
    <div className="dashboard" ref={root}>
      {wrapOpen && (
        <WrapUpCard books={books} year={wrapOpen.year} month={wrapOpen.month} onShowBook={onShowBook} onClose={() => setWrapOpen(null)} />
      )}
      {storyYear !== null && (
        <YearStory books={books} year={storyYear} onShowBook={onShowBook} onClose={() => setStoryYear(null)} />
      )}
      {/* the shop over the dashboard, for More › Bookshop and the bookshop line (T-0124) */}
      <BookshopHost books={books} log={creatures.api.choices.log} record={creatures.api.choices.record} accountId={accountId} />
      <div className={`dashboard-bar${arranging ? ' arranging' : ''}`} ref={arrangeBar}>
        {arranging ? (
          <>
            <div className="dashboard-bar-actions">
              <button className="btn small" onClick={() => setLayout(resetLayout(layout))}>
                Reset
              </button>
              <button
                className="btn small primary"
                onClick={() => {
                  setArranging(false)
                  setFavSay('')
                }}
              >
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
                      setLayout(showBlock(layout, id))
                    }}
                  >
                    + {BLOCKS[id]}
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
      {!shown && <p className="muted dashboard-empty">Every block is hidden. Press Arrange to add some back.</p>}
      {(layout.favourites.length > 0 || arranging) && (
        <section className="dash-section dash-favourites" aria-labelledby="section-favourites">
          <button
            type="button"
            className="dash-section-head"
            aria-expanded={!favFolded}
            onClick={() => setLayout(toggleFold(layout, 'favourites'))}
            disabled={arranging}
          >
            <h2 id="section-favourites">★ Favourites</h2>
            <span className="dash-section-fold" aria-hidden>
              {favFolded ? '▸' : '▾'}
            </span>
          </button>
          {!favFolded &&
            (layout.favourites.length === 0 ? (
              <p className="muted small-text dash-favourites-empty">Star blocks with ☆ to see them here, on top.</p>
            ) : (
              // the favourites also stay in their own section; these copies move only within Favourites (T-0020)
              <div className={`dashboard-grid dash-favourites-grid${arranging ? ' arranging' : ''}`}>
                {(narrow ? [singleColumn(favouriteColumns(layout))] : favouriteColumns(layout)).map((col, visual) => (
                  <div className="dash-column" key={visual}>
                    {col.filter(showing).map((id) => {
                      const moving = drag?.place === 'favourites' && drag.id === id
                      const marked = drag?.place === 'favourites' && drag.drop?.marker === id
                      return (
                        <div
                          key={id}
                          data-favourite={id}
                          className={`dash-block${moving ? ' moving' : ''}${marked ? ' drop-before' : ''}`}
                          style={moving ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
                        >
                          {arranging && (
                            <div className="block-tools">
                              <button
                                className="btn icon small block-handle"
                                aria-label={`Move ${BLOCKS[id]} within the favourites: drag it, or use the arrow keys`}
                                title="Drag to move"
                                {...handleProps(id, 'favourites')}
                              >
                                <span aria-hidden>⠿</span>
                              </button>
                              {star(id)}
                            </div>
                          )}
                          {blocks[id]}
                        </div>
                      )
                    })}
                    {drag?.place === 'favourites' && drag.drop?.marker === `fav-end:${visual}` && (
                      <div className="drop-end" aria-hidden />
                    )}
                  </div>
                ))}
              </div>
            ))}
          {arranging && (
            <p className="visually-hidden" role="status" aria-live="polite">
              {favSay}
            </p>
          )}
        </section>
      )}
      {SECTION_IDS.map((section) => {
        const ids = layout.sections[section].flat().filter(showing)
        // an empty section stays out of the way; while arranging only Today stays open to drop
        // blocks into, the others are emptied now their blocks live on their own pages (T-0121)
        if (ids.length === 0 && (!arranging || section !== 'today')) return null
        // while arranging every section is open, so blocks can be dropped in
        const folded = layout.folded.includes(section) && !arranging
        // Today on its own needs no heading: the whole dashboard is about today (T-0122)
        const alone = !arranging && SECTION_IDS.every((s) => s === section || layout.sections[s].flat().filter(showing).length === 0)
        if (alone)
          return (
            <section key={section} className="dash-section" aria-label={SECTIONS[section]}>
              <div className={`dashboard-grid dash-section-grid${drag ? ' dragging' : ''}`} data-section={section}>
                {columnsOf(section).map((col, visual) => (
                  <div className="dash-column" key={visual}>
                    {col.filter(showing).map((id) => (
                      <div key={id} data-block={id} className="dash-block">
                        {blocks[id]}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )
        return (
          <section key={section} className="dash-section" aria-labelledby={`section-${section}`}>
            <button
              type="button"
              className="dash-section-head"
              aria-expanded={!folded}
              onClick={() => setLayout(toggleFold(layout, section))}
              disabled={arranging}
            >
              <h2 id={`section-${section}`}>{SECTIONS[section]}</h2>
              <span className="dash-section-fold" aria-hidden>
                {folded ? '▸' : '▾'}
              </span>
            </button>
            {!folded && (
              <div
                className={`dashboard-grid dash-section-grid${arranging ? ' arranging' : ''}${drag ? ' dragging' : ''}`}
                data-section={section}
              >
                {columnsOf(section).map((col, visual) => (
                  <div className="dash-column" key={visual}>
                    {col.filter(showing).map((id) => {
                      const moving = drag?.place === 'section' && drag.id === id
                      const marked = drag?.place === 'section' && drag.drop?.marker === id
                      return (
                        <div
                          key={id}
                          data-block={id}
                          className={`dash-block${moving ? ' moving' : ''}${marked ? ' drop-before' : ''}`}
                          style={moving ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined}
                        >
                          {arranging && (
                            <div className="block-tools">
                              <button
                                className="btn icon small block-handle"
                                aria-label={`Move ${BLOCKS[id]}: drag it, or use the arrow keys (Shift for another section)`}
                                title="Drag to move"
                                {...handleProps(id)}
                              >
                                <span aria-hidden>⠿</span>
                              </button>
                              {star(id)}
                              <button
                                className="btn icon small"
                                aria-label={`Hide ${BLOCKS[id]}`}
                                title="Hide"
                                onClick={() => setLayout(hideBlock(layout, id))}
                              >
                                ×
                              </button>
                            </div>
                          )}
                          {blocks[id]}
                        </div>
                      )
                    })}
                    {drag?.place === 'section' && drag.drop?.marker === `end:${section}:${visual}` && (
                      <div className="drop-end" aria-hidden />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
      {/* the cards with nothing to say today, to open anyway (T-0124) */}
      {!arranging && quietToday.length > 0 && (
        <p className="hidden-today small-text">
          Hidden today:{' '}
          {quietToday.map((id, i) => (
            <span key={id}>
              {i > 0 && ', '}
              <button type="button" className="link-btn" onClick={() => setOpenedAnyway((o) => [...o, id])}>
                {BLOCKS[id]}
              </button>
            </span>
          ))}
        </p>
      )}
    </div>
  )
}

/** Top 5 and the spice meter in one block, with a Stars | Spice switch. */
export function RatingsCard({ books, onShowBook }: Props) {
  const [kind, setKind] = useState<'stars' | 'spice'>('stars')
  const switcher = (
    <div className="segmented" role="group" aria-label="Stars or spice">
      {(['stars', 'spice'] as const).map((k) => (
        <button
          key={k}
          type="button"
          className={kind === k ? 'active' : undefined}
          aria-pressed={kind === k}
          onClick={() => setKind(k)}
        >
          {k === 'stars' ? '★ Stars' : '🌶️ Spice'}
        </button>
      ))}
    </div>
  )
  return kind === 'stars' ? (
    <TopRatedCard books={books} onShowBook={onShowBook} switcher={switcher} />
  ) : (
    <SpiceCard books={books} onShowBook={onShowBook} switcher={switcher} />
  )
}

// ---------------------------------------------------------------------------

/** All time / Year / Month, for the blocks that look at a period. */
export function PeriodTabs({ pick, onPick }: { pick: PeriodPick; onPick: (pick: PeriodPick) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Period">
      {(['month', 'year', 'all'] as const).map((k) => (
        <button
          key={k}
          className={pick.kind === k ? 'active' : ''}
          aria-pressed={pick.kind === k}
          onClick={() => onPick({ ...pick, kind: k })}
        >
          {k === 'all' ? 'All time' : k === 'year' ? 'Year' : 'Month'}
        </button>
      ))}
    </div>
  )
}

/** Which year, or which month, of the period picked. */
export function PeriodSelect({
  books,
  pick,
  onPick,
}: {
  books: Book[]
  pick: PeriodPick
  onPick: (pick: PeriodPick) => void
}) {
  const { kind, year, month } = pick
  const setYear = (y: number) => onPick({ ...pick, year: y })
  const setMonth = (m: number) => onPick({ ...pick, month: m })
  const years = useMemo(() => readingYears(books), [books])
  const step = (by: number) => {
    const d = new Date(year, month - 1 + by, 1)
    onPick({ ...pick, year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  if (kind === 'all') return null
  return (
    <div className="period-pick">
      {kind === 'month' && (
        <button className="btn icon small" aria-label="Previous month" onClick={() => step(-1)}>
          ‹
        </button>
      )}
      {kind === 'month' && (
        <select
          className="input"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          aria-label="Month"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {monthName(i + 1)}
            </option>
          ))}
        </select>
      )}
      <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
        {(years.includes(year) ? years : [...years, year].sort((a, b) => b - a)).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      {kind === 'month' && (
        <button className="btn icon small" aria-label="Next month" onClick={() => step(1)}>
          ›
        </button>
      )}
    </div>
  )
}

/** Her five favourites (#100): the best-rated books she finished, of all time, a year or a month. */
function TopRatedCard({ books, onShowBook, switcher }: Props & { switcher?: React.ReactNode }) {
  const now = new Date()
  const [pick, setPick] = useState<PeriodPick>({ kind: 'all', year: now.getFullYear(), month: now.getMonth() + 1 })
  const top = useMemo(() => topRated(books, toPeriod(pick)), [books, pick])
  return (
    <section className="dash-card top-card" aria-labelledby="top-title">
      <div className="dash-card-head">
        <h2 id="top-title">{switcher ? 'My ratings' : 'Top 5'}</h2>
        {switcher}
        <PeriodTabs pick={pick} onPick={setPick} />
      </div>
      <PeriodSelect books={books} pick={pick} onPick={setPick} />
      {top.length === 0 ? (
        <p className="muted small-text">
          No rated books {periodLabel(pick) === 'all time' ? 'yet' : periodLabel(pick)}.
        </p>
      ) : (
        <ol className="top-list">
          {top.map((b, i) => (
            <li key={b.id}>
              <span className="top-place">{i + 1}</span>
              <button className="cover-btn" aria-label={b.title} onClick={() => onShowBook(b.id)}>
                <Cover book={b} small />
              </button>
              <span className="top-info">
                <button className="link-btn" onClick={() => onShowBook(b.id)}>
                  {b.title}
                </button>
                <span className="top-ratings">
                  <StarRating value={b.rating} size="small" />
                  {b.spice ? <StarRating kind="spice" value={b.spice} size="small" /> : null}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

/**
 * Pick of the day (T-0124, D-0093): What next?, Give it another try and New for you in one card,
 * one kind a day taking turns, with Another for the next kind. Shown while she has room for
 * another book (`showPick`).
 */
function PickOfTheDay({
  books,
  accountId,
  onShowBook,
  onUpdate,
  onAdd,
}: Props & { accountId: string | null; onUpdate: (id: string, patch: Partial<Book> | ((book: Book) => Partial<Book>)) => void; onAdd: (book: NewBook) => void }) {
  const [another, setAnother] = useState(0)
  const kind = pickKind(localDay(), another)
  return (
    <section className="dash-card pick-card" aria-labelledby="pick-title">
      <div className="dash-card-head">
        <h2 id="pick-title">Pick of the day</h2>
        <button type="button" className="btn small" onClick={() => setAnother((n) => n + 1)}>
          Another
        </button>
      </div>
      <div className="pick-embed">
        {kind === 'next' && <ReadNextCard books={books} onShowBook={onShowBook} />}
        {kind === 'again' && <AgainCard books={books} onShowBook={onShowBook} onUpdate={onUpdate} />}
        {kind === 'newforyou' && <NewForYouCard books={books} accountId={accountId} onAdd={onAdd} />}
      </div>
    </section>
  )
}

function ReadNextCard({ books, onShowBook }: Props) {
  const choices = useMemo(() => readNextChoices(books), [books])
  const [pickedId, setPickedId] = useState<string | null>(null)
  const picked = choices.find((b) => b.id === pickedId)
  // on a phone this opens the Storytel app (#65)
  const storytel = picked && storytelLink(picked)
  const pick = () => setPickedId(pickReadNext(choices, pickedId)?.id ?? null)

  return (
    <section className="dash-card next-card" aria-labelledby="next-title">
      <div className="dash-card-head">
        <h2 id="next-title">What next?</h2>
      </div>
      {picked ? (
        <div className="next-book">
          <Cover book={picked} />
          <div>
            <p className="next-title">{picked.title}</p>
            {picked.authors.length > 0 && <p className="muted">{picked.authors.join(', ')}</p>}
            <div className="next-actions">
              <button className="btn primary" onClick={() => onShowBook(picked.id)}>
                Show on the shelf
              </button>
              {storytel && (
                <a className="btn storytel-link" href={storytel} target="_blank" rel="noopener noreferrer">
                  <span aria-hidden>▶</span> Open in Storytel
                </a>
              )}
              {choices.length > 1 && (
                <button className="btn" onClick={pick}>
                  🎲 Another
                </button>
              )}
            </div>
          </div>
        </div>
      ) : choices.length ? (
        <>
          <p className="muted">
            {choices.length} {choices.length === 1 ? 'book is' : 'books are'} waiting.
          </p>
          <button className="btn primary" onClick={pick}>
            🎲 Pick my next book
          </button>
        </>
      ) : (
        <p className="muted">No unread books waiting on the shelf.</p>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------

/**
 * The calendar (#59, #76, #82, #89, #92): what Hanna read, started and
 * finished on each day of a month. Tapping a day (anywhere in it) shows that
 * day; below are the books started and finished that month.
 */
/** class for a book finished, started or read on (continued) on a calendar day */
function Calendar({
  books,
  onShowBook,
  onOpen,
  onUpdate,
}: Props & {
  onOpen?: (month: string) => void
  onUpdate?: (id: string, patch: Partial<Book> | ((book: Book) => Partial<Book>)) => void
}) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  /** which book is on top of each day's pile; new each time the dashboard opens */
  const [shuffle] = useState(() => Math.floor(Math.random() * 1000))
  /** the day picked, in the month shown */
  const [picked, setPicked] = useState<number | null>(null)
  const byDay = useMemo(() => monthEntries(books, year, month), [books, year, month])
  const started = useMemo(() => startedIn(books, year, month), [books, year, month])
  const finished = useMemo(() => finishedIn(books, year, month), [books, year, month])
  // the dashboard is about today (T-0121): this week only; the month is one tap away on the Calendar page
  const weeks = monthWeeks(year, month).filter((w) => w.includes(now.getDate()))
  const isToday = (d: number) => year === now.getFullYear() && month === now.getMonth() + 1 && d === now.getDate()
  const isFuture = (d: number) => new Date(year, month - 1, d) > now
  const name = monthName(month)

  return (
    <section className="dash-card calendar-card" aria-labelledby="calendar-title">
      <div className="dash-card-head">
        <h2 id="calendar-title">This week</h2>
        <OpenLink onOpen={onOpen && (() => onOpen(`${year}-${String(month).padStart(2, '0')}`))} label="Calendar" />
      </div>
      <table className="calendar">
        <thead>
          <tr>
            {WEEKDAYS.map((d) => (
              <th key={d} scope="col">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((d, j) => {
                const entries = d ? (byDay.get(d) ?? []) : []
                const story = entries.map((e) => `${e.book.title}, you ${dayStory(e)}`).join('; ')
                return (
                  <td
                    key={j}
                    className={[
                      !d && 'outside',
                      d && isToday(d) && 'today',
                      entries.length && 'has-books',
                      d && d === picked && 'picked',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {d && (
                      // the whole day is the button; the covers don't lead to the shelf (#82, #89)
                      <button
                        className="day-cell"
                        disabled={isFuture(d)}
                        aria-pressed={d === picked}
                        aria-label={`${d} ${name}${story ? `: ${story}` : ''}`}
                        onClick={() => setPicked(d === picked ? null : d)}
                      >
                        <span className="day-number">{d}</span>
                        {/* one book shows its cover; more lie in a pile that grows with each
                            book, so a day keeps the same size however much was read (#102) */}
                        {entries.length === 1 ? (
                          <span className={`day-cover${mark(entries[0])}`}>
                            <Cover book={entries[0].book} small />
                          </span>
                        ) : entries.length > 1 ? (
                          (() => {
                            const pile = dayPile(entries, d, shuffle)
                            const top = pile[pile.length - 1]
                            return (
                              <span className={`day-cover day-pile${mark(top)}`} aria-hidden>
                                {pile.map((e, i) => (
                                  <span
                                    key={e.book.id}
                                    className={i === pile.length - 1 ? 'pile-sheet pile-top' : 'pile-sheet'}
                                    style={{ '--layer': pile.length - 1 - i } as React.CSSProperties}
                                  >
                                    <Cover book={e.book} small />
                                  </span>
                                ))}
                                {entries.length > PILE && <span className="pile-more">+{entries.length - PILE}</span>}
                              </span>
                            )
                          })()
                        ) : null}
                      </button>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {picked !== null ? (
        <DayDetails
          books={books}
          day={`${year}-${String(month).padStart(2, '0')}-${String(picked).padStart(2, '0')}`}
          entries={byDay.get(picked) ?? []}
          label={`${picked} ${name}`}
          onShowBook={onShowBook}
          onUpdate={onUpdate}
          onClose={() => setPicked(null)}
        />
      ) : (
        <p className="muted hint">
          {byDay.size === 0 ? `Nothing read in ${name} ${year}.` : 'Tap a day to see what you read.'}
        </p>
      )}
      <MonthList
        title={`Started in ${name}`}
        empty={`No books started in ${name} ${year}.`}
        items={started}
        month={month}
        onShowBook={onShowBook}
      />
      <MonthList
        title={`Finished in ${name}`}
        empty={`No books finished in ${name} ${year}.`}
        items={finished}
        month={month}
        onShowBook={onShowBook}
      />
    </section>
  )
}

function MonthList({
  title,
  empty,
  items,
  month,
  onShowBook,
}: {
  title: string
  empty: string
  items: Array<{ book: Book; day: string }>
  month: number
  onShowBook: (id: string) => void
}) {
  return (
    <div className="month-list">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="muted small-text">{empty}</p>
      ) : (
        <ul className="book-list">
          {items.map(({ book, day }) => (
            <BookLine key={`${book.id}-${day}`} book={book} onShowBook={onShowBook}>
              <span className="muted small-text">
                {Number(day.slice(8, 10))} {monthName(month)}
              </span>
            </BookLine>
          ))}
        </ul>
      )}
    </div>
  )
}

/** What happened on one day (#89): how much she read of each book, and what she started or finished. */
function DayDetails({
  books,
  day,
  entries,
  label,
  onShowBook,
  onUpdate,
  onClose,
}: {
  books: Book[]
  day: string
  entries: DayEntry[]
  label: string
  onShowBook: (id: string) => void
  onUpdate?: (id: string, patch: Partial<Book> | ((book: Book) => Partial<Book>)) => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const canEdit = !!onUpdate
  const update = onUpdate ?? (() => {})
  return (
    <div className="day-log" role="group" aria-labelledby="day-log-title">
      <div className="dash-card-head">
        <h3 id="day-log-title">{label}</h3>
        <button className="btn icon small" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="muted small-text">Nothing read on this day.</p>
      ) : (
        <ul className="book-list">
          {entries.map((e) => (
            <BookLine key={e.book.id} book={e.book} onShowBook={onShowBook}>
              {editing === e.book.id ? (
                <DayChangeEditor
                  book={e.book}
                  day={day}
                  entry={e}
                  onUpdate={update}
                  onClose={() => setEditing(null)}
                />
              ) : (
                <>
                  <span className="day-facts small-text">
                    {e.started && <span className="day-tag">Started on this day</span>}
                    {e.finished && <span className="day-tag">Finished on this day</span>}
                    {e.amount !== undefined && (
                      <span>
                        Read {amountText(e.book, e.amount)}
                        {amountUnit(e.book) !== 'percent' && (
                          <span className="muted"> · {percentText(e.amount)}% of the book</span>
                        )}
                      </span>
                    )}
                  </span>
                  {canEdit && <ChangeButton book={e.book} open={false} onOpen={() => setEditing(e.book.id)} />}
                </>
              )}
            </BookLine>
          ))}
        </ul>
      )}
      {canEdit && (
        editing === '__add' ? (
          <AddBookForDay
            books={books}
            day={day}
            entries={entries}
            onUpdate={update}
            onClose={() => setEditing(null)}
          />
        ) : (
          <button
            type="button"
            className="btn small day-add-btn"
            onClick={() => setEditing('__add')}
            aria-expanded={false}
          >
            + Add a book
          </button>
        )
      )}
    </div>
  )
}
