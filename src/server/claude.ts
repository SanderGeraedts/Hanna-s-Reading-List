import Anthropic from '@anthropic-ai/sdk'
import { NOT_SIGNED_IN, asUser, pb, pocketbaseUrl } from './pocketbase'

/**
 * The app's few AI features (page edges #98, recommendations, completing a
 * series) ask Claude one question each and get JSON back in a fixed shape.
 * They need ANTHROPIC_API_KEY on the server and a signed-in account, so
 * nobody else can spend the API credit.
 */

const MODEL = 'claude-opus-5-5'

/** Whether the AI features can be used here: a key on the server and an account server. */
export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY?.trim() && !!pocketbaseUrl()

interface Ask {
  system: string
  prompt: string
  /** JSON schema the answer must follow */
  schema: Record<string, unknown>
  effort?: 'low' | 'medium' | 'high'
  maxTokens?: number
  /** what to tell her when it doesn't work, e.g. "Recommendations could not be fetched." */
  failed: string
}

/** Asks Claude, as the signed-in user, for JSON in the given shape. Returns the parsed answer (unchecked). */
export async function askClaude({ system, prompt, schema, effort = 'low', maxTokens = 4000, failed }: Ask): Promise<unknown> {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) throw new Error('The AI features are not set up yet.')
  if (!pocketbaseUrl()) throw new Error(NOT_SIGNED_IN)
  // a real, signed-in account (PocketBase checks the token)
  await asUser((token) => pb('/api/collections/users/auth-refresh', { method: 'POST', token }))

  const client = new Anthropic()
  let response: Anthropic.Beta.BetaMessage
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      // a refused request is answered by another model instead
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort, format: { type: 'json_schema', schema } },
      system,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new Error('Too many requests just now. Try again in a minute.')
    if (e instanceof Anthropic.APIError) throw new Error(failed)
    throw e
  }
  if (response.stop_reason === 'refusal') throw new Error(failed)
  const text = response.content.find((b) => b.type === 'text')
  try {
    return text && text.type === 'text' ? JSON.parse(text.text) : undefined
  } catch {
    throw new Error(failed)
  }
}
