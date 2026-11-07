import { createServerFn } from '@tanstack/react-start'
import { genresFromSubjects } from '#/lib/genres'
import { toLanguageCode } from '#/lib/languages'
import { parsePublished, publishedYear } from '#/lib/bookFacts'

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
  /** set when every edition Open Library knows is in one language */
  language?: string
}

export interface WorkDetails {
  description?: string
  genres: string[]
}

export interface IsbnLookup extends SearchResult {
  /** this edition's publication date: "2008", "2008-03" or "2008-03-12" */
  published?: string
  description?: string
  genres: string[]
}

/** Only an unambiguous answer: a work with editions in several languages says nothing about this copy. */
function singleLanguage(codes?: string[]) {
  const langs = new Set((codes ?? []).map(toLanguageCode).filter(Boolean))
  return langs.size === 1 ? [...langs][0] : undefined
}

const subjectsOf = (work: { subjects?: unknown } | null) =>
  Array.isArray(work?.subjects) ? work.subjects.filter((x): x is string => typeof x === 'string') : []

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
      'key,title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,language',
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
        language?: string[]
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
      language: singleLanguage(d.language),
    }))
  })

export const getWorkDetails = createServerFn({ method: 'GET' })
  .validator((input: { workKey: string }) => {
    const workKey = String(input?.workKey ?? '')
    if (!/^\/works\/OL\d+W$/.test(workKey)) throw new Error('Invalid work key')
    return { workKey }
  })
  .handler(async ({ data }): Promise<WorkDetails> => {
    const work = await getJson<{ description?: unknown; subjects?: unknown }>(`${OL}${data.workKey}.json`)
    return { description: cleanDescription(work?.description), genres: genresFromSubjects(subjectsOf(work)) }
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
      languages?: Array<{ key?: string }>
      subjects?: unknown
    }>(`${OL}/isbn/${data.isbn}.json`)
    if (!edition) return null

    const workKey = edition.works?.[0]?.key ?? ''
    const work = workKey
      ? await getJson<{ description?: unknown; subjects?: unknown; authors?: Array<{ author: { key: string } }> }>(
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

    const published = parsePublished(edition.publish_date) ?? undefined
    return {
      workKey,
      title: edition.title,
      authors,
      year: published ? publishedYear(published) : undefined,
      published,
      pages: edition.number_of_pages,
      coverId: edition.covers?.find((c) => c > 0),
      isbn: data.isbn,
      description: cleanDescription(edition.description) ?? cleanDescription(work?.description),
      // an edition knows its own language
      language: toLanguageCode(edition.languages?.[0]?.key),
      genres: genresFromSubjects([...subjectsOf(edition), ...subjectsOf(work)]),
    }
  })

const isbnInput = (input: { isbn: string }) => {
  const isbn = String(input?.isbn ?? '').replace(/[^0-9Xx]/g, '')
  if (isbn.length !== 10 && isbn.length !== 13) throw new Error('An ISBN has 10 or 13 digits')
  return { isbn }
}

/** Just the publication date of the edition with this ISBN (#44), for books already on the shelf. */
export const getPublishDate = createServerFn({ method: 'GET' })
  .validator(isbnInput)
  .handler(async ({ data }): Promise<{ published?: string }> => {
    const edition = await getJson<{ publish_date?: string }>(`${OL}/isbn/${data.isbn}.json`)
    return { published: parsePublished(edition?.publish_date) ?? undefined }
  })

/**
 * Cover ids a book could use instead of its current cover: every edition of
 * its work that has a cover, plus the covers of the works a title search finds.
 */
export const getCoverChoices = createServerFn({ method: 'GET' })
  .validator((input: { workKey?: string; query: string }) => {
    const workKey = input?.workKey ? String(input.workKey) : undefined
    if (workKey && !/^\/works\/OL\d+W$/.test(workKey)) throw new Error('Invalid work key')
    return { workKey, query: String(input?.query ?? '').trim().slice(0, 200) }
  })
  .handler(async ({ data }): Promise<number[]> => {
    const ids: number[] = []
    const add = (id?: number) => {
      if (id && id > 0 && !ids.includes(id)) ids.push(id)
    }
    const editions = async (workKey: string) => {
      const json = await getJson<{ entries?: Array<{ covers?: number[] }> }>(
        `${OL}${workKey}/editions.json?limit=100`,
      ).catch(() => null)
      for (const e of json?.entries ?? []) add(e.covers?.find((c) => c > 0))
    }

    const search = async () => {
      if (data.query.length < 2) return []
      const url = new URL('/search.json', OL)
      url.searchParams.set('q', data.query)
      url.searchParams.set('limit', '8')
      url.searchParams.set('fields', 'key,cover_i')
      const json = await getJson<{ docs: Array<{ key: string; cover_i?: number }> }>(url.toString()).catch(
        () => null,
      )
      return json?.docs ?? []
    }

    const [, docs] = await Promise.all([data.workKey ? editions(data.workKey) : null, search()])
    for (const d of docs) add(d.cover_i)
    // no work of our own: also look through the editions of the best search match
    if (!data.workKey && docs[0]?.key) await editions(docs[0].key)
    return ids.slice(0, 36)
  })
