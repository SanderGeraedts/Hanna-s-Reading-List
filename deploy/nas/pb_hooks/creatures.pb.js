/// <reference path="../pb_data/types.d.ts" />

/**
 * Hanna's creature choices (D-0034): adds choice events to a signed-in
 * person's own shelf record, in one transaction, so two devices saving at the
 * same moment can't overwrite each other, and an older copy of the app can't
 * wipe anything. The log only grows.
 *
 *   POST /api/collections/libraries/creatures   { events: [{ id, at, kind, ... }] }
 *     200 { creatures: [events] }  the whole log as saved
 *     400                          more than 200 events, or the log would pass 20,000
 *     404                          no shelf yet, or this server doesn't keep creatures
 *
 * - An event is kept only when well-formed: an `id` (^[A-Za-z0-9:_-]{1,60}$), an
 *   `at` (a number), a known `kind`, and otherwise only short string / number
 *   fields. A bad event is dropped; the good ones in the same call still land.
 * - An event whose id is already there is never changed: posting it again is a no-op.
 * - Setting kinds (name, wear, place, habitat, current, shelf) carry a `key`:
 *   per kind and key only the newest `at` is kept (on a tie, the larger id).
 *   Nothing else is ever dropped.
 *
 * Only ever writes the `creatures` field. Under /api/collections/libraries/
 * so the path Funnel already passes on (serve.json) reaches it.
 * Hooks run in their own context: keep everything inside the handler.
 */
routerAdd(
  'POST',
  '/api/collections/libraries/creatures',
  (e) => {
    const KINDS = ['hatch', 'choose', 'release', 'name', 'feed', 'buy', 'wear', 'place', 'habitat', 'current', 'shelf']
    const SETTING = ['name', 'wear', 'place', 'habitat', 'current', 'shelf']
    const MAX_PER_CALL = 200
    const MAX_EVENTS = 20000
    const MAX_FIELDS = 12

    // a clean copy of a well-formed event, or null
    const clean = (x) => {
      if (!x || typeof x !== 'object' || Array.isArray(x)) return null
      if (typeof x.id !== 'string' || !/^[A-Za-z0-9:_-]{1,60}$/.test(x.id)) return null
      if (typeof x.at !== 'number' || !isFinite(x.at)) return null
      if (KINDS.indexOf(x.kind) < 0) return null
      const keys = Object.keys(x)
      if (keys.length > MAX_FIELDS) return null
      const out = {}
      for (const k of keys) {
        const v = x[k]
        if (!/^[A-Za-z][A-Za-z0-9_]{0,29}$/.test(k)) return null
        if (typeof v === 'string') {
          if (v.length > 60) return null
        } else if (typeof v !== 'number' || !isFinite(v)) return null
        out[k] = v
      }
      if (SETTING.indexOf(x.kind) >= 0 && (typeof x.key !== 'string' || x.key === '')) return null
      return out
    }
    const cleanList = (v) => {
      const out = []
      const seen = {}
      if (!Array.isArray(v)) return out
      for (const x of v) {
        const ev = clean(x)
        if (ev && !seen[ev.id]) {
          seen[ev.id] = true
          out.push(ev)
        }
      }
      return out
    }
    const newer = (a, b) => a.at > b.at || (a.at === b.at && a.id > b.id)
    const slot = (ev) => (SETTING.indexOf(ev.kind) >= 0 ? ev.kind + '\n' + ev.key : null)

    // a plain JS copy of the body, not the Go values behind it
    const body = JSON.parse(JSON.stringify(e.requestInfo().body || {}))
    if (Array.isArray(body.events) && body.events.length > MAX_PER_CALL) {
      throw new BadRequestError('At most ' + MAX_PER_CALL + ' events per call.')
    }
    const incoming = cleanList(body.events)
    const owner = e.auth.id

    if (!e.app.findCollectionByNameOrId('libraries').fields.getByName('creatures')) throw new NotFoundError()

    let saved = null
    let tooMany = false
    // one writer at a time: the log read here is the one this save extends
    e.app.runInTransaction((txApp) => {
      let shelf
      try {
        shelf = txApp.findFirstRecordByFilter('libraries', 'owner = {:owner}', { owner: owner })
      } catch (_) {
        return // no shelf yet; the first shelf save makes it
      }
      let stored = null
      try {
        stored = JSON.parse(shelf.getString('creatures') || 'null')
      } catch (_) {}
      // anything that isn't an event (written some other way) is left out
      const log = cleanList(stored)
      const have = {}
      for (const ev of log) have[ev.id] = true
      for (const ev of incoming) if (!have[ev.id]) log.push(ev)

      // per setting slot, only the newest stays
      const best = {}
      for (const ev of log) {
        const s = slot(ev)
        if (s !== null && (!best[s] || newer(ev, best[s]))) best[s] = ev
      }
      const next = log.filter((ev) => {
        const s = slot(ev)
        return s === null || best[s] === ev
      })

      if (next.length > MAX_EVENTS) {
        tooMany = true
        return // nothing is dropped to make room: refuse, write nothing
      }
      saved = next
      if (JSON.stringify(saved) !== JSON.stringify(stored === null ? [] : stored)) {
        shelf.set('creatures', saved)
        txApp.save(shelf)
      }
    })
    if (tooMany) throw new BadRequestError('The creatures log is full.')
    if (saved === null) throw new NotFoundError()
    return e.json(200, { creatures: saved })
  },
  $apis.requireAuth('users'),
)
