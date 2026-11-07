import { useCallback, useEffect, useRef, useState } from 'react'
import { loadShelf, saveShelf, type RemoteShelf } from '#/server/shelf'
import { seriesGroups } from './series'
import { NOT_SIGNED_IN } from './signedOut'
import { languageName } from './languages'
import { isSortKey, type SortKey } from './sortKeys'
import { mergeBooks } from './merge'

export type ReadingStatus = 'want' | 'reading' | 'read'

export interface Book {
  id: string
  title: string
  authors: string[]
  year?: number
  pages?: number
  isbn?: string
  /** Open Library work key, e.g. "/works/OL45804W" */
  workKey?: string
  /** Storytel consumable id, set for books imported from Storytel */
  storytelId?: string
  /** more Storytel ids for the same book, from copies merged into this one */
  storytelIds?: string[]
  /** ids of the copies merged into this book, so they don't come back */
  mergedIds?: string[]
  /** books Hanna said are not the same book, so they aren't suggested for merging */
  notDuplicates?: string[]
  /** URL of the front cover (served through our same-origin proxy so WebGL can use it) */
  coverUrl?: string
  /** width / height of the cover image, used to shape the 3D book */
  coverAspect?: number
  description?: string
  /** Dominant colour used for the spine and back cover */
  color: string
  status: ReadingStatus
  /** reading progress, 0..1 – shown as a bookmark while the book is being read */
  progress?: number
  /** how many times the book has been finished (entered by hand) */
  readCount?: number
  /** series name and number, entered by hand (otherwise read from the title) */
  series?: string
  seriesIndex?: number
  /** the title as it was added, kept while the title is changed by hand */
  originalTitle?: string
  /** every way Hanna has the book, e.g. a paperback and on Storytel (see formatsOf) */
  formats?: BookFormat[]
  /** @deprecated the single format from before `formats`; still read by formatsOf */
  format?: BookFormat
  /** two-letter language code, e.g. "en", "de" */
  language?: string
  /** shelf genres; an empty list means "looked them up, found none" */
  genres?: string[]
  /** lent to a friend: to whom, and since when (yyyy-mm-dd) */
  lent?: { to: string; since?: string }
  addedAt: number
}

export type BookFormat =
  | 'paperback'
  | 'hardcover'
  | 'ebook'
  | 'audiobook'
  | 'storytel'
  | 'library'
  | 'borrowed'
  | 'other'

export const FORMAT_LABELS: Record<BookFormat, string> = {
  paperback: 'Paperback',
  hardcover: 'Hardcover',
  ebook: 'E-book',
  audiobook: 'Audiobook',
  storytel: 'Storytel',
  library: 'From the library',
  borrowed: 'Borrowed',
  other: 'Other',
}

/** Formats you can hold in your hands; they win when a book is in several groups. */
export const PHYSICAL_FORMATS: BookFormat[] = ['paperback', 'hardcover', 'library', 'borrowed']

/** Which group wins for a book with several formats: physical first, then the rest. */
const FORMAT_PRIORITY: BookFormat[] = [
  ...PHYSICAL_FORMATS,
  ...(Object.keys(FORMAT_LABELS) as BookFormat[]).filter((f) => !PHYSICAL_FORMATS.includes(f)),
]

/**
 * Every way Hanna has the book, in the order of FORMAT_LABELS. Books from
 * before `formats` use their single `format`; Storytel imports count as
 * Storytel until she says otherwise.
 */
export function formatsOf(book: Book): BookFormat[] {
  const list = book.formats ?? (book.format ? [book.format] : book.storytelId ? ['storytel' as const] : [])
  return (Object.keys(FORMAT_LABELS) as BookFormat[]).filter((f) => list.includes(f))
}

/** The format a book is grouped under: a physical copy wins over e-book, audiobook or Storytel. */
export function primaryFormat(book: Book): BookFormat | undefined {
  const list = formatsOf(book)
  return FORMAT_PRIORITY.find((f) => list.includes(f))
}

/** The patch that sets a book's formats (and retires the old single field). */
export function withFormats(formats: BookFormat[]): Pick<Book, 'formats' | 'format'> {
  return { formats: (Object.keys(FORMAT_LABELS) as BookFormat[]).filter((f) => formats.includes(f)), format: undefined }
}

export type NewBook = Omit<Book, 'id' | 'addedAt' | 'status'> & {
  status?: ReadingStatus
}

export type { SortKey }

export const SORT_LABELS: Record<SortKey, string> = {
  title: 'Title',
  author: 'Author',
  series: 'Series',
  genre: 'Genre',
  language: 'Language',
  format: 'How I have it',
  year: 'Year',
  color: 'Colour',
  added: 'Date added',
  status: 'Reading status',
}

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  want: 'Want to read',
  reading: 'Reading',
  read: 'Read',
}

const STORAGE_KEY = 'hannas-reading-list:v1'
const ARRANGEMENT_KEY = 'hannas-reading-list:arrangement'
/**
 * Set once the shelf this browser had before accounts (under STORAGE_KEY) is
 * safely on the account server. The old copy itself is left in place as a backup.
 */
const MIGRATED_KEY = 'hannas-reading-list:v1:migrated'
/** Netlify functions accept requests up to 6 MB; uploaded covers are the bulk of it */
const SYNC_LIMIT = 5_500_000
const DEBOUNCE_MS = 1200
const RETRY_MS = 30_000

export type SyncStatus =
  /** no account: the shelf lives in this browser only */
  | 'local'
  | 'loading'
  | 'saved'
  | 'saving'
  /** the server can't be reached: changes are kept here and sent later */
  | 'offline'
  /** too large to send (lots of uploaded covers) */
  | 'too-big'

/** Times a book has been read: finished books count at least once. */
export function timesRead(book: Book) {
  return Math.max(book.readCount ?? 0, book.status === 'read' ? 1 : 0)
}

function loadBooks(key: string): Book[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Book[]) : []
  } catch {
    return []
  }
}

function loadArrangement(key: string): SortKey | null {
  try {
    const a = localStorage.getItem(key)
    return isSortKey(a) ? a : null
  } catch {
    return null
  }
}

function store(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* storage full or blocked – the shelf still works for this session */
  }
}

function flagged(key: string | null) {
  try {
    return !!key && !!localStorage.getItem(key)
  } catch {
    return false
  }
}

/** The shelf this browser had before accounts, while it hasn't reached an account yet. */
function preAccountShelf(accountId: string | null) {
  return accountId && !flagged(MIGRATED_KEY) ? loadBooks(STORAGE_KEY) : []
}

function storageKeys(accountId: string | null) {
  return accountId
    ? {
        books: `${STORAGE_KEY}:${accountId}`,
        arrangement: `${ARRANGEMENT_KEY}:${accountId}`,
        /** set while this device has changes the server hasn't got yet */
        unsynced: `${STORAGE_KEY}:${accountId}:unsynced`,
      }
    : { books: STORAGE_KEY, arrangement: ARRANGEMENT_KEY, unsynced: null }
}

const norm = (s: string | undefined) => (s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/** Adds the books of `extra` that `base` doesn't have yet (same id, Storytel id, ISBN, or title and author). */
export function mergeShelves(base: Book[], extra: Book[]) {
  const keys = (b: Book) =>
    [
      `id:${b.id}`,
      ...(b.mergedIds ?? []).map((id) => `id:${id}`),
      b.storytelId && `st:${b.storytelId}`,
      ...(b.storytelIds ?? []).map((id) => `st:${id}`),
      b.isbn && `isbn:${b.isbn}`,
      `ta:${norm(b.title)}|${norm(b.authors[0])}`,
    ].filter((k): k is string => !!k)
  // only compared with `base`: two copies already on the same shelf both stay
  const seen = new Set(base.flatMap(keys))
  return [...base, ...extra.filter((b) => !keys(b).some((k) => seen.has(k)))]
}

/**
 * The library. Without an account it lives in this browser's localStorage.
 * With one, the account server holds it and this device keeps a copy, so the
 * shelf opens at once and keeps working offline. Changes are sent a moment
 * after they're made; edits from other devices are picked up when the page
 * comes back into view. The newest save wins.
 *
 * The account must not change while mounted (give the component a `key`).
 */
export function useLibrary(accountId: string | null = null, onSignedOut?: () => void) {
  const [books, setBooks] = useState<Book[]>([])
  const [loaded, setLoaded] = useState(false)
  /** the sort last applied; drag-and-drop tweaks keep it (the shelf is still mostly in that order) */
  const [arrangement, setArrangement] = useState<SortKey | null>(null)
  const [sync, setSync] = useState<SyncStatus>(accountId ? 'loading' : 'local')

  const [keys] = useState(() => storageKeys(accountId))
  const latest = useRef({ books, arrangement })
  latest.current = { books, arrangement }
  /** the next change comes from the server (or this device's copy), not from an edit */
  const fromServer = useRef(false)
  const serverUpdated = useRef<string | null>(null)
  const saving = useRef(false)
  const saveAgain = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  /** the merged pre-account shelf, until it has been put on screen and sent */
  const migrating = useRef<Book[] | null>(null)
  /** a save is on its way that includes the pre-account shelf */
  const migrationSent = useRef(false)
  const signedOut = useRef(onSignedOut)
  signedOut.current = onSignedOut

  const adopt = useCallback((b: Book[], a: SortKey | null) => {
    fromServer.current = true
    setBooks(b)
    setArrangement(a)
  }, [])

  // assigned below; lets `failed` and `push` refer to each other
  const pushRef = useRef<() => void>(() => {})

  const failed = useCallback(
    (e: unknown) => {
      if (e instanceof Error && e.message === NOT_SIGNED_IN) {
        signedOut.current?.()
        return
      }
      setSync('offline')
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (flagged(keys.unsynced)) pushRef.current()
      }, RETRY_MS)
    },
    [keys],
  )

  const push = useCallback(async () => {
    if (!accountId) return
    clearTimeout(timer.current)
    if (saving.current) {
      saveAgain.current = true
      return
    }
    const { books, arrangement } = latest.current
    const withPreAccount = migrationSent.current
    if (JSON.stringify(books).length > SYNC_LIMIT) {
      setSync('too-big')
      return
    }
    saving.current = true
    setSync('saving')
    try {
      const r = await saveShelf({ data: { books, arrangement } })
      serverUpdated.current = r.updated
      if (withPreAccount) {
        migrationSent.current = false
        store(MIGRATED_KEY, JSON.stringify({ account: accountId, at: r.updated }))
      }
      if (!saveAgain.current) {
        store(keys.unsynced!, null)
        setSync('saved')
      }
    } catch (e) {
      saveAgain.current = false
      failed(e)
    } finally {
      saving.current = false
      if (saveAgain.current) {
        saveAgain.current = false
        pushRef.current()
      }
    }
  }, [accountId, keys, failed])
  pushRef.current = push

  // the server's copy, folded into this device's: on first load and when the page comes back into view
  const reconcile = useCallback(
    (remote: RemoteShelf | null) => {
      const before = serverUpdated.current
      serverUpdated.current = remote?.updated ?? null
      const unsynced = flagged(keys.unsynced)
      const current = latest.current
      // this device's copy wins when the server has none or this device has unsent changes
      const mine = !remote || unsynced
      const pre = preAccountShelf(accountId)
      if (pre.length) {
        // bring along the shelf this browser had before accounts; it stays marked as
        // waiting (and stays on the device) until the server has confirmed it has it
        const merged = mergeShelves(mine ? current.books : remote.books, pre)
        const arrangement = (mine ? current.arrangement : remote.arrangement) ?? loadArrangement(ARRANGEMENT_KEY)
        migrating.current = merged
        store(keys.unsynced!, '1')
        adopt(merged, arrangement)
      } else if (mine) {
        if (current.books.length || remote) {
          store(keys.unsynced!, '1')
          pushRef.current()
        } else setSync('saved')
      } else {
        if (remote.updated !== before) adopt(remote.books, remote.arrangement)
        setSync('saved')
      }
    },
    [accountId, keys, adopt],
  )

  // first load: this device's copy straight away (with the pre-account shelf), then the server's
  useEffect(() => {
    adopt(
      mergeShelves(loadBooks(keys.books), preAccountShelf(accountId)),
      loadArrangement(keys.arrangement) ?? (accountId ? loadArrangement(ARRANGEMENT_KEY) : null),
    )
    setLoaded(true)
    if (!accountId) return

    let cancelled = false
    loadShelf()
      .then((remote) => {
        if (!cancelled) reconcile(remote)
      })
      .catch((e) => {
        if (!cancelled) failed(e)
      })
    return () => {
      cancelled = true
      clearTimeout(timer.current)
    }
    // runs once: the account is fixed for the life of the component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // keep this device's copy, and send edits to the server
  useEffect(() => {
    if (!loaded) return
    store(keys.books, JSON.stringify(books))
    store(keys.arrangement, arrangement)
    if (fromServer.current) {
      fromServer.current = false
      if (!accountId || books !== migrating.current) return
      // the merged pre-account shelf is on screen: send it
      migrating.current = null
      migrationSent.current = true
      pushRef.current()
      return
    }
    if (!accountId) return
    store(keys.unsynced!, '1')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => pushRef.current(), DEBOUNCE_MS)
  }, [books, arrangement, loaded, accountId, keys])

  // back on the page: send what's waiting, or pick up changes from other devices
  useEffect(() => {
    if (!accountId) return
    const check = async () => {
      if (document.visibilityState !== 'visible' || saving.current) return
      if (flagged(keys.unsynced)) return pushRef.current()
      try {
        const remote = await loadShelf()
        if (!flagged(keys.unsynced)) reconcile(remote)
      } catch (e) {
        failed(e)
      }
    }
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    return () => {
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
    }
  }, [accountId, keys, reconcile, failed])

  const addBook = useCallback((book: NewBook) => {
    const full: Book = {
      ...book,
      status: book.status ?? 'want',
      id: crypto.randomUUID(),
      addedAt: Date.now(),
    }
    setBooks((prev) => [...prev, full])
    return full
  }, [])

  const removeBook = useCallback((id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id))
  }, [])

  const updateBook = useCallback((id: string, patch: Partial<Book>) => {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }, [])

  const reorder = useCallback((ids: string[]) => {
    setBooks((prev) => {
      const byId = new Map(prev.map((b) => [b.id, b]))
      const next = ids.map((id) => byId.get(id)).filter((b): b is Book => !!b)
      // keep anything not mentioned (should not happen, but never lose a book)
      for (const b of prev) if (!ids.includes(b.id)) next.push(b)
      return next
    })
  }, [])

  /** Merges `otherId` into `keepId` (see mergeBooks); the merged book stays where `keepId` was. */
  const mergeBook = useCallback((keepId: string, otherId: string) => {
    setBooks((prev) => {
      const keep = prev.find((b) => b.id === keepId)
      const other = prev.find((b) => b.id === otherId)
      if (!keep || !other || keep === other) return prev
      const merged = mergeBooks(keep, other)
      return prev.filter((b) => b.id !== otherId).map((b) => (b.id === keepId ? merged : b))
    })
  }, [])

  const sortBy = useCallback((key: SortKey) => {
    setBooks((prev) => sortBooks(prev, key))
    setArrangement(key)
  }, [])

  return { books, loaded, arrangement, sync, addBook, removeBook, updateBook, mergeBook, reorder, sortBy }
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

function sortableTitle(t: string) {
  return t.replace(/^(the|a|an)\s+/i, '')
}

function authorSurname(b: Book) {
  const first = b.authors[0] ?? ''
  const parts = first.trim().split(/\s+/)
  return parts[parts.length - 1] ?? ''
}

export function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}

const STATUS_ORDER: Record<ReadingStatus, number> = { reading: 0, want: 1, read: 2 }

export function sortBooks(books: Book[], key: SortKey): Book[] {
  const copy = [...books]
  switch (key) {
    case 'title':
      return copy.sort((a, b) => collator.compare(sortableTitle(a.title), sortableTitle(b.title)))
    case 'author':
      return copy.sort(
        (a, b) =>
          collator.compare(authorSurname(a), authorSurname(b)) ||
          collator.compare(a.title, b.title),
      )
    case 'series': {
      // each series together and in order, the series by author; books that
      // are not part of a series stand together at the end, by author
      const groups = seriesGroups(copy)
      const groupAuthor = new Map<string, string>()
      for (const b of copy) {
        const key = groups.get(b.id)!.key
        const name = authorSurname(b)
        const known = groupAuthor.get(key)
        if (known === undefined || collator.compare(name, known) < 0) groupAuthor.set(key, name)
      }
      return copy.sort((a, b) => {
        const ga = groups.get(a.id)!
        const gb = groups.get(b.id)!
        const standalone = Number(ga.key === '') - Number(gb.key === '')
        if (standalone) return standalone
        if (ga.key === '' && gb.key === '') {
          return collator.compare(authorSurname(a), authorSurname(b)) || collator.compare(a.title, b.title)
        }
        return (
          collator.compare(groupAuthor.get(ga.key)!, groupAuthor.get(gb.key)!) ||
          collator.compare(sortableTitle(ga.name), sortableTitle(gb.name)) ||
          ga.key.localeCompare(gb.key) ||
          (ga.index ?? 999) - (gb.index ?? 999) ||
          (a.year ?? 9999) - (b.year ?? 9999) ||
          collator.compare(a.title, b.title)
        )
      })
    }
    case 'genre':
    case 'language':
    case 'format': {
      // grouped, the groups in order, unknown last; by author and title within a group
      const group = groupOf(key)
      const rank = (b: Book) => {
        const g = group(b)
        return key === 'format' && g ? String(FORMAT_PRIORITY.indexOf(g as BookFormat)).padStart(2, '0') : (g ?? '')
      }
      return copy.sort(
        (a, b) =>
          Number(group(a) === undefined) - Number(group(b) === undefined) ||
          collator.compare(rank(a), rank(b)) ||
          collator.compare(authorSurname(a), authorSurname(b)) ||
          collator.compare(sortableTitle(a.title), sortableTitle(b.title)),
      )
    }
    case 'year':
      return copy.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))
    case 'added':
      return copy.sort((a, b) => a.addedAt - b.addedAt)
    case 'status':
      return copy.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
    case 'color':
      return copy.sort((a, b) => {
        const [ha, sa, la] = hexToHsl(a.color)
        const [hb, sb, lb] = hexToHsl(b.color)
        // greys go to the end, ordered by lightness
        const ga = sa < 0.12
        const gb = sb < 0.12
        if (ga !== gb) return ga ? 1 : -1
        if (ga && gb) return lb - la
        return ha - hb
      })
  }
}

/** The group a book falls in when arranged by genre, language or format (undefined: unknown). */
export function groupOf(key: 'genre' | 'language' | 'format'): (b: Book) => string | undefined {
  if (key === 'genre') return (b) => b.genres?.[0]
  if (key === 'language') return (b) => (b.language ? languageName(b.language) : undefined)
  return (b) => primaryFormat(b)
}

/** The divider label for a group when arranged by genre, language or format. */
export function groupLabel(key: 'genre' | 'language' | 'format', b: Book) {
  const g = groupOf(key)(b)
  if (key === 'format') return g ? FORMAT_LABELS[g as BookFormat] : 'Not set'
  return g ?? (key === 'genre' ? 'No genre' : 'Language not set')
}
