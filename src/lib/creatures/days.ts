/** Calendar days as yyyy-mm-dd strings, without time zones getting in the way. */

const toUtc = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)))

const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** The day `n` days after `day` (before it when negative). */
export function addDays(day: string, n: number): string {
  return fromUtc(toUtc(day) + n * 86_400_000)
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000)
}

export const isDay = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)
