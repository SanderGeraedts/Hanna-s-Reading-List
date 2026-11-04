import { useCallback, useEffect, useState } from 'react'
import { seriesGroups } from './series'

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
  addedAt: number
}

export type NewBook = Omit<Book, 'id' | 'addedAt' | 'status'> & {
  status?: ReadingStatus
}

export type SortKey = 'title' | 'author' | 'series' | 'year' | 'color' | 'added' | 'status'

export const SORT_LABELS: Record<SortKey, string> = {
  title: 'Title',
  author: 'Author',
  series: 'Series',
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

/** Times a book has been read: finished books count at least once. */
export function timesRead(book: Book) {
  return Math.max(book.readCount ?? 0, book.status === 'read' ? 1 : 0)
}

function loadBooks(): Book[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Book[]) : []
  } catch {
    return []
  }
}

/** The library lives in localStorage, so the shelf is personal to this browser. */
export function useLibrary() {
  const [books, setBooks] = useState<Book[]>([])
  const [loaded, setLoaded] = useState(false)
  /** the sort last applied; drag-and-drop tweaks keep it (the shelf is still mostly in that order) */
  const [arrangement, setArrangement] = useState<SortKey | null>(null)

  useEffect(() => {
    setBooks(loadBooks())
    try {
      const a = localStorage.getItem(ARRANGEMENT_KEY)
      if (a && a in SORT_LABELS) setArrangement(a as SortKey)
    } catch {
      /* ignore */
    }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
    } catch {
      /* storage full or blocked – the shelf still works for this session */
    }
  }, [books, loaded])

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
    try {
      localStorage.setItem(ARRANGEMENT_KEY, key)
    } catch {
      /* ignore */
    }
  }, [])

  return { books, loaded, arrangement, addBook, removeBook, updateBook, reorder, sortBy }
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
