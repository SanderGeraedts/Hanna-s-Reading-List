import { isDay } from '../creatures/days'

/**
 * The real season in the garden (T-0064, D-0050): worked out from the month and
 * the day of a `yyyy-mm-dd` day, so no time zone and no leap year can get in
 * the way. Northern hemisphere, meteorological seasons: spring March to May,
 * summer June to August, autumn September to November, winter December to
 * February.
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter']

export const SEASON_LABEL: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
}

export const SEASON_ICON: Record<Season, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
}

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Whether a `yyyy-mm-dd` day is a day that really exists (29 February only in a leap year). */
export function realDay(day: string): boolean {
  if (!isDay(day)) return false
  const year = Number(day.slice(0, 4))
  const month = Number(day.slice(5, 7))
  const d = Number(day.slice(8, 10))
  if (month < 1 || month > 12 || d < 1) return false
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const max = month === 2 && !leap ? 28 : DAYS_IN_MONTH[month - 1]
  return d <= max
}

/**
 * The season of a day, or null when that day does not exist (2027-02-29) or
 * isn't a day at all. The caller decides what to do with null; the garden falls
 * back to the device's own today.
 */
export function seasonOf(day: string): Season | null {
  if (!realDay(day)) return null
  const month = Number(day.slice(5, 7))
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}
