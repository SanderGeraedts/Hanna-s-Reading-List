import { deletePushSubscription, getPushKey, savePushSubscription } from '#/server/push'

/**
 * The reading reminder on this device (#163): ask the browser for permission,
 * subscribe to Web Push with the server's public key, and tell the account
 * server; or undo all that. Runs in the browser only.
 */

export type ReminderSupport =
  /** works here */
  | 'ok'
  /** an iPhone/iPad in Safari: only after "Add to Home Screen" */
  | 'needs-home-screen'
  /** this browser can't do notifications */
  | 'unsupported'

export function reminderSupport(): ReminderSupport {
  if (typeof window === 'undefined') return 'unsupported'
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
  if (ios && !standalone) return 'needs-home-screen'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  return 'ok'
}

async function registration() {
  return navigator.serviceWorker.register('/sw.js')
}

/** Whether this device has the reminder on. */
export async function reminderOn(): Promise<boolean> {
  if (reminderSupport() !== 'ok') return false
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  return !!(await reg?.pushManager.getSubscription())
}

/** The key as the browser wants it: base64url text → bytes. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Turns the reminder on. Returns a short reason when it can't. */
export async function turnReminderOn(): Promise<string | null> {
  if (reminderSupport() !== 'ok') return 'This device can’t show notifications here.'
  const key = await getPushKey()
  if (!key) return 'Reminders aren’t set up on the server yet.'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'Notifications are turned off for this app in your settings.'
  const reg = await registration()
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }))
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return 'This device gave no subscription.'
  await savePushSubscription({ data: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } } })
  return null
}

/** Turns the reminder off on this device. */
export async function turnReminderOff(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await deletePushSubscription({ data: { endpoint: sub.endpoint } }).catch(() => undefined)
  await sub.unsubscribe()
}
