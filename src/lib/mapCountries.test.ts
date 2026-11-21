import { describe, expect, it } from 'vitest'
import atlas from 'world-atlas/countries-110m.json'
import { MAP_COUNTRIES } from './mapCountries'

describe('the country names for Set in', () => {
  it('are exactly the countries the map draws (the atlas, without Antarctica)', () => {
    const world = atlas as unknown as { objects: { countries: { geometries: Array<{ properties: { name: string } }> } } }
    const names = world.objects.countries.geometries.map((g) => g.properties.name).filter((n) => n !== 'Antarctica')
    expect([...MAP_COUNTRIES].sort()).toEqual([...names].sort())
    expect(new Set(MAP_COUNTRIES).size).toBe(MAP_COUNTRIES.length)
  })
})
