import { createServerFn } from '@tanstack/react-start'
import { cleanSeriesBooks } from '#/lib/seriesGaps'
import type { SeriesBook } from '#/lib/seriesGaps'
import { aiConfigured, askClaude } from './claude'

/**
 * The books of a series, in order, so the shelf can be made complete: the
 * ones she is missing, the ones after her last, and ones not out yet (with
 * their release day, so they go to Upcoming releases).
 */

const SCHEMA = {
  type: 'object',
  properties: {
    books: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          number: { type: 'number', description: 'Place in the series; 1.5 for a novella between 1 and 2.' },
          title: { type: 'string' },
          year: { type: 'integer', description: 'Year first published, or expected.' },
          releaseDate: {
            type: 'string',
            description: 'Only for a book not published yet: its announced release day, yyyy-mm-dd. Empty otherwise.',
          },
        },
        required: ['number', 'title', 'year', 'releaseDate'],
        additionalProperties: false,
      },
    },
  },
  required: ['books'],
  additionalProperties: false,
}

const SYSTEM = `You know book series well. Given a series and the books of it a reader has, list every book in the series in reading order.
Include the main numbered books and numbered novellas (as 1.5 and so on); leave out companion guides, colouring books and box sets.
Use the titles as published in the language of the titles she has (English if unsure).
Include books that are announced but not published yet, with their release day when it is known.
Only list books you are sure belong to this series. If you do not know the series, return an empty list.`

export interface SeriesQuery {
  series: string
  author: string
  /** the titles she has, with their number when known */
  have: string[]
}

export const seriesBooksAvailable = createServerFn({ method: 'GET' }).handler(async () => aiConfigured())

export const findSeriesBooks = createServerFn({ method: 'POST' })
  .validator(
    (input: SeriesQuery): SeriesQuery => ({
      series: String(input?.series ?? '').trim().slice(0, 200),
      author: String(input?.author ?? '').trim().slice(0, 100),
      have: (Array.isArray(input?.have) ? input.have : []).slice(0, 60).map((t) => String(t).slice(0, 200)),
    }),
  )
  .handler(async ({ data }): Promise<SeriesBook[]> => {
    if (!data.series) throw new Error('Which series?')
    const today = new Date().toISOString().slice(0, 10)
    const parsed = await askClaude({
      system: SYSTEM,
      prompt: `Today is ${today}.
Series: ${data.series}${data.author ? ` by ${data.author}` : ''}
She has:
${data.have.join('\n') || '(none listed)'}`,
      schema: SCHEMA,
      failed: 'The books of this series could not be found. Try again.',
    })
    return cleanSeriesBooks((parsed as { books?: unknown } | undefined)?.books).map((b) =>
      b.releaseDate && b.releaseDate <= today ? { ...b, releaseDate: undefined } : b,
    )
  })
