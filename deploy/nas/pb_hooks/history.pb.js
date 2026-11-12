/// <reference path="../pb_data/types.d.ts" />

/**
 * Shelf history: before a shelf (a `libraries` record) changes, its previous
 * books, arrangement and goals are copied to `library_versions`. That covers
 * saves from the app and from the nightly Storytel sync.
 *
 * - at most one copy per 10 minutes while someone is busy with the shelf,
 * - but always one when a save leaves books out (removed or lost),
 * - the newest 100 copies per person are kept.
 *
 * To restore: admin screen → library_versions → open the copy → copy its
 * `books` into that person's libraries record (see deploy/nas/README.md).
 * A failing copy never blocks the save itself; it is logged.
 * Hooks run in their own context: keep everything inside the handler.
 */
onRecordUpdate((e) => {
  try {
    const before = e.record.original()
    const list = (r) => {
      try {
        const v = JSON.parse(r.getString('books') || 'null')
        return Array.isArray(v) ? v : []
      } catch (_) {
        return []
      }
    }
    const oldBooks = list(before)
    const newIds = {}
    for (const b of list(e.record)) {
      if (!b) continue
      newIds[b.id] = true
      for (const id of b.mergedIds || []) newIds[id] = true
    }
    let dropped = 0
    for (const b of oldBooks) if (b && !newIds[b.id]) dropped++

    if (oldBooks.length > 0 && before.getString('books') !== e.record.getString('books')) {
      const owner = before.getString('owner')
      const last = e.app.findRecordsByFilter('library_versions', 'owner = {:owner}', '-created', 1, 0, { owner: owner })
      const lastAt = last.length ? Date.parse(last[0].getString('created').replace(' ', 'T')) : 0
      if (dropped > 0 || !lastAt || Date.now() - lastAt > 10 * 60 * 1000) {
        const v = new Record(e.app.findCollectionByNameOrId('library_versions'))
        v.set('owner', owner)
        v.set('books', oldBooks)
        v.set('arrangement', before.getString('arrangement'))
        v.set('goals', JSON.parse(before.getString('goals') || 'null'))
        v.set('book_count', oldBooks.length)
        v.set('dropped', dropped)
        v.set('shelf_updated', before.getString('updated'))
        e.app.save(v)

        const old = e.app.findRecordsByFilter('library_versions', 'owner = {:owner}', '-created', 50, 100, { owner: owner })
        for (const r of old) e.app.delete(r)
      }
    }
  } catch (err) {
    console.log('library history: could not keep a copy:', err)
  }
  e.next()
}, 'libraries')
