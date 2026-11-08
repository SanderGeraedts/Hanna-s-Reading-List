import { createFileRoute } from '@tanstack/react-router'
import { nightlySecret, runNightlySync, sameSecret } from '#/server/nightly'

/**
 * The nightly Storytel sync (#77), called by the scheduled function
 * netlify/functions/nightly-storytel.mts with NIGHTLY_SECRET. Without the
 * secret (or with none set on the server) it isn't there.
 */
export const Route = createFileRoute('/api/nightly-storytel')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = nightlySecret()
        if (!secret || !sameSecret(request.headers.get('x-nightly-secret'), secret)) {
          return new Response('Not found', { status: 404 })
        }
        const result = await runNightlySync(secret)
        return Response.json(result, { status: result.errors.length ? 207 : 200 })
      },
    },
  },
})
