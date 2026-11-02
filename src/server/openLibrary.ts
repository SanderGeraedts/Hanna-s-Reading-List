import { createServerFn } from '@tanstack/react-start'

/**
 * Server functions talking to the Open Library API (https://openlibrary.org/developers/api).
 * Open Library is free, needs no API key and has cover images for most books.
 * It (like every other public book API) only offers *front* covers – spines and
 * back covers are generated on the client from the book's metadata.
 */

const OL = 'https://openlibrary.org'
const HEADERS = {
  'User-Agent': 'HannasReadingList/0.1 (personal reading list app)',
  Accept: 'application/json',
}

export interface SearchResult {
  workKey: string
  title: string
  authors: string[]
  year?: number
  pages?: number
  coverId?: number
  isbn?: string
}

export interface WorkDetails {
  description?: string
}

export interface IsbnLookup extends SearchResult {
  description?: string
}

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { headers: HEADERS })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Open Library request failed (${res.status})`)
  return (await res.json()) as T
}

function pickIsbn(isbns?: string[]): string | undefined {
  if (!isbns?.length) return undefined
  return isbns.find((i) => i.length === 13) ?? isbns[0]
}

function cleanDescription(raw: unknown): string | undefined {
  const text =
    typeof raw === 'string'
      ? raw
      : raw && typeof raw === 'object' && 'value' in raw
        ? String((raw as { value: unknown }).value)
        : undefined
  if (!text) return undefined
  return (
    text
      // Open Library descriptions are markdown-ish: drop links, separators and source notes
      .replace(/\[([^\]]+)\]\[\d+\]/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s*\[\d+\]:.*$/gm, '')
      .split(/\n-{3,}\n|\(\[source\]/)[0]
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1200) || undefined
  )
}

export const searchBooks = createServerFn({ method: 'GET' })
  .validator((input: { query: string }) => ({
    query: String(input?.query ?? '')
      .trim()
      .slice(0, 200),
  }))
  .handler(async ({ data }): Promise<SearchResult[]> => {
    if (data.query.length < 2) return []
    const url = new URL('/search.json', OL)
    url.searchParams.set('q', data.query)
    url.searchParams.set('limit', '12')
    url.searchParams.set(
      'fields',
      'key,title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn',
    )
    const json = await getJson<{
      docs: Array<{
        key: string
        title: string
        author_name?: string[]
        first_publish_year?: number
        number_of_pages_median?: number
        cover_i?: number
        isbn?: string[]
      }>
    }>(url.toString())
    return (json?.docs ?? []).map((d) => ({
      workKey: d.key,
      title: d.title,
      authors: d.author_name?.slice(0, 3) ?? [],
      year: d.first_publish_year,
      pages: d.number_of_pages_median,
      coverId: d.cover_i,
      isbn: pickIsbn(d.isbn),
    }))
  })

export const getWorkDetails = createServerFn({ method: 'GET' })
  .validator((input: { workKey: string }) => {
    const workKey = String(input?.workKey ?? '')
    if (!/^\/works\/OL\d+W$/.test(workKey)) throw new Error('Invalid work key')
    return { workKey }
  })
  .handler(async ({ data }): Promise<WorkDetails> => {
    const work = await getJson<{ description?: unknown }>(`${OL}${data.workKey}.json`)
    return { description: cleanDescription(work?.description) }
  })

export const lookupIsbn = createServerFn({ method: 'GET' })
  .validator((input: { isbn: string }) => {
    const isbn = String(input?.isbn ?? '').replace(/[^0-9Xx]/g, '')
    if (isbn.length !== 10 && isbn.length !== 13) throw new Error('An ISBN has 10 or 13 digits')
    return { isbn }
  })
  .handler(async ({ data }): Promise<IsbnLookup | null> => {
    const edition = await getJson<{
      title: string
      number_of_pages?: number
      publish_date?: string
      covers?: number[]
      works?: Array<{ key: string }>
      authors?: Array<{ key: string }>
      description?: unknown
    }>(`${OL}/isbn/${data.isbn}.json`)
    if (!edition) return null

    const workKey = edition.works?.[0]?.key ?? ''
    const work = workKey
      ? await getJson<{ description?: unknown; authors?: Array<{ author: { key: string } }> }>(
          `${OL}${workKey}.json`,
        )
      : null

    const authorKeys = [
      ...(edition.authors?.map((a) => a.key) ?? []),
      ...(work?.authors?.map((a) => a.author.key) ?? []),
    ]
    const uniqueKeys = [...new Set(authorKeys)].slice(0, 3)
    const authors = (
      await Promise.all(
        uniqueKeys.map((k) => getJson<{ name?: string }>(`${OL}${k}.json`).catch(() => null)),
      )
    )
      .map((a) => a?.name)
      .filter((n): n is string => !!n)

    const yearMatch = edition.publish_date?.match(/\d{4}/)
    return {
      workKey,
      title: edition.title,
      authors,
      year: yearMatch ? Number(yearMatch[0]) : undefined,
      pages: edition.number_of_pages,
      coverId: edition.covers?.find((c) => c > 0),
      isbn: data.isbn,
      description: cleanDescription(edition.description) ?? cleanDescription(work?.description),
    }
  })
