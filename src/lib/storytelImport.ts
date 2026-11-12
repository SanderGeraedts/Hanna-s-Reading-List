import { getWorkDetails, searchBooks } from '#/server/openLibrary'
import type { SearchResult } from '#/server/openLibrary'
import type { StorytelBook } from '#/server/storytel'
import type { Book, NewBook, ReadingStatus } from './library'
import { formatsOf, localDay, statusPatch, withFormats } from './library'
import { progressPatch } from './readingLog'
import { analyzeCover, colorFromString, coverUrlForId, remoteCoverUrl } from './cover'
import { genresFromSubjects } from './genres'
import { guessLanguage } from './languages'
import { tidyTitle } from './titles'
import { listenOnly } from './listening'

export interface ImportCallbacks {
  addBook: (book: NewBook) => void
  updateBook: (id: string, patch: Partial<Book>) => void
  onProgress: (done: number, total: number) => void
}

export interface ImportSummary {
  added: number
  updated: number
  unchanged: number
}

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[:(]/)[0]
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function sameBook(a: { title: string; authors: string[] }, b: { title: string; authors: string[] }) {
  const ta = norm(a.title)
  const tb = norm(b.title)
  if (!ta || !tb || !(ta.startsWith(tb) || tb.startsWith(ta))) return false
  const aa = norm(a.authors[0] ?? '').split(' ').pop() ?? ''
  const ab = norm(b.authors[0] ?? '').split(' ').pop() ?? ''
  return !aa || !ab || aa === ab
}

/** Best-effort Open Library match, for year, page count, ISBN, blurb and genres. */
export async function findOnOpenLibrary(b: { title: string; authors: string[] }): Promise<SearchResult | undefined> {
  try {
    // edition notes ("(10th Anniversary Recording)", "[Dramatized Adaptation]") make Open Library find nothing
    const title = (tidyTitle(b.title) ?? b.title).replace(/\s*[([][^)\]]*[)\]]/g, '').split(':')[0]
    const results = await searchBooks({
      data: { query: `${title} ${b.authors[0] ?? ''}`.trim() },
    })
    const matches = results.filter((r) => sameBook(b, r))
    return matches.find((r) => r.coverId) ?? matches[0]
  } catch {
    return undefined
  }
}

async function toNewBook(b: StorytelBook): Promise<NewBook> {
  const ol = await findOnOpenLibrary(b)
  const details = ol?.workKey
    ? await getWorkDetails({ data: { workKey: ol.workKey } }).catch(() => undefined)
    : undefined

  // Prefer Storytel's own e-book cover (the edition Hanna actually has), then
  // Open Library's portrait cover, then the square audiobook cover (cropped in 3D).
  const candidates = [
    b.ebookCover && remoteCoverUrl(b.ebookCover),
    ol?.coverId && coverUrlForId(ol.coverId),
    b.abookCover && remoteCoverUrl(b.abookCover),
  ].filter((u): u is string => !!u)

  let coverUrl: string | undefined
  let analysis: Awaited<ReturnType<typeof analyzeCover>> = null
  for (const url of candidates) {
    analysis = await analyzeCover(url)
    if (analysis) {
      coverUrl = url
      break
    }
  }

  const estimatedPages = b.characters
    ? Math.round(b.characters / 1800)
    : b.durationMs
      ? Math.round(b.durationMs / 80_000) // roughly 45 pages per listening hour
      : undefined

  return {
    title: b.title,
    authors: b.authors.length ? b.authors : (ol?.authors ?? []),
    year: ol?.year,
    // the listening time from Storytel; a minute is a page (#51)
    pages: b.durationMs ? Math.round(b.durationMs / 60_000) : (ol?.pages ?? estimatedPages),
    ...(b.durationMs && { minutes: Math.round(b.durationMs / 60_000) }),
    isbn: ol?.isbn,
    workKey: ol?.workKey,
    description: details?.description,
    coverUrl,
    coverAspect: analysis?.aspect,
    color: analysis?.color ?? colorFromString(b.title),
    status: b.status,
    progress: b.progress,
    storytelId: b.storytelId,
    language: b.language ?? guessLanguage(b.title) ?? ol?.language,
    // Storytel's categories first, then Open Library's subjects
    genres: [...new Set([...genresFromSubjects(b.categories ?? []), ...(details?.genres ?? [])])].slice(0, 3),
  }
}

const STATUS_RANK: Record<ReadingStatus, number> = { want: 0, paused: 1, reading: 2, read: 3 }

/**
 * Storytel has no "paused" (#60): a book Hanna paused stays paused until
 * Storytel says she finished it or she listened on, even a few minutes (#91).
 */
function keepPaused(match: Book, item: StorytelBook): StorytelBook {
  if (match.status !== 'paused' || item.status === 'read') return item
  const listenedOn = item.progress !== undefined && item.progress > (match.progress ?? 0) + 0.00005
  return { ...item, status: listenedOn ? 'reading' : 'paused' }
}

/** The day she was last listening or reading on Storytel, else today. */
function readDay(item: StorytelBook, timeZone?: string) {
  const at = item.progressAt ? new Date(item.progressAt) : null
  return localDay(at && !Number.isNaN(at.getTime()) && at.getTime() <= Date.now() ? at : undefined, timeZone)
}

export interface ImportOptions {
  /** false: only bring the books already on the shelf up to date (the nightly sync, #77) */
  addNew?: boolean
  /** the time zone of the days noted; the browser's own when not given */
  timeZone?: string
}

/** Adds new Storytel books and syncs the reading status of ones already on the shelf. */
export async function importStorytelBooks(
  items: StorytelBook[],
  existing: Book[],
  cb: ImportCallbacks,
  { addNew = true, timeZone }: ImportOptions = {},
): Promise<ImportSummary> {
  const today = localDay(undefined, timeZone)
  const summary: ImportSummary = { added: 0, updated: 0, unchanged: 0 }
  const toAdd: StorytelBook[] = []

  for (const fromStorytel of items) {
    const match =
      existing.find((e) => e.storytelId === fromStorytel.storytelId) ??
      // the same book listed twice by Storytel, already merged into one
      existing.find((e) => e.storytelIds?.includes(fromStorytel.storytelId)) ??
      existing.find((e) => !e.storytelId && sameBook(e, fromStorytel))
    const item = match ? keepPaused(match, fromStorytel) : fromStorytel
    // the listening time comes from Storytel (#48, #51); for a book she only
    // listens to the pages follow it. Quietly: not a change she made.
    if (match && item.durationMs) {
      const minutes = Math.round(item.durationMs / 60_000)
      const patch: Partial<Book> = {
        ...(match.minutes !== minutes && { minutes }),
        ...(listenOnly(match) && match.pages !== minutes && { pages: minutes }),
      }
      if (Object.keys(patch).length) cb.updateBook(match.id, patch)
    }
    if (!match) {
      toAdd.push(item)
    } else if (match.storytelId !== item.storytelId && match.storytelIds?.includes(item.storytelId)) {
      // another edition of a merged book: it may only move the book forward
      const ahead = STATUS_RANK[item.status] > STATUS_RANK[match.status]
      const further = item.progress !== undefined && item.progress > (match.progress ?? 0) + 0.005
      if (ahead || further) {
        cb.updateBook(match.id, {
          ...(further && progressPatch(match, item.progress!, readDay(item, timeZone))),
          ...(ahead && statusPatch(match, item.status, today)),
        })
        summary.updated++
      } else summary.unchanged++
    } else if (
      match.status !== item.status ||
      match.storytelId !== item.storytelId ||
      (item.progress !== undefined && Math.abs((match.progress ?? 0) - item.progress) > 0.005)
    ) {
      cb.updateBook(match.id, {
        // what she listened on goes in the reading log (#76)
        ...(item.progress !== undefined && progressPatch(match, item.progress, readDay(item, timeZone))),
        // relistening to a finished book and finishing it again counts once more (#53);
        // after the progress, so Storytel's status wins over picking up a paused book (#91)
        status: item.status,
        ...statusPatch(match, item.status, today),
        storytelId: item.storytelId,
        // first time this book is matched to Storytel: she has it there too
        ...(!match.storytelId && { ...withFormats([...formatsOf(match), 'storytel']) }),
      })
      summary.updated++
    } else {
      summary.unchanged++
    }
  }

  if (!addNew) return summary
  let done = 0
  cb.onProgress(0, toAdd.length)
  const queue = [...toAdd]
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        cb.addBook(await toNewBook(item))
        summary.added++
      } catch {
        cb.addBook({
          title: item.title,
          authors: item.authors,
          status: item.status,
          progress: item.progress,
          storytelId: item.storytelId,
          language: item.language ?? guessLanguage(item.title),
          color: colorFromString(item.title),
        })
        summary.added++
      }
      cb.onProgress(++done, toAdd.length)
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  return summary
}

/**
 * The shelf brought up to date with Storytel, without adding books: for the
 * nightly sync (#77), which runs on the server at 23:00 Amsterdam time. New
 * Storytel books are added the next time she presses ↻ in the app.
 */
export async function syncedShelf(
  items: StorytelBook[],
  books: Book[],
  timeZone: string,
): Promise<{ books: Book[]; summary: ImportSummary }> {
  let shelf = books
  const summary = await importStorytelBooks(
    items,
    books,
    {
      addBook: () => {},
      onProgress: () => {},
      updateBook: (id, patch) => {
        // stamped like an edit in the app, so a stale device can't undo it (shelfMerge.ts)
        shelf = shelf.map((b) => (b.id === id ? { ...b, ...patch, editedAt: Date.now() } : b))
      },
    },
    { addNew: false, timeZone },
  )
  return { books: shelf, summary }
}
