/// <reference path="../pb_data/types.d.ts" />

/**
 * Hanna's book creatures (D-0033, D-0034), kept with the shelf so every device
 * shows the same pets: a JSON log of her choices, e.g.
 * [{ "id": "e1", "at": 1795824000000, "kind": "buy", "egg": "common", "price": 60 }].
 * Only pb_hooks/creatures.pb.js writes it, and it only ever adds.
 *
 * Only adds a field; nothing existing changes. The app works with and without
 * it (without it, each device keeps its own choices, as before).
 */
migrate(
  (app) => {
    const libraries = app.findCollectionByNameOrId('libraries')
    if (libraries.fields.getByName('creatures')) return
    libraries.fields.add(new JSONField({ name: 'creatures', maxSize: 2 * 1024 * 1024 }))
    app.save(libraries)
  },
  (app) => {
    const libraries = app.findCollectionByNameOrId('libraries')
    libraries.fields.removeByName('creatures')
    app.save(libraries)
  },
)
