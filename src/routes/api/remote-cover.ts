import { createFileRoute } from '@tanstack/react-router'

/**
 * Same-origin proxy for Storytel cover images, so WebGL can use them as textures.
 * Only https URLs on Storytel's own domains are allowed (no open proxy).
 *
 *   /api/remote-cover?url=https%3A%2F%2Fcovers.storytel.com%2F...
 */
function isAllowed(url: URL) {
  return (
    url.protocol === 'https:' &&
    (url.hostname === 'storytel.com' || url.hostname.endsWith('.storytel.com'))
  )
}

export const Route = createFileRoute('/api/remote-cover')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get('url') ?? ''
        let target: URL
        try {
          target = new URL(raw)
        } catch {
          return new Response('Bad cover url', { status: 400 })
        }
        if (!isAllowed(target)) return new Response('Host not allowed', { status: 403 })

        const upstream = await fetch(target, { redirect: 'manual' })
        const type = upstream.headers.get('content-type') ?? ''
        if (!upstream.ok || !type.startsWith('image/')) {
          return new Response('Cover not found', { status: 404 })
        }
        return new Response(upstream.body, {
          headers: {
            'Content-Type': type,
            'Cache-Control': 'public, max-age=604800, immutable',
          },
        })
      },
    },
  },
})
