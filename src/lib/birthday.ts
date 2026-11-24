/**
 * Her birthday, for the secret Birthday book badge (D-0039): a day and a month
 * (`MM-DD`, no year), kept only in this browser's storage. It is never part of a
 * book, the shelf, the account or anything sent to the server. Blocked storage
 * or a bad value reads as no birthday, and nothing here throws.
 */

export const BIRTHDAY_KEY = 'hannas-reading-list:birthday'

/** Days in each month; February has 29, so 29 February is a birthday (it counts only on 29 February). */
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** The last day a month (1–12) can have. */
export function daysInMonth(month: number): number {
  return DAYS_IN_MONTH[month - 1] ?? 0
}

/** True for a real `MM-DD` day: `05-14` and `02-29` yes; `13-40`, `02-30`, `abc` and `` no. */
export function isBirthday(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d\d-\d\d$/.test(value)) return false
  const month = Number(value.slice(0, 2))
  const day = Number(value.slice(3))
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(month)
}

/** `MM-DD` from a day and a month, as numbers. */
export function birthdayOf(day: number, month: number): string {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** This device's birthday as `MM-DD`, or undefined. */
export function readBirthday(): string | undefined {
  try {
    const value = globalThis.localStorage?.getItem(BIRTHDAY_KEY)
    return isBirthday(value) ? value : undefined
  } catch {
    return undefined
  }
}

const listeners = new Set<() => void>()

/** Be told when this device's birthday changes (here, or in another tab); returns the unsubscribe. */
export function subscribeBirthday(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === BIRTHDAY_KEY || e.key === null) listener()
  }
  globalThis.addEventListener?.('storage', onStorage)
  return () => {
    listeners.delete(listener)
    globalThis.removeEventListener?.('storage', onStorage)
  }
}

/** Keep a birthday on this device; undefined (or an invalid value) clears it. True when it was stored. */
export function writeBirthday(value: string | undefined): boolean {
  let stored = false
  try {
    if (isBirthday(value)) {
      globalThis.localStorage?.setItem(BIRTHDAY_KEY, value)
      stored = true
    } else globalThis.localStorage?.removeItem(BIRTHDAY_KEY)
  } catch {
    // blocked storage: the birthday simply isn't kept
  }
  for (const l of listeners) l()
  return stored
}

/** Clear this device's birthday. */
export function clearBirthday(): void {
  writeBirthday(undefined)
}
