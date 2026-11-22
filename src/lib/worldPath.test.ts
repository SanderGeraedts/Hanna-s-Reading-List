import { describe, expect, it } from 'vitest'
import atlas from 'world-atlas/countries-110m.json'
import { feature } from 'topojson-client'
import { LAT_TOP, polygonsToPath } from './worldPath'

/** Today's ring function before T-0022, kept as the reference: it lifts the pen at the date-line jump. */
const oldRing = (pts: number[][]) =>
  pts
    .map(([lon, lat], k) => {
      const jump = k > 0 && Math.abs(lon - pts[k - 1][0]) > 180
      return `${k === 0 || jump ? 'M' : 'L'}${(lon + 180).toFixed(1)},${(LAT_TOP - lat).toFixed(1)}`
    })
    .join('') + 'Z'
const oldPath = (polys: number[][][][]) => polys.map((poly) => poly.map(oldRing).join('')).join('')

/** A path's subpaths, each as its points in map units and whether it ends with `Z`. */
function subpaths(d: string): Array<{ pts: number[][]; closed: boolean; raw: string }> {
  return d
    .split(/(?=M)/)
    .filter(Boolean)
    .map((raw) => ({
      raw,
      closed: raw.endsWith('Z'),
      pts: [...raw.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]),
    }))
}

// the atlas through topojson-client, as loadWorld does
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const world = atlas as any
const countries = (
  feature(world, world.objects.countries) as unknown as {
    features: Array<{ properties: { name: string }; geometry: { type: string; coordinates: unknown } | null }>
  }
).features
  .filter((f) => f.geometry && f.properties.name !== 'Antarctica')
  .map((f) => ({
    name: f.properties.name,
    polys: (f.geometry!.type === 'Polygon' ? [f.geometry!.coordinates] : f.geometry!.coordinates) as number[][][][],
  }))

describe('polygonsToPath', () => {
  it('draws a ring that does not cross the date line exactly as before', () => {
    const square = [
      [
        [10, 50],
        [20, 50],
        [20, 40],
        [10, 40],
        [10, 50],
      ],
    ]
    const d = polygonsToPath([square])
    expect(d).toBe('M190.0,34.0L200.0,34.0L200.0,44.0L190.0,44.0L190.0,34.0Z')
    expect(d).toBe(oldPath([square]))
  })

  it('draws a square across the date line as two closed rings, one past each edge, never lifting the pen', () => {
    const square = [
      [
        [170, 10],
        [-170, 10],
        [-170, -10],
        [170, -10],
        [170, 10],
      ],
    ]
    const subs = subpaths(polygonsToPath([square]))
    expect(subs).toHaveLength(2)
    for (const s of subs) {
      expect(s.raw.startsWith('M')).toBe(true)
      expect(s.raw.endsWith('Z')).toBe(true)
      // one M per ring: no lifted pen inside it
      expect(s.raw.match(/M/g)).toHaveLength(1)
      expect(s.pts).toHaveLength(5)
    }
    expect(Math.max(...subs[0].pts.map(([x]) => x))).toBeGreaterThan(360)
    expect(subs[0].pts[0][0]).toBe(350)
    expect(subs[1].pts[0][0]).toBeLessThan(0)
    expect(subs[1].raw).toBe('M-10.0,74.0L10.0,74.0L10.0,94.0L-10.0,94.0L-10.0,74.0Z')
  })

  it('copies a polygon reaching west of −180 across to the right', () => {
    const square = [
      [
        [-170, 10],
        [170, 10],
        [170, -10],
        [-170, -10],
        [-170, 10],
      ],
    ]
    const subs = subpaths(polygonsToPath([square]))
    expect(subs).toHaveLength(2)
    expect(Math.min(...subs[0].pts.map(([x]) => x))).toBeLessThan(0)
    expect(Math.max(...subs[1].pts.map(([x]) => x))).toBeGreaterThan(360)
  })

  it('shifts a polygon’s holes with its outer ring', () => {
    const outer = [
      [170, 20],
      [-170, 20],
      [-170, -20],
      [170, -20],
      [170, 20],
    ]
    const hole = [
      [175, 5],
      [175, -5],
      [-175, -5],
      [-175, 5],
      [175, 5],
    ]
    const subs = subpaths(polygonsToPath([[outer, hole]]))
    expect(subs).toHaveLength(4)
    expect(subs.every((s) => s.closed)).toBe(true)
    // the original pair first, then the copy shifted by −360
    expect(subs[2].pts[0][0]).toBeCloseTo(subs[0].pts[0][0] - 360, 5)
    expect(subs[3].pts[0][0]).toBeCloseTo(subs[1].pts[0][0] - 360, 5)
  })
})

describe('polygonsToPath on the real atlas (world-atlas countries-110m)', () => {
  it('loads the countries', () => {
    expect(countries.length).toBeGreaterThan(170)
    for (const name of ['Russia', 'Fiji', 'United States of America']) expect(countries.some((c) => c.name === name)).toBe(true)
  })

  it('draws every country except Russia and Fiji exactly as before', () => {
    const changed = countries.filter((c) => polygonsToPath(c.polys) !== oldPath(c.polys)).map((c) => c.name)
    expect(changed.sort()).toEqual(['Fiji', 'Russia'])
  })

  it('draws the USA (Alaska and the Aleutians included) exactly as before', () => {
    const usa = countries.find((c) => c.name === 'United States of America')!
    expect(polygonsToPath(usa.polys)).toBe(oldPath(usa.polys))
  })

  for (const name of ['Russia', 'Fiji']) {
    it(`draws ${name} as closed rings with no jump across the map`, () => {
      const c = countries.find((k) => k.name === name)!
      const subs = subpaths(polygonsToPath(c.polys))
      for (const s of subs) {
        expect(s.closed).toBe(true)
        expect(s.raw.match(/M/g)).toHaveLength(1)
        for (let k = 1; k < s.pts.length; k++) expect(Math.abs(s.pts[k][0] - s.pts[k - 1][0])).toBeLessThanOrEqual(180)
      }
      // something now reaches past the map's edge, and a copy shows at the other side
      const xs = subs.flatMap((s) => s.pts.map(([x]) => x))
      expect(Math.max(...xs) > 360 || Math.min(...xs) < 0).toBe(true)
    })
  }

  it('makes Russia’s mainland one closed ring reaching Chukotka past the right edge, with its copy at the left', () => {
    const russia = countries.find((c) => c.name === 'Russia')!
    const subs = subpaths(polygonsToPath(russia.polys))
    const mainland = subs.reduce((a, b) => (b.pts.length > a.pts.length ? b : a))
    expect(mainland.pts.length).toBe(468)
    expect(Math.max(...mainland.pts.map(([x]) => x))).toBeCloseTo(370.1, 0)
    // the copy of the mainland, shifted 360 to the left, puts Chukotka's tip at the left edge
    const copy = subs.find((s) => s !== mainland && s.pts.length === 468)!
    expect(copy).toBeDefined()
    expect(Math.max(...copy.pts.map(([x]) => x))).toBeCloseTo(10.1, 0)
  })
})
