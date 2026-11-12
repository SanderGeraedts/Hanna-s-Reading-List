import Anthropic from '@anthropic-ai/sdk'
import { createServerFn } from '@tanstack/react-start'
import type { ShelfSummary, Suggestion } from '#/lib/recommend'
import { cleanSuggestions } from '#/lib/recommend'
import { NOT_SIGNED_IN, asUser, pb, pocketbaseUrl } from './pocketbase'

/**
 * Reading recommendations: new books for Hanna, picked by Claude from what
 * her shelf says she loves (her best-rated books, favourite authors and
 * genres). Books already on her shelf, or that she said no to, are left out.
 *
 * Needs ANTHROPIC_API_KEY on the server and a signed-in account.
 */

const MODEL = 'claude-opus-5-5'

const SCHEMA = {
  type: 'object',
  properties: {
    books: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          author: { type: 'string' },
          year: { type: 'integer' },
          why: { type: 'string', description: 'One short sentence, to her, on why she would like it.' },
        },
        required: ['title', 'author', 'year', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['books'],
  additionalProperties: false,
}

const SYSTEM = `You are a well-read bookseller recommending books to one reader, Hanna, from what her shelf says she loves.
Recommend 6 real, published books she does not have yet. Prefer newer books (the last few years), mixed with one or two older gems.
Match her taste: her best-rated books and favourite authors matter most, then her genres; her spice ratings (1-5) show how steamy she likes romance.
Never recommend a book on her shelf or on her "not for me" list, and at most one book per author.
Use the exact title and author name as published in English (or the original language if she reads it).
For "why", write one short, warm sentence to her (in English), naming a book of hers it is like when you can.`

export const recommendationsAvailable = createServerFn({ method: 'GET' }).handler(
  async () => !!process.env.ANTHROPIC_API_KEY?.trim() && !!pocketbaseUrl(),
)

const list = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, max) : [])

export const recommendBooks = createServerFn({ method: 'POST' })
  .validator((input: ShelfSummary): ShelfSummary => ({
    favourites: list(input?.favourites, 25).map((f) => ({
      title: String(f?.title ?? '').slice(0, 200),
      author: String(f?.author ?? '').slice(0, 100),
      ...(typeof f?.rating === 'number' && { rating: f.rating }),
      ...(typeof f?.spice === 'number' && { spice: f.spice }),
    })),
    authors: list(input?.authors, 10).map((a) => String(a).slice(0, 100)),
    genres: list(input?.genres, 10).map((g) => String(g).slice(0, 60)),
    shelf: list(input?.shelf, 600).map((t) => String(t).slice(0, 200)),
    notForMe: list(input?.notForMe, 200).map((t) => String(t).slice(0, 200)),
  }))
  .handler(async ({ data }): Promise<Suggestion[]> => {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) throw new Error('Recommendations are not set up yet.')
    if (!pocketbaseUrl()) throw new Error(NOT_SIGNED_IN)
    // a real, signed-in account (PocketBase checks the token)
    await asUser((token) => pb('/api/collections/users/auth-refresh', { method: 'POST', token }))

    const favourites = data.favourites
      .map(
        (f) =>
          `- ${f.title} by ${f.author}${f.rating ? `, ${f.rating} stars` : ''}${f.spice ? `, spice ${f.spice}/5` : ''}`,
      )
      .join('\n')
    const prompt = `Books she loved most:\n${favourites || '(none rated yet)'}

Favourite authors: ${data.authors.join(', ') || '(unknown)'}
Favourite genres: ${data.genres.join(', ') || '(unknown)'}

On her shelf already (do not recommend):
${data.shelf.join('\n')}

Not for her (do not recommend):
${data.notForMe.join('\n') || '(none)'}`

    const client = new Anthropic()
    let response: Anthropic.Beta.BetaMessage
    try {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      })
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) throw new Error('Too many requests just now. Try again in a minute.')
      if (e instanceof Anthropic.APIError) throw new Error('Recommendations could not be fetched.')
      throw e
    }
    if (response.stop_reason === 'refusal') throw new Error('No recommendations this time. Try again.')
    const text = response.content.find((b) => b.type === 'text')
    let parsed: unknown
    try {
      parsed = text && text.type === 'text' ? JSON.parse(text.text) : undefined
    } catch {
      parsed = undefined
    }
    return cleanSuggestions((parsed as { books?: unknown } | undefined)?.books, [...data.shelf, ...data.notForMe])
  })
