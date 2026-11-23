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
    expect(continentsOf('Turkey')).toEqual(['Europe', 'Asia'])
    expect(continentsOf('Kazakhstan')).toEqual(['Europe', 'Asia'])
  })

  it('puts the easy-to-get-wrong names from the task where D-0037 says (tester)', () => {
    const where: Record<string, string> = {
      Cyprus: 'Asia', 'N. Cyprus': 'Asia', Georgia: 'Asia', Armenia: 'Asia', Azerbaijan: 'Asia', Israel: 'Asia',
      Palestine: 'Asia', Indonesia: 'Asia', 'Timor-Leste': 'Asia', Taiwan: 'Asia',
      Iceland: 'Europe', Kosovo: 'Europe', Macedonia: 'Europe', 'Bosnia and Herz.': 'Europe',
      Madagascar: 'Africa', 'W. Sahara': 'Africa', Somaliland: 'Africa', eSwatini: 'Africa',
      Greenland: 'North America', Panama: 'North America', Cuba: 'North America', Haiti: 'North America',
      'Dominican Rep.': 'North America', Jamaica: 'North America', Bahamas: 'North America',
      'Puerto Rico': 'North America', 'Trinidad and Tobago': 'North America',
      'Falkland Is.': 'South America', Guyana: 'South America', Suriname: 'South America',
      Australia: 'Oceania', 'New Zealand': 'Oceania', 'Papua New Guinea': 'Oceania', 'New Caledonia': 'Oceania',
      Fiji: 'Oceania', Vanuatu: 'Oceania', 'Solomon Is.': 'Oceania',
    }
    for (const [country, continent] of Object.entries(where)) expect(continentsOf(country), country).toEqual([continent])
  })

  it('knows only the map names', () => {
    expect(continentsOf('Narnia')).toEqual([])
    expect(continentsOf('Fr. S. Antarctic Lands')).toEqual([])
  })
})
