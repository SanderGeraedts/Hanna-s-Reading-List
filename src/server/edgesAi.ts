import { createServerFn } from '@tanstack/react-start'
import { EDGE_PATTERNS, cleanEdges } from '#/lib/edges'
import type { PageEdges } from '#/lib/edges'
import { aiConfigured, askClaude } from './claude'

/**
 * Page edges from a description (#98): Hanna types what she'd like ("gold
 * stars on midnight blue", "like the cover, but with roses") and Claude picks
 * one of the app's patterns and its colours. It only chooses from the
 * patterns the app can paint, so the answer is always something we can draw.
 *
 * Needs ANTHROPIC_API_KEY on the server, and a signed-in account, so nobody
 * else can spend the API credit.
 */

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

export const aiEdgesAvailable = createServerFn({ method: 'GET' }).handler(async () => aiConfigured())

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
    const parsed = await askClaude({
      system: SYSTEM,
      prompt: `Book: ${data.title}${data.authors.length ? ` by ${data.authors.join(', ')}` : ''}
Cover colour: ${data.color}
Request: ${data.prompt}`,
      schema: SCHEMA,
      maxTokens: 2000,
      failed: 'The AI designer could not make that one. Try other words.',
    })
    const edges = cleanEdges({ ...(parsed as object), prompt: data.prompt })
    if (!edges) throw new Error('The AI designer gave an answer we could not use. Try again.')
    return edges
  })
