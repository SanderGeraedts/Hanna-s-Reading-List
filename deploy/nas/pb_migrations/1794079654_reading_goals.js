/// <reference path="../pb_data/types.d.ts" />

/**
 * Reading goals on the dashboard (#66), kept with the shelf so every device
 * shows the same goal: a small JSON object of year → number of books, e.g.
 * { "2026": 50 }. The app saves it on its own, apart from the books.
 */
migrate(
  (app) => {
    const libraries = app.findCollectionByNameOrId('libraries')
    libraries.fields.add(new JSONField({ name: 'goals', maxSize: 10 * 1024 }))
    app.save(libraries)
  },
  (app) => {
    const libraries = app.findCollectionByNameOrId('libraries')
    libraries.fields.removeByName('goals')
    app.save(libraries)
  },
)
