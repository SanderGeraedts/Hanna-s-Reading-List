/// <reference path="../pb_data/types.d.ts" />

/**
 * Reading reminders (#163): the phones and browsers that asked for a
 * notification at 20:00 on days without reading. One record per device: the
 * Web Push subscription (endpoint and its two keys) that the browser handed
 * out. They're not secret in themselves, but only the owner sees, adds or
 * removes them; the reminder job reads them through a NIGHTLY_SECRET route
 * (pb_hooks/reminders.pb.js).
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const own = 'owner = @request.auth.id'
    app.save(
      new Collection({
        type: 'base',
        name: 'push_subscriptions',
        listRule: own,
        viewRule: own,
        createRule: '@request.auth.id != "" && owner = @request.auth.id',
        updateRule: null,
        deleteRule: own,
        fields: [
          {
            type: 'relation',
            name: 'owner',
            collectionId: users.id,
            required: true,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { type: 'text', name: 'endpoint', required: true, max: 2000 },
          { type: 'json', name: 'keys', required: true, maxSize: 2048 },
          { type: 'autodate', name: 'created', onCreate: true, onUpdate: false },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_push_subscriptions_endpoint ON push_subscriptions (endpoint)'],
      }),
    )
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('push_subscriptions'))
    } catch (_) {
      // already gone
    }
  },
)
