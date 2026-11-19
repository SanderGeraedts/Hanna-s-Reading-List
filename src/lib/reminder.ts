import type { Book } from './library'

/**
 * Reading reminders (#163): at 20:00 a device gets a notification when its
 * owner hasn't logged any reading that day. This is the decision; sending is
 * in src/server/reminders.ts.
 */

export const REMINDER_TIME_ZONE = 'Europe/Amsterdam'
export const REMINDER_HOUR = 20

/** Today's date (yyyy-mm-dd) in Amsterdam, whatever the server's clock says. */
export function amsterdamDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: REMINDER_TIME_ZONE }).format(now)
}

/** The hour (0–23) in Amsterdam. */
export function amsterdamHour(now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: REMINDER_TIME_ZONE, hour: 'numeric', hourCycle: 'h23' }).format(now),
  )
}

/** Whether anything was read or listened to on `day`: any amount in the reading log, or a finish. */
export function readOn(books: Book[] | null | undefined, day: string): boolean {
  return (books ?? []).some((b) => (b.readingLog?.[day] ?? 0) > 0 || (b.finished ?? []).includes(day))
}

/** What the notification says. */
export const REMINDER_MESSAGE = {
  title: '📖 A little reading?',
  body: 'Nothing logged for today yet. Even a few pages count.',
  url: '/',
}
