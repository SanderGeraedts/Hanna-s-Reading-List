import webpush from 'web-push'
import type { Book } from '#/lib/library'
import { REMINDER_MESSAGE, amsterdamDay, readOn } from '#/lib/reminder'
import { pb, pocketbaseUrl } from './pocketbase'

/**
 * Reading reminders (#163). At 20:00 Amsterdam time a Netlify scheduled
 * function (netlify/functions/reading-reminder.mts) calls
 * /api/reading-reminder, which runs this: every device that asked for a
 * reminder gets a Web Push notification if its owner hasn't logged any
 * reading today. The subscriptions are read through a NIGHTLY_SECRET route on
 * the account server (deploy/nas/pb_hooks/reminders.pb.js); ones the browser
 * gave up are removed.
 *
 * Needs on Netlify: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT
 * (a mailto: address), made with `pnpm dlx web-push generate-vapid-keys`.
 */

interface ReminderItem {
  id: string
  endpoint: string
  keys: { p256dh?: string; auth?: string } | null
  books: Book[] | null
}

export interface ReminderResult {
  devices: number
  sent: number
  readToday: number
  removed: number
  errors: string[]
}

export function vapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim()
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null
}

export async function runReadingReminders(secret: string, now = new Date()): Promise<ReminderResult> {
  const result: ReminderResult = { devices: 0, sent: 0, readToday: 0, removed: 0, errors: [] }
  const keys = vapidKeys()
  if (!pocketbaseUrl()) result.errors.push('No account server is set up.')
  if (!keys) result.errors.push('VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY or VAPID_SUBJECT is not set.')
  if (result.errors.length || !keys) return result

  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey)
  const headers = { 'x-nightly-secret': secret }
  const today = amsterdamDay(now)
  const { items } = await pb<{ items: ReminderItem[] }>('/api/nightly/reminders', { headers })
  for (const item of items) {
    result.devices++
    if (readOn(item.books, today)) {
      result.readToday++
      continue
    }
    if (!item.keys?.p256dh || !item.keys.auth) continue
    try {
      await webpush.sendNotification(
        { endpoint: item.endpoint, keys: { p256dh: item.keys.p256dh, auth: item.keys.auth } },
        JSON.stringify(REMINDER_MESSAGE),
        { TTL: 60 * 60 * 3 }, // not worth showing after 23:00
      )
      result.sent++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      // the browser gave this subscription up (unsubscribed, app removed): forget it
      if (status === 404 || status === 410) {
        await pb(`/api/nightly/reminders/${item.id}`, { method: 'DELETE', headers }).catch(() => undefined)
        result.removed++
      } else {
        result.errors.push(`${item.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }
  return result
}
