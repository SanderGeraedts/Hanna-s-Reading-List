/// <reference path="../pb_data/types.d.ts" />

/**
 * Reading reminders (#163): at 20:00 Amsterdam time the app's server sends a
 * notification to every device that asked for one, if its owner hasn't
 * logged any reading that day. Nobody is signed in then, so it uses these
 * routes, which only answer with the NIGHTLY_SECRET (like nightly.pb.js).
 * Without the secret, or with none set, they are not there (404).
 *
 *   GET    /api/nightly/reminders       every subscription, with its owner's books
 *   DELETE /api/nightly/reminders/{id}  removes a subscription the browser gave up (expired)
 *
 * Hooks run in their own context: keep everything inside the handlers.
 */

routerAdd('GET', '/api/nightly/reminders', (e) => {
  const secret = ($os.getenv('NIGHTLY_SECRET') || '').trim()
  const given = e.request.header.get('x-nightly-secret') || ''
  if (secret === '' || !$security.equal(given, secret)) throw new NotFoundError()

  const items = []
  for (const sub of $app.findAllRecords('push_subscriptions')) {
    let books = null
    try {
      const shelf = $app.findFirstRecordByFilter('libraries', 'owner = {:owner}', { owner: sub.getString('owner') })
      books = shelf.get('books')
    } catch (_) {
      // no shelf saved yet: nothing read, so a reminder is right
    }
    items.push({ id: sub.id, endpoint: sub.getString('endpoint'), keys: sub.get('keys'), books: books })
  }
  return e.json(200, { items: items })
})

routerAdd('DELETE', '/api/nightly/reminders/{id}', (e) => {
  const secret = ($os.getenv('NIGHTLY_SECRET') || '').trim()
  const given = e.request.header.get('x-nightly-secret') || ''
  if (secret === '' || !$security.equal(given, secret)) throw new NotFoundError()
  try {
    $app.delete($app.findRecordById('push_subscriptions', e.request.pathValue('id')))
  } catch (_) {
    // already gone
  }
  return e.json(200, { ok: true })
})
