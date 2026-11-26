import { describe, expect, it } from 'vitest'
import { WEATHERS, isWet, weatherChip, weatherOf, weathersOfMonth } from './weather'
import type { GardenWeather } from './weather'
import { seasonOf } from './seasons'

/**
 * The garden's weather (D-0083 §1). It is invented from the day, so these
 * tests can say exactly what she will see — which is the whole reason it is
 * not fetched.
 */

/** Every day of a year, as `yyyy-mm-dd`. */
function daysOf(year: number): string[] {
  const out: string[] = []
  const d = new Date(Date.UTC(year, 0, 1))
  while (d.getUTCFullYear() === year) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

const countOf = (days: readonly string[]) => {
  const n = new Map<GardenWeather, number>()
  for (const day of days) n.set(weatherOf(day), (n.get(weatherOf(day)) ?? 0) + 1)
  return n
}

describe('the weather is the same everywhere, always', () => {
  it('gives the same day the same weather every time it is asked', () => {
    for (const day of ['2026-04-12', '2026-07-03', '2026-11-26', '2027-01-01'])
      expect(weatherOf(day)).toBe(weatherOf(day))
  })

  it('never changes with the device, the clock or the hour: only the day decides', () => {
    // the same string in, the same answer out — nothing else is read
    const before = daysOf(2026).map(weatherOf)
    const after = daysOf(2026).map(weatherOf)
    expect(after).toEqual(before)
  })

  it('always answers with a weather, even for a day that does not exist', () => {
    expect(WEATHERS).toContain(weatherOf('2027-02-29'))
    expect(WEATHERS).toContain(weatherOf('not a day'))
    expect(WEATHERS).toContain(weatherOf(''))
  })

  it('gives every day of a year a weather the month allows', () => {
    for (const day of daysOf(2026)) {
      const month = Number(day.slice(5, 7))
      expect(weathersOfMonth(month), day).toContain(weatherOf(day))
    }
  })
})

describe('a month feels like itself', () => {
  it('brings showers in April', () => {
    const april = daysOf(2026).filter((d) => d.slice(5, 7) === '04')
    const showers = april.filter((d) => weatherOf(d) === 'shower')
    expect(showers.length).toBeGreaterThan(april.length / 4)
  })

  it('keeps July bright more often than not', () => {
    const july = daysOf(2026).filter((d) => d.slice(5, 7) === '07')
    const bright = july.filter((d) => weatherOf(d) === 'sun')
    expect(bright.length).toBeGreaterThan(july.length / 2)
  })

  it('lays mist over November', () => {
    const november = daysOf(2026).filter((d) => d.slice(5, 7) === '11')
    const mist = november.filter((d) => weatherOf(d) === 'mist')
    expect(mist.length).toBeGreaterThan(november.length / 5)
  })

  it('never snows in the summer and never shines a shower out of February', () => {
    for (const day of daysOf(2026)) {
      const season = seasonOf(day)
      if (season === 'summer') expect(weatherOf(day), day).not.toBe('snow')
      if (day.slice(5, 7) === '02') expect(weatherOf(day), day).not.toBe('shower')
    }
  })

  it('gives a year more than one kind of weather', () => {
    expect(countOf(daysOf(2026)).size).toBeGreaterThanOrEqual(5)
  })
})

describe('what the garden says about it', () => {
  it('knows which weather is wet', () => {
    expect(isWet('rain')).toBe(true)
    expect(isWet('shower')).toBe(true)
    expect(isWet('sun')).toBe(false)
    expect(isWet('snow')).toBe(false)
  })

  it('writes a chip with a picture and a word', () => {
    expect(weatherChip('mist')).toBe('🌫️ Mist')
    for (const w of WEATHERS) expect(weatherChip(w).split(' ').length).toBeGreaterThanOrEqual(2)
  })
})
