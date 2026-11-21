import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClientOnly, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ZOOM_MAX, clampZoom } from '#/components/BookshelfScene'
import { SafeBookshelf } from '#/components/SafeBookshelf'
import { AddBookDialog } from '#/components/AddBookDialog'
import { BookPanel } from '#/components/BookPanel'
import { CoverPicker } from '#/components/CoverPicker'
import { askedPatch } from '#/lib/ratingAsk'
import type { SeriesChoice } from '#/lib/sleepSeries'
import { joinSeries, markSleepSeries, notInSeries, seriesQuestions, sleepSeriesKeys } from '#/lib/sleepSeries'
import type { Face } from '#/components/BookPanel'
import { nearestTurn } from '#/components/BookMesh'
import type { InspectTarget } from '#/components/BookMesh'
import { SORT_LABELS, STATUS_LABELS, statusPatch, useLibrary } from '#/lib/library'
import { progressPatch } from '#/lib/readingLog'
import type { SortKey, SyncStatus } from '#/lib/library'
import { useSession } from '#/lib/session'
import type { Account } from '#/lib/session'
import { SignIn } from '#/components/SignIn'
import { detectSeries, seriesGroups } from '#/lib/series'
import { pickReadNext, readNextChoices } from '#/lib/readNext'
import { Dashboard } from '#/components/Dashboard'
import { BadgeToasts } from '#/components/NewBlocks'
import { ChallengesPage } from '#/components/ChallengesPage'
import { ReminderToggle } from '#/components/ReminderToggle'
import { CalendarPage } from '#/components/CalendarPage'
import type { ChallengeSection } from '#/components/ChallengesPage'
import { useStorytelSync } from '#/lib/useStorytelSync'
import type { Tab } from '#/components/AddBookDialog'
import { SearchBox } from '#/components/SearchBox'
import { genreSuggestions } from '#/lib/genres'
import { useBookDetails } from '#/lib/useBookDetails'
import type { Book } from '#/lib/library'
import { filterByGenre, genreOptions as shelfGenres, reorderShown } from '#/lib/genreFilter'

export const Route = createFileRoute('/')({
  component: Home,
  // ?view=dashboard opens the dashboard (#59), ?view=challenges the Challenges page, so the
  // back button returns to the shelf; &focus= scrolls to one challenge ("Open ›")
  validateSearch: (
    search: Record<string, unknown>,
  ): { view?: 'dashboard' | 'challenges' | 'calendar'; focus?: ChallengeSection; month?: string } => {
    const view =
      search.view === 'dashboard' || search.view === 'challenges' || search.view === 'calendar' ? search.view : undefined
    const focus = FOCUS.find((f) => f === search.focus)
    // &month=2026-11 opens the Calendar page at that month
    const month = typeof search.month === 'string' && /^\d{4}-\d{2}$/.test(search.month) ? search.month : undefined
    return {
      ...(view && { view }),
      ...(view === 'challenges' && focus && { focus }),
      ...(view === 'calendar' && month && { month }),
    }
  },
})

const FACE_ANGLE: Record<Face, number> = { front: 0, spine: Math.PI / 2, back: Math.PI }

/**
 * the arrangements in the menu: genre is a filter now (#41), colour is gone
 * (#45), and Hanna doesn't use How I have it or Date added
 */
const NOT_IN_MENU: SortKey[] = ['genre', 'color', 'format', 'added']
const MENU_SORT_KEYS: SortKey[] = (Object.keys(SORT_LABELS) as SortKey[]).filter((k) => !NOT_IN_MENU.includes(k))

/** the book fields each arrangement sorts by */
const RESORT_ON: Partial<Record<SortKey, Array<keyof Book>>> = {
  title: ['title'],
  series: ['series', 'seriesIndex', 'title'],
  language: ['language'],
  format: ['format', 'formats'],
  rating: ['rating', 'title'],
  spice: ['spice', 'rating', 'title'],
}

function Home() {
  const session = useSession()
  const { state } = session
  if (state.kind === 'loading') return <div className="stage-loading">Opening the shelf…</div>
  if (state.kind === 'signed-out') return <SignIn onSignIn={session.signIn} onSignUp={session.signUp} />
  if (state.kind === 'error') return <SignIn onSignIn={session.signIn} onSignUp={session.signUp} problem={state.message} onRetry={session.retry} />
  if (state.kind === 'local') return <Shelf />
  return (
    <Shelf
      key={state.account.id}
      account={state.account}
      offline={state.offline}
      onSignOut={session.signOut}
      onExpired={session.expired}
    />
  )
}

interface ShelfProps {
  /** signed in to the account server; none: the shelf lives in this browser only */
  account?: Account
  /** signed in earlier, but the server can't be reached right now */
  offline?: boolean
  onSignOut?: () => Promise<void>
  onExpired?: () => void
}

function Shelf({ account, offline, onSignOut, onExpired }: ShelfProps) {
  const {
    books: allBooks,
    loaded,
    arrangement,
    sync,
    syncNow,
    addBook,
    removeBook,
    updateBook,
    mergeBook,
    reorder,
    sortBy,
  } = useLibrary(
      account?.id ?? null,
      onExpired,
    )
  // books not out yet are on the shelf too, as want-to-read
  const books = allBooks
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // the 3D shelf: zoomed in (1 is the whole case) and what a search lights up
  const [zoom, setZoom] = useState(1)
  const [matches, setMatches] = useState<string[] | null>(null)
  const highlight = useMemo(() => (matches ? new Set(matches) : null), [matches])
  const [adding, setAdding] = useState<Tab | null>(null)
  const [pickingCover, setPickingCover] = useState(false)
  /** the book just marked as read, to ask for a rating (#100) */
  const inspect = useRef<InspectTarget>({ rotY: 0, rotX: 0 })
  // share of the screen the details sheet covers on phones; the scene keeps the book above it
  const sheet = useRef(0.45)
  // the header's real height: what's below it starts under it (#181)
  const [header, headerPx] = useHeaderHeight()
  const onSheet = useCallback((share: number) => {
    sheet.current = share
  }, [])
  const syncCallbacks = useMemo(() => ({ addBook, updateBook }), [addBook, updateBook])
  const storytel = useStorytelSync(allBooks, syncCallbacks)
  const { state: syncState, dismiss: dismissSync } = storytel

  // the result message fades by itself
  useEffect(() => {
    if (syncState.kind !== 'done') return
    const t = setTimeout(dismissSync, 5000)
    return () => clearTimeout(t)
  }, [syncState, dismissSync])

  // the refresh button (#68): sync the shelf with the account server, then refresh from Storytel
  const [syncing, setSyncing] = useState(false)
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null)
  useEffect(() => {
    if (!notice?.ok) return
    const t = setTimeout(() => setNotice(null), 3000)
    return () => clearTimeout(t)
  }, [notice])
  const refreshAll = async () => {
    // books changed by hand go back to their place in the chosen arrangement (a shelf
    // arranged by dragging has none, and keeps its order)
    const resort = () => {
      if (arrangement) sortBy(arrangement)
    }
    // no account and no Storytel: nothing to sync with yet
    if (!account && !storytel.login.saved) {
      resort()
      return setAdding('storytel')
    }
    setNotice(null)
    dismissSync()
    setSyncing(true)
    try {
      const { books: shelf, ok } = await syncNow()
      if (storytel.login.saved) {
        // Storytel compares with the shelf just synced, so a book added on another device isn't added twice
        await storytel.refresh(shelf)
        if (!ok) setNotice({ text: "The account server can't be reached: changes are kept here.", ok: false })
      } else {
        setNotice(
          ok
            ? { text: 'Shelf synced.', ok: true }
            : { text: "The account server can't be reached: changes are kept here.", ok: false },
        )
      }
    } finally {
      // after the sync, so books from other devices and Storytel are put in place too
      resort()
      setSyncing(false)
    }
  }
  const busy = syncing || syncState.kind === 'busy'
  const refreshLabel =
    (account
      ? storytel.login.saved
        ? 'Sync the shelf and refresh from Storytel'
        : 'Sync the shelf'
      : storytel.login.saved
        ? 'Refresh from Storytel'
        : 'Connect Storytel') + (arrangement ? ', and put the books back in order' : '')

  const selected = books.find((b) => b.id === selectedId) ?? null
  const seriesMap = useMemo(() => detectSeries(books), [books])
  const selectedSeries = selected ? seriesMap.get(selected.id) : undefined
  // the whole series as a sleep read; new books by a series author are asked about once
  const groups = useMemo(() => seriesGroups(books), [books])
  const sleepKeys = useMemo(() => sleepSeriesKeys(books, groups), [books, groups])
  const selectedGroup = selected ? groups.get(selected.id) : undefined
  const allQuestions = useMemo(() => (loaded ? seriesQuestions(books) : []), [books, loaded])
  // "Part of a series?" in the book panel too (#131); the dashboard's "Waiting for you" lists them all
  const selectedChoices = selected ? allQuestions.find((q) => q.book.id === selected.id)?.choices : undefined
  const genreOptions = useMemo(() => genreSuggestions(books.flatMap((b) => b.genres ?? [])), [books])
  useBookDetails(allBooks, loaded, updateBook)

  // show only one genre (#41); a genre no book has any more falls back to all books
  const [genre, setGenre] = useState<string | null>(null)
  const genreChoices = useMemo(() => shelfGenres(books), [books])
  const activeGenre = genre && genreChoices.some((g) => g.value === genre) ? genre : null
  const shown = useMemo(() => filterByGenre(books, activeGenre), [books, activeGenre])
  const reorderShelf = useCallback(
    (ids: string[]) => reorder(activeGenre ? reorderShown(books.map((b) => b.id), ids) : ids),
    [reorder, books, activeGenre],
  )

  // what to read next (#58): from the genre shown, if one is picked
  const readNext = useMemo(() => {
    const shownIds = new Set(shown.map((b) => b.id))
    return readNextChoices(books).filter((b) => shownIds.has(b.id))
  }, [books, shown])

  const select = useCallback((id: string | null) => {
    if (id) inspect.current = { rotY: 0, rotX: 0 }
    setSelectedId(id)
  }, [])

  // the shelf, the dashboard (#59) or the Challenges page
  const search = Route.useSearch()
  const view: View = search.view ?? 'shelf'
  const onDashboard = view === 'dashboard'
  const offShelf = view !== 'shelf'
  const navigate = useNavigate({ from: '/' })
  const showView = useCallback(
    (to: View) => {
      if (to !== 'shelf') select(null)
      navigate({ search: to === 'shelf' ? {} : { view: to } })
    },
    [navigate, select],
  )
  const openCalendar = useCallback(
    (month: string) => {
      select(null)
      navigate({ search: { view: 'calendar', month } })
    },
    [navigate, select],
  )
  const openChallenges = useCallback(
    (focus: ChallengeSection) => {
      select(null)
      navigate({ search: { view: 'challenges', focus } })
    },
    [navigate, select],
  )
  /** a book picked on the dashboard or in the search: show it on the shelf */
  const showBook = useCallback(
    (id: string | null) => {
      if (id && offShelf) navigate({ search: {} })
      select(id)
    },
    [navigate, offShelf, select],
  )

  const showFace = useCallback((face: Face) => {
    const t = inspect.current
    t.rotY = nearestTurn(FACE_ANGLE[face], t.rotY)
    t.rotX = 0
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return
      // a dialog on top (e.g. the cover picker) handles its own keys
      if (document.querySelector('dialog[open]')) return
      if (e.key === 'Escape') select(null)
      // snap to the next quarter turn
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const t = inspect.current
        const q = Math.PI / 2
        t.rotY = (Math.round(t.rotY / q) + (e.key === 'ArrowRight' ? 1 : -1)) * q
        t.rotX = 0
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, select])

  const counts = books.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1
    return acc
  }, {})

  const pickNext = () => select(pickReadNext(readNext, selectedId)?.id ?? null)
  const sortSelect = (done?: () => void) => (
    <select
      className="input"
      value=""
      disabled={books.length < 2}
      onChange={(e) => {
        if (e.target.value) sortBy(e.target.value as SortKey)
        done?.()
      }}
    >
      <option value="">Sort…</option>
      {MENU_SORT_KEYS.map((k) => (
        <option key={k} value={k}>
          {SORT_LABELS[k]}
        </option>
      ))}
    </select>
  )
  const genreSelect = (done?: () => void) => (
    <select
      className="input"
      value={activeGenre ?? ''}
      onChange={(e) => {
        setGenre(e.target.value || null)
        done?.()
      }}
      aria-label="Show only one genre"
    >
      <option value="">All genres</option>
      {genreChoices.map((g) => (
        <option key={g.value} value={g.value}>
          {g.label} ({g.count})
        </option>
      ))}
    </select>
  )

  return (
    <div className="app" style={headerPx ? ({ '--header-h': `${headerPx}px` } as React.CSSProperties) : undefined}>
      <header className="topbar" ref={header}>
        <div className="brand">
          <div className="brand-title">
            {/* the ☰ menu only holds the shelf's tools on a phone: elsewhere it would be empty */}
            {!offShelf && (
              <ViewMenu>
              {!offShelf &&
                ((close) => (
                  <div className="menu-tools mobile-only">
                    <label className="menu-field">
                      <span className="muted">Arrange by</span>
                      {sortSelect(close)}
                    </label>
                    {genreChoices.length > 0 && (
                      <label className="menu-field">
                        <span className="muted">Genre</span>
                        {genreSelect(close)}
                      </label>
                    )}
                    <button
                      disabled={readNext.length === 0}
                      onClick={() => {
                        close()
                        pickNext()
                      }}
                    >
                      <span aria-hidden>🎲</span> What next?
                    </button>
                  </div>
                ))}
              </ViewMenu>
            )}
            <h1>Hanna's Reading List</h1>
          </div>
          <p className="muted">
            {books.length === 0
              ? 'An empty shelf, waiting for stories'
              : activeGenre
                ? `${shown.length} of ${books.length} books · ${genreChoices.find((g) => g.value === activeGenre)!.label}`
                : `${books.length} book${books.length === 1 ? '' : 's'} · ` +
                (['reading', 'paused', 'want', 'read', 'dnf'] as const)
                  .filter((s) => counts[s])
                  .map((s) => `${counts[s]} ${STATUS_LABELS[s].toLowerCase()}`)
                  .join(' · ')}
          </p>
          {/* on a phone the brand's children sit in the header's grid: the tabs get a row of their own (#181) */}
          <PageTabs view={view} onView={showView} />
        </div>
        <div className="toolbar">
          <SearchBox books={books} detectedSeries={seriesMap} onPick={showBook} onMatches={setMatches} />
          {!offShelf && (
            // on a phone these are in the ☰ menu instead (#88)
            <>
              <label className="sort desktop-only">
                <span className="muted">Arrange by</span>
                {sortSelect()}
              </label>
              {genreChoices.length > 0 && (
                <label className={`sort genre-filter desktop-only${activeGenre ? ' active' : ''}`}>
                  <span className="muted">Genre</span>
                  {genreSelect()}
                </label>
              )}
              <button
                className="btn read-next desktop-only"
                aria-label="What to read next"
                disabled={readNext.length === 0}
                // pressing again shows another one
                onClick={pickNext}
                title={
                  readNext.length
                    ? 'Pick a book to read next: no re-reads, and only the next book of a series'
                    : 'Nothing to read next: no unread books waiting on the shelf'
                }
              >
                <span aria-hidden>🎲</span> What next?
              </button>
            </>
          )}
          <button
            className={`btn icon refresh${busy ? ' spinning' : ''}`}
            disabled={busy}
            onClick={refreshAll}
            aria-label={refreshLabel}
            title={refreshLabel}
          >
            <span aria-hidden>↻</span>
          </button>
          <button className="btn primary" onClick={() => setAdding('search')}>
            + Add<span className="hide-mobile"> book</span>
          </button>
          {account && onSignOut && (
            <AccountMenu account={account} sync={offline && sync === 'loading' ? 'offline' : sync} onSignOut={onSignOut} />
          )}
        </div>
      </header>

      <main className="stage">
        <ClientOnly fallback={<div className="stage-loading">Building the shelf…</div>}>
          <SafeBookshelf
            books={shown}
            selectedId={selectedId}
            inspect={inspect}
            onSelect={select}
            onReorder={reorderShelf}
            // a shelf still arranged by genre or colour from before #41/#45 keeps its order, without those nooks
            arrangement={arrangement && MENU_SORT_KEYS.includes(arrangement) ? arrangement : null}
            sheet={sheet}
            highlight={highlight}
            zoom={zoom}
            onZoom={setZoom}
            topInset={headerPx}
          />
        </ClientOnly>
        {!offShelf && !selected && books.length > 0 && (
          <div className="zoom-controls" role="group" aria-label="Zoom">
            <button className="btn icon" aria-label="Zoom in" title="Zoom in (Ctrl + scroll)" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom(clampZoom(zoom * 1.4))}>
              +
            </button>
            <button className="btn icon" aria-label="Zoom out" title="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(clampZoom(zoom / 1.4))}>
              −
            </button>
            <button className="btn icon" aria-label="Show the whole bookcase" title="Show the whole bookcase" disabled={zoom <= 1} onClick={() => setZoom(1)}>
              ⤢
            </button>
          </div>
        )}

        {loaded && books.length === 0 && (
          <div className="empty">
            <p>Add your first book to start filling the shelf.</p>
            <button className="btn primary" onClick={() => setAdding('search')}>
              + Add book
            </button>
          </div>
        )}
        {onDashboard && (
          <Dashboard
            books={books}
            onShowBook={showBook}
            onUpdate={updateBook}
            accountId={account?.id ?? null}
            onOpenChallenges={openChallenges}
            onOpenCalendar={openCalendar}
            onAdd={addBook}
          />
        )}
        {view === 'calendar' && <CalendarPage books={books} onShowBook={showBook} onUpdate={updateBook} startMonth={search.month} />}
        {view === 'challenges' && (
          <ChallengesPage
            books={books}
            accountId={account?.id ?? null}
            onShowBook={showBook}
            onUpdate={updateBook}
            focus={search.focus}
          />
        )}
      </main>

      <BadgeToasts books={books} accountId={account?.id ?? null} ready={loaded} />

      {selected && (
        <BookPanel
          key={selected.id}
          book={selected}
          onFace={showFace}
          // finishing a book counts as a read, finishing it again as one more (#53)
          onStatus={(status) => {
            // no pop-up: a finished book waits under "Waiting for you" on the dashboard
            updateBook(selected.id, statusPatch(selected, status))
          }}
          // what she read today goes in the reading log (#76)
          onProgress={(progress) => updateBook(selected.id, (b) => progressPatch(b, progress))}
          onUpdate={(patch) => {
            // rating it in the book panel takes it off "Waiting for you"
            updateBook(selected.id, 'rating' in patch || 'spice' in patch ? { ...patch, ...askedPatch(selected) } : patch)
            // move the book to its new place straight away when the change affects the arrangement
            if (arrangement && RESORT_ON[arrangement]?.some((k) => k in patch)) sortBy(arrangement)
          }}
          detectedSeries={selectedSeries}
          genreOptions={genreOptions}
          onChangeCover={() => setPickingCover(true)}
          shelf={books}
          {...(selectedGroup?.key && {
            sleepSeries: { name: selectedGroup.name, on: sleepKeys.has(selectedGroup.key) },
            onSleepSeries: (on: boolean) => {
              for (const [id, patch] of markSleepSeries(books, selectedGroup.key, on, groups)) updateBook(id, patch)
            },
          })}
          {...(selectedChoices && {
            seriesChoices: selectedChoices,
            onSeriesAnswer: (choice: SeriesChoice | null) =>
              updateBook(selected.id, choice ? joinSeries(choice) : notInSeries),
          })}
          onMerge={(otherId) => mergeBook(selected.id, otherId)}
          onRemove={() => {
            select(null)
            removeBook(selected.id)
          }}
          onClose={() => select(null)}
          onSheet={onSheet}
        />
      )}

      {selected && pickingCover && (
        <CoverPicker
          book={selected}
          onChange={(patch) => updateBook(selected.id, patch)}
          onClose={() => setPickingCover(false)}
        />
      )}

      {adding && (
        <AddBookDialog
          existing={allBooks}
          onAdd={addBook}
          onUpdate={updateBook}
          onClose={() => setAdding(null)}
          storytelLogin={storytel.login}
          onStorytelLogin={storytel.setLogin}
          initialTab={adding}
        />
      )}

      {notice && syncState.kind === 'idle' && (
        <div className={`toast ${notice.ok ? 'done' : 'error'}`} role="status" aria-live="polite">
          <span>{notice.text}</span>
          <button className="icon-btn" onClick={() => setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {syncState.kind !== 'idle' && (
        <div className={`toast ${syncState.kind}`} role="status" aria-live="polite">
          {syncState.kind === 'busy' ? (
            <span>
              {syncState.total
                ? `Adding new books ${syncState.done} / ${syncState.total}…`
                : 'Checking Storytel…'}
            </span>
          ) : (
            <>
              <span>{syncState.message}</span>
              {syncState.kind === 'error' && !storytel.login.saved && (
                <button
                  className="btn"
                  onClick={() => {
                    dismissSync()
                    setAdding('storytel')
                  }}
                >
                  Sign in
                </button>
              )}
              <button className="icon-btn" onClick={dismissSync} aria-label="Dismiss">
                ×
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

type View = 'shelf' | 'dashboard' | 'challenges' | 'calendar'

const VIEWS = [
  { view: 'shelf', icon: '📚', label: 'Bookshelf' },
  { view: 'dashboard', icon: '📊', label: 'Dashboard' },
  { view: 'challenges', icon: '🏆', label: 'Challenges' },
  { view: 'calendar', icon: '📅', label: 'Calendar' },
] as const

const FOCUS: ChallengeSection[] = ['goal', 'monthly', 'bingo', 'alphabet']

/** The header's height in CSS px, kept up to date as it changes (search chip, wrapping, rotating the phone). */
function useHeaderHeight() {
  const [px, setPx] = useState(0)
  const [el, setEl] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (!el) return
    const measure = () => setPx(Math.round(el.getBoundingClientRect().height))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return [setEl, px] as const
}

/** The pages, always in view as tabs: one tap to switch. On a phone just the icons. */
function PageTabs({ view, onView }: { view: View; onView: (view: View) => void }) {
  return (
    <nav className="page-tabs" aria-label="Pages">
      {VIEWS.map((v) => (
        <button
          key={v.view}
          type="button"
          className={v.view === view ? 'page-tab active' : 'page-tab'}
          aria-current={v.view === view ? 'page' : undefined}
          aria-label={v.label}
          title={v.label}
          onClick={() => onView(v.view)}
        >
          <span aria-hidden>{v.icon}</span>
          <span className="page-tab-label">{v.label}</span>
        </button>
      ))}
    </nav>
  )
}

/** The ☰ menu: the shelf's tools on a phone (#88) and the reading reminder; the pages are tabs now. */
function ViewMenu({
  children,
}: {
  /** more in the menu, e.g. the shelf's tools on a phone (#88); `close` closes the menu */
  children?: false | ((close: () => void) => React.ReactNode)
}) {
  const menu = useRef<HTMLDetailsElement>(null)
  // close when clicking anywhere else
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (menu.current?.open && !menu.current.contains(e.target as Node)) menu.current.open = false
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  return (
    <details className="view-menu phone-menu" ref={menu}>
      <summary className="btn icon" aria-label="Menu" title="Menu">
        <span aria-hidden>☰</span>
      </summary>
      <nav className="view-menu-list" aria-label="More">
        {children && children(() => menu.current && (menu.current.open = false))}
        <ReminderToggle />
      </nav>
    </details>
  )
}

const SYNC_TEXT: Record<SyncStatus, string> = {
  local: 'Saved in this browser',
  loading: 'Loading your shelf…',
  saved: 'All changes saved',
  saving: 'Saving…',
  offline: "Can't reach the server. Changes are kept on this device and saved when it's back.",
  'too-big': 'The shelf is too large to save (too many uploaded covers). Changes are kept on this device.',
}

function AccountMenu({
  account,
  sync,
  onSignOut,
}: {
  account: Account
  sync: SyncStatus
  onSignOut: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const name = account.name || account.email
  return (
    <details className="account">
      <summary className="btn account-btn" aria-label={`Account: ${name}. ${SYNC_TEXT[sync]}`} title={SYNC_TEXT[sync]}>
        <span aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
        <span className={`sync-dot ${sync}`} aria-hidden />
      </summary>
      <div className="account-menu">
        <p>
          Signed in as <strong>{account.email}</strong>
        </p>
        <p className={`muted sync-text ${sync}`} role="status">
          {SYNC_TEXT[sync]}
        </p>
        <button
          className="btn small"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onSignOut()
            } catch {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </details>
  )
}
