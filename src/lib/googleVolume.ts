import { parsePublished, publishedYear } from './bookFacts'
import { genresFromSubjects } from './genres'
import { toLanguageCode } from './languages'

/**
 * Google Books (#67): what the app takes from one of its "volumes", whether it
 * comes from a search or from Hanna's own Google Play Books library.
 * https://developers.google.com/books/docs/v1/reference/volumes
 */

export interface RawVolume {
  id?: string
  volumeInfo?: {
    title?: string
    subtitle?: string
    authors?: string[]
    publishedDate?: string
    description?: string
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>
    pageCount?: number
    categories?: string[]
    imageLinks?: Record<string, string | undefined>
    language?: string
  }
}

export interface GoogleVolume {
  googleId: string
  title: string
  authors: string[]
  year?: number
  /** "2008", "2008-03" or "2008-03-12" */
  published?: string
  pages?: number
  isbn?: string
  description?: string
  genres: string[]
  language?: string
  /** the largest cover Google offers, over https */
  coverUrl?: string
}

/** Google's descriptions may hold simple HTML. */
function plainText(html?: string) {
  if (!html) return undefined
  const text = html
    .replace(/<br\s*\/?>|<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
  return text.slice(0, 1200) || undefined
}

function coverOf(links?: Record<string, string | undefined>) {
  const url = links?.extraLarge ?? links?.large ?? links?.medium ?? links?.thumbnail ?? links?.smallThumbnail
  if (!url) return undefined
  // Google hands out http links and a curled-page effect; ask for https and a plain cover
  return url.replace(/^http:/, 'https:').replace(/&edge=curl/g, '')
}

export function fromVolume(v: RawVolume): GoogleVolume | null {
  const info = v.volumeInfo
  if (!v.id || !info?.title) return null
  const ids = info.industryIdentifiers ?? []
  const isbn =
    ids.find((i) => i.type === 'ISBN_13')?.identifier ?? ids.find((i) => i.type === 'ISBN_10')?.identifier
  const published = parsePublished(info.publishedDate) ?? undefined
  return {
    googleId: v.id,
    title: info.title.trim(),
    authors: (info.authors ?? []).slice(0, 3),
    ...(published && { published, year: publishedYear(published) }),
    ...(info.pageCount && info.pageCount > 0 && { pages: info.pageCount }),
    ...(isbn && { isbn }),
    description: plainText(info.description),
    // "Fiction / Fantasy / Epic": each part counts as a subject
    genres: genresFromSubjects((info.categories ?? []).flatMap((c) => c.split(/\s*\/\s*/))),
    language: toLanguageCode(info.language),
    coverUrl: coverOf(info.imageLinks),
  }
}
