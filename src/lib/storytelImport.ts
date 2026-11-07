import { getWorkDetails, searchBooks } from '#/server/openLibrary'
import type { SearchResult } from '#/server/openLibrary'
import type { StorytelBook } from '#/server/storytel'
import type { Book, NewBook, ReadingStatus } from './library'
import { formatsOf, statusPatch, withFormats } from './library'
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

export function sameBook(a: { title: string; authors: string[] }, b: { title: string; authors: string[] }) {
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
 * Storytel says she finished it or she listened on further.
 */
function keepPaused(match: Book, item: StorytelBook): StorytelBook {
  if (match.status !== 'paused' || item.status === 'read') return item
  const listenedOn = item.progress !== undefined && item.progress > (match.progress ?? 0) + 0.005
  return listenedOn ? item : { ...item, status: 'paused' }
}

/** Adds new Storytel books and syncs the reading status of ones already on the shelf. */
export async function importStorytelBooks(
  items: StorytelBook[],
  existing: Book[],
  cb: ImportCallbacks,
): Promise<ImportSummary> {
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
          ...(ahead && statusPatch(match, item.status)),
          ...(further && { progress: item.progress }),
        })
        summary.updated++
      } else summary.unchanged++
    } else if (
      match.status !== item.status ||
      match.storytelId !== item.storytelId ||
      (item.progress !== undefined && Math.abs((match.progress ?? 0) - item.progress) > 0.005)
    ) {
      cb.updateBook(match.id, {
        // relistening to a finished book and finishing it again counts once more (#53)
        status: item.status,
        ...statusPatch(match, item.status),
        storytelId: item.storytelId,
        // first time this book is matched to Storytel: she has it there too
        ...(!match.storytelId && { ...withFormats([...formatsOf(match), 'storytel']) }),
        ...(item.progress !== undefined && { progress: item.progress }),
      })
      summary.updated++
    } else {
      summary.unchanged++
    }
  }

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
