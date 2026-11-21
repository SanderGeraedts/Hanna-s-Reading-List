import { createServerFn } from '@tanstack/react-start'
import { asUser, pb, tokenUserId } from './pocketbase'
import { vapidKeys } from './reminders'

/**
 * A device asking for (or stopping) the reading reminder at 20:00 (#163).
 * The browser hands out a Web Push subscription; it's kept in the account
 * server's push_subscriptions, one record per device, owner only.
 */

interface Subscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

const isSubscription = (s: unknown): s is Subscription => {
  const x = s as Subscription
  return (
    !!x &&
    typeof x.endpoint === 'string' &&
    /^https:\/\/[^\s'"]+$/.test(x.endpoint) &&
    x.endpoint.length <= 2000 &&
    typeof x.keys?.p256dh === 'string' &&
    typeof x.keys?.auth === 'string'
  )
}

/** The public half of the notification keys, which the browser needs to subscribe; null when not set up. */
export const getPushKey = createServerFn({ method: 'GET' }).handler(async () => vapidKeys()?.publicKey ?? null)

const findByEndpoint = (token: string, endpoint: string) =>
  pb<{ items: Array<{ id: string }> }>(
    `/api/collections/push_subscriptions/records?perPage=1&skipTotal=1&fields=id&filter=${encodeURIComponent(`endpoint='${endpoint}'`)}`,
    { token },
  )

export const savePushSubscription = createServerFn({ method: 'POST' })
  .validator((input: Subscription) => {
    if (!isSubscription(input)) throw new Error('Invalid subscription.')
    return { endpoint: input.endpoint, keys: { p256dh: input.keys.p256dh, auth: input.keys.auth } }
  })
  .handler(({ data }) =>
    asUser(async (token) => {
      const found = await findByEndpoint(token, data.endpoint)
      if (found.items.length) return { ok: true }
      await pb('/api/collections/push_subscriptions/records', {
        method: 'POST',
        token,
        body: { owner: tokenUserId(token), endpoint: data.endpoint, keys: data.keys },
      })
      return { ok: true }
    }),
  )

export const deletePushSubscription = createServerFn({ method: 'POST' })
  .validator((input: { endpoint: string }) => {
    if (typeof input?.endpoint !== 'string' || !/^https:\/\/[^\s'"]+$/.test(input.endpoint)) {
      throw new Error('Invalid subscription.')
    }
    return { endpoint: input.endpoint }
  })
  .handler(({ data }) =>
    asUser(async (token) => {
      const found = await findByEndpoint(token, data.endpoint)
      for (const r of found.items) {
        await pb(`/api/collections/push_subscriptions/records/${r.id}`, { method: 'DELETE', token })
      }
      return { ok: true }
    }),
  )
