import { createFileRoute } from '@tanstack/react-router'
import { nightlySecret, sameSecret } from '#/server/nightly'
import { runReadingReminders } from '#/server/reminders'

/**
 * The reading reminder (#163), called at 20:00 by the scheduled function
 * netlify/functions/reading-reminder.mts with NIGHTLY_SECRET. Without the
 * secret (or with none set on the server) it isn't there.
 */
export const Route = createFileRoute('/api/reading-reminder')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = nightlySecret()
        if (!secret || !sameSecret(request.headers.get('x-nightly-secret'), secret)) {
          return new Response('Not found', { status: 404 })
        }
        const result = await runReadingReminders(secret)
        return Response.json(result, { status: result.errors.length ? 207 : 200 })
      },
    },
  },
})
