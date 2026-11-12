import Anthropic from '@anthropic-ai/sdk'
import { createServerFn } from '@tanstack/react-start'
import { EDGE_PATTERNS, cleanEdges } from '#/lib/edges'
import type { PageEdges } from '#/lib/edges'
import { NOT_SIGNED_IN, asUser, pb, pocketbaseUrl } from './pocketbase'

/**
 * Page edges from a description (#98): Hanna types what she'd like ("gold
 * stars on midnight blue", "like the cover, but with roses") and Claude picks
 * one of the app's patterns and its colours. It only chooses from the
 * patterns the app can paint, so the answer is always something we can draw.
 *
 * Needs ANTHROPIC_API_KEY on the server, and a signed-in account, so nobody
 * else can spend the API credit.
 */

const MODEL = 'claude-opus-5-5'

const SCHEMA = {
  type: 'object',
  properties: {
    pattern: { type: 'string', enum: Object.keys(EDGE_PATTERNS) },
    colors: {
      type: 'array',
      description: 'Base colour first, then the pattern colour, then an optional accent; #rrggbb hex.',
      items: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
      minItems: 2,
      maxItems: 3,
    },
  },
  required: ['pattern', 'colors'],
  additionalProperties: false,
}

const SYSTEM = `You design sprayed and patterned page edges for books, like the decorated edges of special editions.
Pick the one pattern from the list that best fits the request, and 2 or 3 colours that go well together and with the book:
the base colour that covers the edge, the colour of the pattern, and optionally an accent for some of the motifs.
Patterns: ${Object.entries(EDGE_PATTERNS)
  .map(([k, v]) => `${k} (${v})`)
  .join(', ')}.
When the request mentions the cover or the book's theme, use the cover colour given and what you know of the book.
Answer with the JSON only.`

export interface EdgeRequest {
  prompt: string
  title: string
  authors: string[]
  /** the cover's main colour */
  color: string
}

export const aiEdgesAvailable = createServerFn({ method: 'GET' }).handler(
  async () => !!process.env.ANTHROPIC_API_KEY?.trim() && !!pocketbaseUrl(),
)

export const designEdges = createServerFn({ method: 'POST' })
  .validator((input: EdgeRequest) => {
    const prompt = String(input?.prompt ?? '').trim().slice(0, 300)
    if (!prompt) throw new Error('Describe the edges you would like.')
    return {
      prompt,
      title: String(input?.title ?? '').slice(0, 200),
      authors: (Array.isArray(input?.authors) ? input.authors : []).map(String).slice(0, 5),
      color: /^#[0-9a-f]{6}$/i.test(String(input?.color)) ? String(input.color) : '#8a6d4b',
    }
  })
  .handler(async ({ data }): Promise<PageEdges> => {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) throw new Error('The AI designer is not set up yet.')
    if (!pocketbaseUrl()) throw new Error(NOT_SIGNED_IN)
    // a real, signed-in account (PocketBase checks the token)
    await asUser((token) => pb('/api/collections/users/auth-refresh', { method: 'POST', token }))

    const client = new Anthropic()
    let response: Anthropic.Beta.BetaMessage
    try {
      response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 2000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Book: ${data.title}${data.authors.length ? ` by ${data.authors.join(', ')}` : ''}\nCover colour: ${data.color}\nRequest: ${data.prompt}`,
          },
        ],
      })
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) throw new Error('The AI designer is busy. Try again in a minute.')
      if (e instanceof Anthropic.APIError) throw new Error('The AI designer could not be reached.')
      throw e
    }
    if (response.stop_reason === 'refusal') throw new Error('The AI designer could not make that one. Try other words.')
    const text = response.content.find((b) => b.type === 'text')
    let parsed: unknown
    try {
      parsed = text && text.type === 'text' ? JSON.parse(text.text) : undefined
    } catch {
      parsed = undefined
    }
    const edges = cleanEdges({ ...(parsed as object), prompt: data.prompt })
    if (!edges) throw new Error('The AI designer gave an answer we could not use. Try again.')
    return edges
  })
