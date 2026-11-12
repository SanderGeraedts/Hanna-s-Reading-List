/// <reference path="../pb_data/types.d.ts" />

/**
 * Earlier versions of each shelf, so a shelf that gets overwritten by mistake
 * can be put back (after the one of 9 November 2026). pb_hooks/history.pb.js
 * keeps a copy of a shelf just before it changes: at most one every 10
 * minutes, and always when a save drops books. The last 100 per person are kept.
 *
 * No API rules: only a superuser (the admin screen) can see or restore them.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    app.save(
      new Collection({
        type: 'base',
        name: 'library_versions',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { type: 'relation', name: 'owner', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: true },
          { type: 'json', name: 'books', maxSize: 50 * 1024 * 1024 },
          { type: 'text', name: 'arrangement', max: 20 },
          { type: 'json', name: 'goals', maxSize: 10 * 1024 },
          { type: 'number', name: 'book_count' },
          /** books the save that followed this version left out */
          { type: 'number', name: 'dropped' },
          /** the shelf's `updated` this was a copy of */
          { type: 'text', name: 'shelf_updated', max: 40 },
          { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
        ],
        indexes: ['CREATE INDEX idx_library_versions_owner ON library_versions (owner, created)'],
      }),
    )
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('library_versions'))
    } catch {
      /* already gone */
    }
  },
)
