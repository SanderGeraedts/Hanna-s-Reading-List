import { describe, expect, it } from 'vitest'
import { suggest } from './suggest'

const series = ['A Court of Thorns and Roses', 'Percy Jackson', 'The Kane Chronicles', 'Throne of Glass']

describe('suggestions while typing', () => {
  it('finds names containing what was typed, ignoring capitals', () => {
    expect(suggest(series, 'jack')).toEqual(['Percy Jackson'])
    expect(suggest(series, 'THRONE')).toEqual(['Throne of Glass'])
  })

  it('puts names that start with it first', () => {
    expect(suggest(series, 'th')).toEqual(['The Kane Chronicles', 'Throne of Glass', 'A Court of Thorns and Roses'])
  })

  it('shows everything (up to five) before typing, and nothing once a name matches exactly', () => {
    expect(suggest(series, '')).toEqual(series)
    expect(suggest([...series, 'b', 'c'], '').length).toBe(5)
    expect(suggest(series, 'percy jackson')).toEqual([])
  })
})
