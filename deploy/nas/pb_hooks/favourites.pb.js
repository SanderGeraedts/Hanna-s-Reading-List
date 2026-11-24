/// <reference path="../pb_data/types.d.ts" />

/**
 * The dashboard's favourites (#182): stars and unstars a signed-in person's
 * blocks on their own shelf record, in one transaction, so two saves at the
 * same moment (two quick taps, or two devices) can't overwrite each other.
 * A plain PATCH of the whole list could: both would read the same list.
 *
 *   POST /api/collections/libraries/favourites   { add: [ids], remove: [ids] }
 *     200 { favourites: [ids] }  the list as saved
 *     404                        no shelf yet, or this server doesn't keep favourites
 *
 * Only ever writes the `favourites` field. Under /api/collections/libraries/
 * so the path Funnel already passes on (serve.json) reaches it.
 * Hooks run in their own context: keep everything inside the handler.
 */
routerAdd(
  'POST',
  '/api/collections/libraries/favourites',
  (e) => {
    const ids = (v) => {
      const out = []
      if (!Array.isArray(v)) return out
      // block ids like "goal", or a later "finishBy"; the app itself keeps only the ones it knows
      for (const x of v) if (typeof x === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(x) && out.indexOf(x) < 0) out.push(x)
      return out
    }
    const body = e.requestInfo().body || {}
    const add = ids(body.add).slice(0, 50)
    const remove = ids(body.remove).slice(0, 50)
    const owner = e.auth.id

    if (!e.app.findCollectionByNameOrId('libraries').fields.getByName('favourites')) throw new NotFoundError()

    let saved = null
    // one writer at a time: the list read here is the one this save changes
    e.app.runInTransaction((txApp) => {
      let shelf
      try {
        shelf = txApp.findFirstRecordByFilter('libraries', 'owner = {:owner}', { owner: owner })
      } catch (_) {
        return // no shelf yet; the first shelf save makes it
      }
      let stored = null
      try {
        stored = JSON.parse(shelf.getString('favourites') || 'null')
      } catch (_) {}
      // anything that isn't a block id (written some other way) is dropped
      const now = ids(stored)
      const next = now.filter((x) => remove.indexOf(x) < 0)
      for (const x of add) if (remove.indexOf(x) < 0 && next.indexOf(x) < 0) next.push(x)
      // over the limit: the oldest go, so a new star always lands
      saved = next.slice(Math.max(0, next.length - 50))
      if (JSON.stringify(saved) !== JSON.stringify(stored === null ? [] : stored)) {
        shelf.set('favourites', saved)
        txApp.save(shelf)
      }
    })
    if (saved === null) throw new NotFoundError()
    return e.json(200, { favourites: saved })
  },
  $apis.requireAuth('users'),
)
