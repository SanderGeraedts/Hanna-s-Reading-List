import type { Book } from './library'
import { allFinishes } from './stats'

/**
 * The cosy room extras that need to know something (D-0045): what time it is,
 * how much she has read this year and which season it is. The clock is read
 * here and nowhere else, so nothing in the 3D scene decides for itself whether
 * it is night.
 */

/** Night starts at 19:00 and ends at 07:00, by the device's own clock (D-0045 §3). */
export const NIGHT_FROM = 19
export const NIGHT_UNTIL = 7

/** Is it evening or night where she is? True from 19:00 through to 06:59. */
export function isNight(now: Date = new Date()): boolean {
  const h = now.getHours()
  return h >= NIGHT_FROM || h < NIGHT_UNTIL
}

/**
 * How much of the room's daytime light is left in the evening: the fill comes
 * right down, the key light keeps most of its strength so the spines still
 * read (D-0045 §3).
 */
export const roomLight = (night: boolean) => ({ dim: night ? 0.34 : 1, key: night ? 0.62 : 1 })

/**
 * Whether the floor lamp lights its corner. Only in the evening, only with the
 * reading corner switched on, and **never on a phone**, where every light costs
 * work on every pixel (D-0045 §3, T-0003).
 */
export const lampLightOn = (o: { night: boolean; readingCorner: boolean; lite: boolean }) => o.night && o.readingCorner && !o.lite

export type PlantStage = 'sprout' | 'small' | 'medium' | 'full' | 'flowering'

/** The five steps and the number of finishes each needs (D-0045 §4). */
export const PLANT_STEPS: Array<{ stage: PlantStage; from: number }> = [
  { stage: 'flowering', from: 30 },
  { stage: 'full', from: 15 },
  { stage: 'medium', from: 5 },
  { stage: 'small', from: 1 },
  { stage: 'sprout', from: 0 },
]

/** How many books she finished in that calendar year, counting every finish, as the dashboard does. */
export function finishesInYear(books: Book[], year: number): number {
  let n = 0
  for (const f of allFinishes(books)) if (f.day && Number(f.day.slice(0, 4)) === year) n++
  return n
}

/** How big the plant is: it grows with the books she finished this year, and is never nothing. */
export function plantStage(books: Book[], now: Date = new Date()): PlantStage {
  const finished = finishesInYear(books, now.getFullYear())
  return PLANT_STEPS.find((s) => finished >= s.from)!.stage
}

export type Season = 'pumpkins' | 'tree' | 'flowers' | 'sunflowers'

/**
 * The season's decorations, in four bands so there is always something to see
 * (D-0045 §5): her pumpkins, tree and flowers keep the months she asked for
 * them in, and summer and deep winter get one each.
 */
export function seasonOf(now: Date = new Date()): Season {
  const month = now.getMonth() + 1
  if (month >= 9 && month <= 11) return 'pumpkins'
  if (month === 12 || month <= 2) return 'tree'
  if (month >= 3 && month <= 5) return 'flowers'
  return 'sunflowers'
}
