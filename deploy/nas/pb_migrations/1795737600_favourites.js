/// <reference path="../pb_data/types.d.ts" />

/**
 * The dashboard's favourites (#182), kept with the shelf so every device shows
 * the same starred blocks: a short JSON list of block ids, e.g.
 * ["goal", "reading"]. The app saves it on its own, apart from the books.
 *
 * Only adds a field; nothing existing changes. The app works with and without
 * it (without it, each device keeps its own favourites, as before).
 * Numbered after the open pull requests' migrations (#165, #177).
 */
migrate(
  (app) => {
    const libraries = app.findCollectionByNameOrId('libraries')
    if (libraries.fields.getByName('favourites')) return
    libraries.fields.add(new JSONField({ name: 'favourites', maxSize: 4 * 1024 }))
    app.save(libraries)
  },
  (app) => {
    const libraries = app.findCollectionByNameOrId('libraries')
    libraries.fields.removeByName('favourites')
    app.save(libraries)
  },
)
