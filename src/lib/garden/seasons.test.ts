import { describe, expect, it } from 'vitest'
import { SEASONS, SEASON_ICON, SEASON_LABEL, realDay, seasonOf, isNight } from './seasons'

/** Real seasons (T-0064): the months, the edges of each season and leap years. */

describe('the season of a day', () => {
  it('is spring from 1 March to 31 May', () => {
    expect(seasonOf('2026-03-01')).toBe('spring')
    expect(seasonOf('2026-05-31')).toBe('spring')
  })

  it('is summer from 1 June to 31 August', () => {
    expect(seasonOf('2026-06-01')).toBe('summer')
    expect(seasonOf('2026-08-31')).toBe('summer')
  })

  it('is autumn from 1 September to 30 November', () => {
    expect(seasonOf('2026-09-01')).toBe('autumn')
    expect(seasonOf('2026-11-30')).toBe('autumn')
  })

  it('is winter from 1 December through February', () => {
    expect(seasonOf('2026-12-01')).toBe('winter')
    expect(seasonOf('2027-01-01')).toBe('winter')
    expect(seasonOf('2027-02-28')).toBe('winter')
  })

  it('knows 29 February in a leap year and refuses one in a year without', () => {
    expect(realDay('2028-02-29')).toBe(true)
    expect(seasonOf('2028-02-29')).toBe('winter')
    expect(realDay('2027-02-29')).toBe(false)
    expect(seasonOf('2027-02-29')).toBeNull()
    // 2000 was a leap year, 1900 and 2100 were not
    expect(realDay('2000-02-29')).toBe(true)
    expect(realDay('2100-02-29')).toBe(false)
  })

  it('refuses anything that is not a day', () => {
    for (const bad of ['', 'today', '2026-13-01', '2026-00-10', '2026-04-31', '2026-4-1']) {
      expect(realDay(bad), bad).toBe(false)
      expect(seasonOf(bad), bad).toBeNull()
    }
  })

  it('has a label and an icon for each of the four', () => {
    expect(SEASONS).toHaveLength(4)
    for (const s of SEASONS) {
      expect(SEASON_LABEL[s]).toBeTruthy()
      expect(SEASON_ICON[s]).toBeTruthy()
    }
  })
})

describe('night in the garden (D-0071)', () => {
  it('is dark from eight in the evening until six in the morning', () => {
    expect(isNight(20)).toBe(true)
    expect(isNight(23)).toBe(true)
    expect(isNight(0)).toBe(true)
    expect(isNight(5)).toBe(true)
  })

  it('is day for the rest', () => {
    expect(isNight(6)).toBe(false)
    expect(isNight(12)).toBe(false)
    expect(isNight(19)).toBe(false)
  })
})
