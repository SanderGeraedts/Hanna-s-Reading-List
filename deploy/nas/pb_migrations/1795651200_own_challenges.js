/// <reference path="../pb_data/types.d.ts" />

/**
 * Hanna's own challenges on the Challenges page, kept with the shelf so every
 * device shows them: a JSON list of { id, name, target, year, rule, value },
 * e.g. [{ "id": "c1", "name": "Fantasy", "target": 5, "year": 2027,
 * "rule": "genre", "value": "Fantasy" }]. The app saves it on its own, apart
 * from the books, and cleans it on the way in and out (src/lib/ownChallenges.ts).
 */
migrate(
  (app) => {
    const libraries = app.findCollectionByNameOrId('libraries')
    libraries.fields.add(new JSONField({ name: 'challenges', maxSize: 20 * 1024 }))
    app.save(libraries)
  },
  (app) => {
    const libraries = app.findCollectionByNameOrId('libraries')
    libraries.fields.removeByName('challenges')
    app.save(libraries)
  },
)
