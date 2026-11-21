import { describe, expect, it, vi } from 'vitest'
import type { Book } from './library'

vi.mock('#/server/shelf', () => ({ loadShelf: async () => null, saveShelf: async () => ({ updated: 't' }) }))
vi.mock('#/server/openLibrary', () => ({ searchBooks: async () => [], getWorkDetails: async () => null }))
vi.mock('#/server/storytel', () => ({}))

const { STATUS_LABELS, hasMedal, localDay, sortBooks, statusPatch, timesRead } = await import('./library')
const { mergeBooks } = await import('./merge')
const { mergeIntoServer } = await import('./shelfMerge')
const { importStorytelBooks, syncedShelf } = await import('./storytelImport')
const { progressPatch } = await import('./readingLog')
const { periodStats } = await import('./stats')
const { reading, readingStreak } = await import('./insights')
const { searchShelf } = await import('./search')
const { readNextChoices } = await import('./readNext')
const { DEFAULT_LAYOUT, cleanLayout } = await import('./dashboardLayout')
const { bookOfTheDay, putAside, stoppedAtText } = await import('./didNotFinish')

const book = (id: string, extra: Partial<Book> = {}): Book => ({
  id,
  title: `Book ${id}`,
  authors: ['Cornelia Funke'],
  color: '#888888',
  status: 'want',
  addedAt: 0,
  ...extra,
})

async function refresh(onShelf: Book, status: Book['status'], progress?: number) {
  const updates: Array<Partial<Book>> = []
  await importStorytelBooks(
    [{ storytelId: 'st', title: onShelf.title, authors: onShelf.authors, status, progress }] as never,
    [onShelf],
    { updateBook: (_id: string, p: Partial<Book>) => updates.push(p), addBook: () => {}, onProgress: () => {} },
  )
  return updates
}

describe('"Did not finish" (#187)', () => {
  it('is called "Did not finish" and comes last in the status list', () => {
    expect(STATUS_LABELS.dnf).toBe('Did not finish')
    expect(Object.keys(STATUS_LABELS).at(-1)).toBe('dnf')
  })

  it('keeps the times read and the progress when a book is put aside and taken up again', () => {
    const reRead = book('a', { status: 'reading', readCount: 2, progress: 0.42 })
    const aside = { ...reRead, ...statusPatch(reRead, 'dnf') }
    expect(aside).toMatchObject({ status: 'dnf', progress: 0.42 })
    expect(timesRead(aside)).toBe(2)
    const again = { ...aside, ...statusPatch(aside, 'reading') }
    expect(again).toMatchObject({ status: 'reading', progress: 0.42 })
    expect(timesRead(again)).toBe(2)
  })

  it('keeps the times read when a finished book is put aside, and a finish adds one', () => {
    const done = book('a', { status: 'read', readCount: 1, finished: ['2026-01-01'] })
    const aside = { ...done, ...statusPatch(done, 'dnf', '2026-11-21') }
    expect(aside.status).toBe('dnf')
    expect(timesRead(aside)).toBe(1)
    const finished = { ...aside, ...statusPatch(aside, 'read', '2026-11-22') }
    expect(timesRead(finished)).toBe(2)
    expect(finished.finished).toEqual(['2026-01-01', '2026-11-22'])
  })

  it('counts a book she wanted to read and then put aside as started', () => {
    expect(statusPatch(book('a'), 'dnf', '2026-11-21')).toEqual({ status: 'dnf', started: ['2026-11-21'] })
  })

  it('comes last when arranged by reading status', () => {
    const shelf = [book('x', { status: 'dnf' }), book('r', { status: 'read' }), book('w'), book('c', { status: 'reading' })]
    expect(sortBooks(shelf, 'status').map((b) => b.id)).toEqual(['c', 'w', 'r', 'x'])
  })

  it('has no medal, unless it was read before', () => {
    expect(hasMedal(book('a', { status: 'dnf' }))).toBe(false)
    expect(hasMedal(book('a', { status: 'dnf', readCount: 1 }))).toBe(true)
    expect(hasMedal(book('a', { status: 'read' }))).toBe(true)
    expect(hasMedal(book('a', { status: 'reading', readCount: 1 }))).toBe(false)
  })

  it('is found by searching "dnf" or "did not finish", with the status as hint', () => {
    const shelf = [book('a', { status: 'dnf', title: 'Circe' }), book('b', { status: 'reading', title: 'Dune' })]
    expect(searchShelf(shelf, 'dnf').map((h) => [h.book.title, h.hint])).toEqual([['Circe', 'Did not finish']])
    expect(searchShelf(shelf, 'did not finish').map((h) => h.book.title)).toEqual(['Circe'])
  })
})

describe('what a book put aside counts for (#187)', () => {
  const shelf = [
    book('a', { status: 'dnf', progress: 0.4, readingLog: { '2026-11-05': 0.2, '2026-11-06': 0.2 } }),
    book('b', { status: 'reading', progress: 0.1 }),
    book('c', { status: 'read', finished: ['2026-03-01'] }),
  ]

  it('is not read and not being read', () => {
    expect(periodStats(shelf, { kind: 'all' }).books).toBe(1)
    expect(reading(shelf).map((b) => b.id)).toEqual(['b'])
    expect(readNextChoices(shelf)).toEqual([])
  })

  it('keeps the days she did read it in the streak', () => {
    expect(readingStreak(shelf, new Date(2026, 10, 6))).toMatchObject({ current: 2, best: 2, today: true })
  })
})

describe('Storytel and a book put aside (#187)', () => {
  const aside = () => book('a', { storytelId: 'st', status: 'dnf', progress: 0.4 })

  it('stays put aside when Storytel says reading or want to read', async () => {
    expect(await refresh(aside(), 'reading', 0.4)).toEqual([])
    expect(await refresh(aside(), 'want', 0.4)).toEqual([])
  })

  it('is taken up again when she listens on', async () => {
    expect(await refresh(aside(), 'reading', 0.6)).toEqual([
      { status: 'reading', storytelId: 'st', progress: 0.6, readingLog: { [localDay()]: 0.2 } },
    ])
  })

  it('is finished when Storytel says so', async () => {
    const [update] = await refresh(aside(), 'read', 1)
    expect(update).toMatchObject({ status: 'read', readCount: 1, progress: 1 })
  })

  it('is taken up again when she moves the progress on herself', () => {
    expect(progressPatch(aside(), 0.5)).toMatchObject({ status: 'reading', progress: 0.5 })
  })

  it('survives the nightly sync, and no other book changes', async () => {
    const other = book('b', { storytelId: 'st-b', status: 'paused', progress: 0.2 })
    const { books } = await syncedShelf(
      [
        { storytelId: 'st', title: 'Book a', authors: ['Cornelia Funke'], status: 'reading', progress: 0.4 },
        { storytelId: 'st-b', title: 'Book b', authors: ['Cornelia Funke'], status: 'reading', progress: 0.2 },
      ],
      [aside(), other],
      'Europe/Amsterdam',
    )
    expect(books).toEqual([aside(), other])
  })
})

describe('saving a shelf with a book put aside (#187)', () => {
  it('a copy being read wins over one put aside when merging two copies', () => {
    expect(mergeBooks(book('a', { status: 'dnf' }), book('o', { status: 'reading' })).status).toBe('reading')
    expect(mergeBooks(book('a', { status: 'dnf' }), book('o', { status: 'want' })).status).toBe('dnf')
  })

  it('the account server keeps the status and drops or changes no other book', () => {
    const server = { books: [book('a', { status: 'reading', editedAt: 1 }), book('b'), book('c', { status: 'read' })], updated: 't1' }
    const mine = [book('a', { status: 'dnf', editedAt: 2 }), book('b'), book('c', { status: 'read' })]
    // in step with the server
    expect(mergeIntoServer(server, { books: mine, base: 't1' }).books).toEqual(mine)
    // a stale device: the newer edit still wins, the rest is the server's
    const stale = mergeIntoServer(server, { books: [mine[0]], base: 't0' })
    expect(stale.books).toEqual([mine[0], server.books[1], server.books[2]])
    // an older device that doesn't know the status yet can't undo it
    const old = mergeIntoServer(
      { books: mine, updated: 't2' },
      { books: [book('a', { status: 'reading', editedAt: 1 }), book('b'), book('c', { status: 'read' })], base: 't1' },
    )
    expect(old.books[0].status).toBe('dnf')
  })

  it('a shelf saved before the status loads unchanged', () => {
    const before = [book('a', { status: 'paused' }), book('b', { status: 'read' })]
    expect(JSON.parse(JSON.stringify(before))).toEqual(before)
    expect(putAside(before)).toEqual([])
  })
})

describe('Give it another try (#187)', () => {
  const shelf = [
    book('a', { status: 'dnf', progress: 0.42 }),
    book('b', { status: 'dnf' }),
    book('c', { status: 'dnf' }),
    book('d', { status: 'reading' }),
  ]
  const days = Array.from({ length: 9 }, (_, i) => `2026-11-${String(20 + i).padStart(2, '0')}`)

  it('shows the same book all day', () => {
    expect(bookOfTheDay(shelf, '2026-11-21')).toBe(bookOfTheDay([...shelf].reverse(), '2026-11-21'))
  })

  it('shows every book put aside once before any comes back', () => {
    const shown = days.map((d) => bookOfTheDay(shelf, d)!.id)
    for (let i = 0; i + 3 <= shown.length; i++) expect(new Set(shown.slice(i, i + 3)).size).toBe(3)
    expect(shown.every((id) => id !== 'd')).toBe(true)
  })

  it('with two books, shows the other one the next day', () => {
    const two = shelf.slice(0, 2)
    expect(bookOfTheDay(two, '2026-11-21')!.id).not.toBe(bookOfTheDay(two, '2026-11-22')!.id)
    // also across the end of a month and a year
    expect(bookOfTheDay(two, '2026-12-31')!.id).not.toBe(bookOfTheDay(two, '2027-01-01')!.id)
  })

  it('shows nothing when no book is put aside', () => {
    expect(bookOfTheDay([book('x', { status: 'reading' })], '2026-11-21')).toBeUndefined()
  })

  it('says how far she got, with the page or listening time in the panel', () => {
    expect(stoppedAtText(book('a', { progress: 0.42, pages: 237 }))).toBe('Stopped at 42%')
    expect(stoppedAtText(book('a', { progress: 0.42, pages: 237 }), true)).toBe('Stopped at 42% · page 100 of 237')
    expect(stoppedAtText(book('a', { progress: 0.5, minutes: 600, formats: ['storytel'] }), true)).toBe(
      'Stopped at 50% · 5 h of 10 h',
    )
    expect(stoppedAtText(book('a', { progress: 0 }), true)).toBeNull()
    expect(stoppedAtText(book('a'))).toBeNull()
  })

  it('is at the bottom of the left column of Today, also on a dashboard arranged before it', () => {
    expect(DEFAULT_LAYOUT.sections.today[0].at(-1)).toBe('again')
    const saved = structuredClone(DEFAULT_LAYOUT)
    saved.sections.today[0] = saved.sections.today[0].filter((id) => id !== 'again')
    expect(cleanLayout(saved).sections.today[0].at(-1)).toBe('again')
  })
})
