/// <reference path="../pb_data/types.d.ts" />

/**
 * Schema for Hanna's Reading List. PocketBase applies this on start-up.
 *
 * - users: the built-in auth collection. No sign-up: accounts are made in the
 *   admin screen. Tokens last 30 days; the app renews them on every visit.
 * - libraries: one record per user holding the whole shelf as JSON.
 * - storytel_logins: the remembered Storytel login per user, sealed by the app
 *   with its own secret (PocketBase only ever sees ciphertext).
 *
 * Every rule limits a record to its owner.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = null // only superusers add accounts
    users.authToken.duration = 30 * 24 * 60 * 60
    app.save(users)

    const own = 'owner = @request.auth.id'
    const createOwn = '@request.auth.id != "" && owner = @request.auth.id'
    const ownerField = {
      type: 'relation',
      name: 'owner',
      collectionId: users.id,
      required: true,
      maxSelect: 1,
      cascadeDelete: true,
    }

    app.save(
      new Collection({
        type: 'base',
        name: 'libraries',
        listRule: own,
        viewRule: own,
        createRule: createOwn,
        updateRule: own + ' && (@request.body.owner:isset = false || @request.body.owner = @request.auth.id)',
        deleteRule: null,
        fields: [
          ownerField,
          // uploaded covers are stored inline as small JPEGs, so allow plenty
          { type: 'json', name: 'books', maxSize: 50 * 1024 * 1024 },
          { type: 'text', name: 'arrangement', max: 20 },
          { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
          { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_libraries_owner ON libraries (owner)'],
      }),
    )

    app.save(
      new Collection({
        type: 'base',
        name: 'storytel_logins',
        listRule: own,
        viewRule: own,
        createRule: createOwn,
        updateRule: own + ' && (@request.body.owner:isset = false || @request.body.owner = @request.auth.id)',
        deleteRule: own,
        fields: [
          ownerField,
          { type: 'text', name: 'sealed', required: true, max: 4000 },
          { type: 'text', name: 'account', max: 200 },
          { type: 'autodate', name: 'updated', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_storytel_logins_owner ON storytel_logins (owner)'],
      }),
    )

    // slow down password guessing
    const settings = app.settings()
    settings.rateLimits.enabled = true
    app.save(settings)
  },
  (app) => {
    for (const name of ['storytel_logins', 'libraries']) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch {
        /* already gone */
      }
    }
  },
)
