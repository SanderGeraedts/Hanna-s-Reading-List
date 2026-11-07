/// <reference path="../pb_data/types.d.ts" />

/**
 * Let people create their own account. Who may sign up is decided by the
 * hook in pb_hooks/signup.pb.js (an email allowlist on the NAS), not here.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = ''
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = null // only superusers add accounts
    app.save(users)
  },
)
