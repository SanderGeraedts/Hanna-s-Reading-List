import { describe, expect, it } from 'vitest'
import { CONTINENTS, continentsOf } from './continents'
import { MAP_COUNTRIES } from './mapCountries'

describe('the continent of each map country (D-0037)', () => {
  it('gives every map country one continent, four of them two, and the French Southern Lands none', () => {
    const two = ['Russia', 'Turkey', 'Kazakhstan', 'Egypt']
    for (const c of MAP_COUNTRIES) {
      const n = two.includes(c) ? 2 : c === 'Fr. S. Antarctic Lands' ? 0 : 1
      expect(continentsOf(c), c).toHaveLength(n)
    }
  })

  it('has at least one country on each of the six continents', () => {
    for (const continent of CONTINENTS) expect(MAP_COUNTRIES.some((c) => continentsOf(c).includes(continent)), continent).toBe(true)
  })

  it('puts the spot checks where they belong', () => {
    expect(continentsOf('Netherlands')).toEqual(['Europe'])
    expect(continentsOf('Japan')).toEqual(['Asia'])
    expect(continentsOf('Kenya')).toEqual(['Africa'])
    expect(continentsOf('Greenland')).toEqual(['North America'])
    expect(continentsOf('Brazil')).toEqual(['South America'])
    expect(continentsOf('Fiji')).toEqual(['Oceania'])
    expect(continentsOf('Russia')).toEqual(['Europe', 'Asia'])
    expect(continentsOf('Egypt')).toEqual(['Asia', 'Africa'])
  })

  it('knows only the map names', () => {
    expect(continentsOf('Narnia')).toEqual([])
    expect(continentsOf('Fr. S. Antarctic Lands')).toEqual([])
  })
})
