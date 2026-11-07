import { createServerFn } from '@tanstack/react-start'
import { fromVolume } from '#/lib/googleVolume'
import type { GoogleVolume, RawVolume } from '#/lib/googleVolume'

/**
 * Searching Google Books (#67), next to Open Library: better covers, page
 * counts and German and Dutch editions. It works without a key; with
 * GOOGLE_BOOKS_API_KEY set (Netlify environment) it gets a quota of its own
 * instead of sharing one with everything else on the same servers.
 */

const API = 'https://www.googleapis.com/books/v1/volumes'

async function volumes(q: string, max: number): Promise<GoogleVolume[]> {
  const url = new URL(API)
  url.searchParams.set('q', q)
  url.searchParams.set('maxResults', String(max))
  url.searchParams.set('printType', 'books')
  const key = process.env.GOOGLE_BOOKS_API_KEY
  if (key) url.searchParams.set('key', key)
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Google Books request failed (${res.status})`)
  const json = (await res.json()) as { items?: RawVolume[] }
  return (json.items ?? []).map(fromVolume).filter((v): v is GoogleVolume => !!v)
}

export const searchGoogleBooks = createServerFn({ method: 'GET' })
  .validator((input: { query: string }) => ({
    query: String(input?.query ?? '')
      .trim()
      .slice(0, 200),
  }))
  .handler(async ({ data }): Promise<GoogleVolume[]> => (data.query.length < 2 ? [] : volumes(data.query, 12)))

/** The book with this ISBN on Google Books, for when Open Library doesn't know it. */
export const lookupGoogleIsbn = createServerFn({ method: 'GET' })
  .validator((input: { isbn: string }) => {
    const isbn = String(input?.isbn ?? '').replace(/[^0-9Xx]/g, '')
    if (isbn.length !== 10 && isbn.length !== 13) throw new Error('An ISBN has 10 or 13 digits')
    return { isbn }
  })
  .handler(async ({ data }): Promise<GoogleVolume | null> => {
    const [found] = await volumes(`isbn:${data.isbn}`, 1)
    return found ? { ...found, isbn: data.isbn } : null
  })
