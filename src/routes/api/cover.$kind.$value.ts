import { createFileRoute } from '@tanstack/react-router'

/**
 * Same-origin proxy for Open Library cover images.
 * WebGL can only use images that are CORS-clean; proxying guarantees that and
 * lets the browser cache covers aggressively.
 *
 *   /api/cover/id/8231856?size=L
 *   /api/cover/isbn/9780140328721
 */
const KINDS = new Set(['id', 'isbn', 'olid'])
const SIZES = new Set(['S', 'M', 'L'])

export const Route = createFileRoute('/api/cover/$kind/$value')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { kind, value } = params
        if (!KINDS.has(kind) || !/^[\w-]{1,32}$/.test(value)) {
          return new Response('Bad cover request', { status: 400 })
        }
        const sizeParam = new URL(request.url).searchParams.get('size') ?? 'L'
        const size = SIZES.has(sizeParam) ? sizeParam : 'L'

        const upstream = await fetch(
          `https://covers.openlibrary.org/b/${kind}/${value}-${size}.jpg?default=false`,
          { redirect: 'follow' },
        )
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
