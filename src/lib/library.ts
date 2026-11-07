import { useCallback, useEffect, useRef, useState } from 'react'
import { loadShelf, saveShelf } from '#/server/shelf'
import { seriesGroups } from './series'
import { NOT_SIGNED_IN } from './signedOut'
import { languageName } from './languages'

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
  /** how Hanna has the book (unset on Storytel imports means Storytel) */
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

/** How Hanna has the book; Storytel imports count as Storytel until she says otherwise. */
export function formatOf(book: Book): BookFormat | undefined {
  return book.format ?? (book.storytelId ? 'storytel' : undefined)
}

export type NewBook = Omit<Book, 'id' | 'addedAt' | 'status'> & {
  status?: ReadingStatus
}

export type SortKey =
  | 'title'
  | 'author'
  | 'series'
  | 'genre'
  | 'language'
  | 'format'
  | 'year'
  | 'color'
  | 'added'
  | 'status'

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
/** the shelf this browser had before accounts, kept once it was merged into one */
const PRE_ACCOUNT_BACKUP_KEY = 'hannas-reading-list:v1:before-account'
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
    return a && a in SORT_LABELS ? (a as SortKey) : null
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
      b.storytelId && `st:${b.storytelId}`,
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
    if (JSON.stringify(books).length > SYNC_LIMIT) {
      setSync('too-big')
      return
    }
    saving.current = true
    setSync('saving')
    try {
      const r = await saveShelf({ data: { books, arrangement } })
      serverUpdated.current = r.updated
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

  // first load: this device's copy straight away, then the server's
  useEffect(() => {
    let local = loadBooks(keys.books)
    let localArrangement = loadArrangement(keys.arrangement)
    // first sign-in on this device: bring along the shelf this browser had
    const preAccount = accountId && !local.length ? loadBooks(STORAGE_KEY) : []
    if (preAccount.length) {
      local = preAccount
      localArrangement = loadArrangement(ARRANGEMENT_KEY)
    }
    adopt(local, localArrangement)
    setLoaded(true)
    if (!accountId) return

    let cancelled = false
    loadShelf()
      .then((remote) => {
        if (cancelled) return
        serverUpdated.current = remote?.updated ?? null
        if (preAccount.length) {
          // merge it into the account, and keep the old copy aside, just in case
          adopt(mergeShelves(remote?.books ?? [], preAccount), remote?.arrangement ?? localArrangement)
          store(PRE_ACCOUNT_BACKUP_KEY, JSON.stringify(preAccount))
          store(STORAGE_KEY, null)
          store(ARRANGEMENT_KEY, null)
          store(keys.unsynced!, '1')
          timer.current = setTimeout(() => pushRef.current(), 0)
        } else if (!remote || flagged(keys.unsynced)) {
          // nothing saved yet, or changes made here while offline: send this device's copy
          if (local.length || remote) {
            store(keys.unsynced!, '1')
            pushRef.current()
          } else setSync('saved')
        } else {
          adopt(remote.books, remote.arrangement)
          setSync('saved')
        }
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
        if (remote && remote.updated !== serverUpdated.current && !flagged(keys.unsynced)) {
          serverUpdated.current = remote.updated
          adopt(remote.books, remote.arrangement)
        }
        setSync('saved')
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
  }, [accountId, keys, adopt, failed])

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

  const sortBy = useCallback((key: SortKey) => {
    setBooks((prev) => sortBooks(prev, key))
    setArrangement(key)
  }, [])

  return { books, loaded, arrangement, sync, addBook, removeBook, updateBook, reorder, sortBy }
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
        return key === 'format' && g ? String(FORMAT_ORDER.indexOf(g as BookFormat)).padStart(2, '0') : (g ?? '')
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

const FORMAT_ORDER = Object.keys(FORMAT_LABELS) as BookFormat[]

/** The group a book falls in when arranged by genre, language or format (undefined: unknown). */
export function groupOf(key: 'genre' | 'language' | 'format'): (b: Book) => string | undefined {
  if (key === 'genre') return (b) => b.genres?.[0]
  if (key === 'language') return (b) => (b.language ? languageName(b.language) : undefined)
  return (b) => formatOf(b)
}

/** The divider label for a group when arranged by genre, language or format. */
export function groupLabel(key: 'genre' | 'language' | 'format', b: Book) {
  const g = groupOf(key)(b)
  if (key === 'format') return g ? FORMAT_LABELS[g as BookFormat] : 'Not set'
  return g ?? (key === 'genre' ? 'No genre' : 'Language not set')
}
