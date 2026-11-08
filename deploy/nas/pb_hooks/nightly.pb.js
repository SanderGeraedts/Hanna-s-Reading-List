/// <reference path="../pb_data/types.d.ts" />

/**
 * The nightly Storytel sync (#77): at 23:00 Amsterdam time the app's server
 * brings every shelf with a remembered Storytel login up to date. Nobody is
 * signed in then, so it uses these two routes, which only answer with the
 * NIGHTLY_SECRET (set on the pocketbase container and on Netlify). Without
 * the secret, or with none set, they are not there (404).
 *
 *   GET  /api/nightly/shelves       every shelf with a Storytel login: the sealed login and the books
 *   POST /api/nightly/shelves/{id}  saves the books, only if the shelf hasn't changed since (409)
 *
 * The login stays sealed here; only the app can open it.
 * Hooks run in their own context: keep everything inside the handlers.
 */

routerAdd('GET', '/api/nightly/shelves', (e) => {
  const secret = ($os.getenv('NIGHTLY_SECRET') || '').trim()
  const given = e.request.header.get('x-nightly-secret') || ''
  if (secret === '' || !$security.equal(given, secret)) throw new NotFoundError()

  const items = []
  for (const login of $app.findAllRecords('storytel_logins')) {
    let shelf
    try {
      shelf = $app.findFirstRecordByFilter('libraries', 'owner = {:owner}', { owner: login.getString('owner') })
    } catch (_) {
      continue // no shelf saved yet
    }
    items.push({
      id: shelf.id,
      sealed: login.getString('sealed'),
      updated: shelf.getString('updated'),
      books: shelf.get('books'),
    })
  }
  return e.json(200, { items: items })
})

routerAdd('POST', '/api/nightly/shelves/{id}', (e) => {
  const secret = ($os.getenv('NIGHTLY_SECRET') || '').trim()
  const given = e.request.header.get('x-nightly-secret') || ''
  if (secret === '' || !$security.equal(given, secret)) throw new NotFoundError()

  const body = e.requestInfo().body || {}
  if (!Array.isArray(body.books)) throw new BadRequestError('Invalid shelf.')
  let shelf
  try {
    shelf = $app.findRecordById('libraries', e.request.pathValue('id'))
  } catch (_) {
    throw new NotFoundError()
  }
  // changed on a device since the sync read it: leave it, the device's copy wins
  if (shelf.getString('updated') !== body.updated) {
    return e.json(409, { message: 'The shelf changed in the meantime.' })
  }
  shelf.set('books', body.books)
  $app.save(shelf)
  return e.json(200, { updated: shelf.getString('updated') })
})
