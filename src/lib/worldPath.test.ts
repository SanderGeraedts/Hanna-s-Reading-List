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

/**
 * Edge cases added by the tester (T-0022). What the browser fills is checked directly: the
 * nonzero winding number (the SVG default fill rule) of a map point over every subpath of the
 * `d` string, against the region the polygon covers on the globe.
 */
describe('polygonsToPath edge cases (tester)', () => {
  /** Nonzero winding number of point (x, y) around one closed ring. */
  const boxes = new WeakMap<number[][], number[]>()
  const winding = (pts: number[][], x: number, y: number) => {
    // a point outside the ring's bounding box has winding number 0
    let b = boxes.get(pts)
    if (!b) {
      const xs = pts.map((p) => p[0])
      const ys = pts.map((p) => p[1])
      b = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
      boxes.set(pts, b)
    }
    if (x < b[0] || x > b[1] || y < b[2] || y > b[3]) return 0
    let w = 0
    for (let k = 0; k < pts.length; k++) {
      const [x1, y1] = pts[k]
      const [x2, y2] = pts[(k + 1) % pts.length]
      const cross = (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1)
      if (y1 <= y && y2 > y && cross > 0) w++
      else if (y1 > y && y2 <= y && cross < 0) w--
    }
    return w
  }
  /** Is map point (x, y) filled by path `d` under the nonzero rule? */
  const filledIn = (subs: Array<{ pts: number[][] }>, x: number, y: number) => subs.reduce((w, s) => w + winding(s.pts, x, y), 0) !== 0
  const filled = (d: string, x: number, y: number) => filledIn(subpaths(d), x, y)
  /** Is (lon, lat) inside a polygon given in continuous (unwrapped) longitudes, on any of its 360° copies? */
  const onGlobe = (poly: number[][][], lon: number, lat: number) =>
    [-360, 0, 360].some((k) => poly.reduce((w, r) => w + winding(r, lon + k, lat), 0) !== 0)
  /** Longitudes folded into −180..180, as the atlas stores them. */
  const wrap = (poly: number[][][]) => poly.map((r) => r.map(([lon, lat]) => [lon > 180 ? lon - 360 : lon < -180 ? lon + 360 : lon, lat]))
  /** Every visible map point on a grid (off the integer lines) is filled exactly where the globe region is. */
  const expectFillMatches = (polys: number[][][][]) => {
    const d = polygonsToPath(polys.map(wrap))
    const parsed = subpaths(d)
    const wrong: string[] = []
    // the test polygons sit on whole degrees, so one point per square degree samples every cell
    for (let x = 0.37; x < 360; x += 1)
      for (let lat = -39.59; lat < 40; lat += 1) {
        const want = polys.some((p) => onGlobe(p, x - 180, lat))
        if (filledIn(parsed, x, LAT_TOP - lat) !== want) wrong.push(`${x},${lat}`)
      }
    expect(wrong).toEqual([])
    for (const s of subpaths(d)) {
      expect(s.closed).toBe(true)
      expect(s.raw.match(/M/g)).toHaveLength(1)
      for (let k = 1; k < s.pts.length; k++) expect(Math.abs(s.pts[k][0] - s.pts[k - 1][0])).toBeLessThanOrEqual(180)
    }
    return d
  }

  it('fills a ring that crosses the date line several times exactly where it is', () => {
    // a zigzag coast: over the line, back, over again and back, then closed along the south
    const zigzag = [
      [
        [170, 20],
        [185, 18],
        [175, 14],
        [190, 10],
        [172, 6],
        [188, 2],
        [188, -10],
        [170, -10],
        [170, 20],
      ],
    ]
    const d = expectFillMatches([zigzag])
    expect(subpaths(d)).toHaveLength(2) // the ring and one copy, however often it crosses
  })

  it('fills a ring that runs exactly along ±180 without a copy, and closes it', () => {
    // a Fiji-like sliver: the atlas writes the date-line points as −180 next to +179
    const onLine = [
      [
        [170, 10],
        [180, 10],
        [180, -10],
        [170, -10],
        [170, 10],
      ],
    ]
    const asAtlas = [
      [
        [170, 10],
        [-180, 10],
        [-180, -10],
        [170, -10],
        [170, 10],
      ],
    ]
    expectFillMatches([onLine])
    const d = polygonsToPath([asAtlas])
    expect(subpaths(d)).toHaveLength(1) // reaches 180 but not past it: nothing to copy
    expect(d).toBe(polygonsToPath([onLine]))
    // a ring that only touches −180 from the west half is not crossing and stays as it was
    const touching = [
      [
        [-180, 10],
        [-170, 10],
        [-170, -10],
        [-180, -10],
        [-180, 10],
      ],
    ]
    expect(polygonsToPath([touching])).toBe(oldPath([touching]))
  })

  it('cuts a hole out on both sides, even when the hole starts on the other side of the line from its outer ring', () => {
    // outer ring wound one way, hole the other (as the atlas does); each ring is unwrapped on its own
    const outer = [
      [170, 20],
      [190, 20],
      [190, -20],
      [170, -20],
      [170, 20],
    ]
    const holeFromWest = [
      [185, 5],
      [185, -5],
      [175, -5],
      [175, 5],
      [185, 5],
    ]
    // the same hole, starting west of the line (175°) instead of east of it (185° = −175°)
    const holeFromEast = [
      [175, -5],
      [175, 5],
      [185, 5],
      [185, -5],
      [175, -5],
    ]
    expectFillMatches([[outer, holeFromWest]])
    expectFillMatches([[outer, holeFromEast]])
  })

  it('handles MultiPolygon pieces separately: only the crossing piece is copied, the others stay as they were', () => {
    const crossing = [
      [
        [175, 10],
        [185, 10],
        [185, 0],
        [175, 0],
        [175, 10],
      ],
    ]
    const westOnly = [
      [
        [-175, 30],
        [-165, 30],
        [-165, 20],
        [-175, 20],
        [-175, 30],
      ],
    ]
    const eastOnly = [
      [
        [160, -20],
        [170, -20],
        [170, -30],
        [160, -30],
        [160, -20],
      ],
    ]
    const d = expectFillMatches([crossing, westOnly, eastOnly])
    const subs = subpaths(d)
    expect(subs).toHaveLength(4)
    expect(d.endsWith(oldPath([wrap(westOnly), wrap(eastOnly)]))).toBe(true)
  })

  it('fills Russia and Fiji on the real atlas exactly where they are, on the whole map', () => {
    // reference, written independently of worldPath.ts: the atlas's rings (rounded as the path
    // rounds), each point moved by ±360 to lie within 180 of the point before it, each hole moved
    // to lie by its outer ring; the point counts as filled when it or one of its ±360 twins is
    // inside the polygon under the nonzero rule
    const continuous = (ring: number[][], near: number) => {
      const out: number[][] = []
      let prev = near
      for (const [lon, lat] of ring) {
        let px = Number((lon + 180).toFixed(1))
        while (px - prev > 180) px -= 360
        while (prev - px > 180) px += 360
        out.push([px, Number((LAT_TOP - lat).toFixed(1))])
        prev = px
      }
      return out
    }
    const refPolys = (polys: number[][][][]) =>
      polys.map((poly) => {
        const outer = continuous(poly[0], Number((poly[0][0][0] + 180).toFixed(1)))
        return [outer, ...poly.slice(1).map((hole) => continuous(hole, outer[0][0]))]
      })
    const ref = (polys: number[][][], x: number, y: number) =>
      [-360, 0, 360].some((k) => polys.reduce((w, ring) => w + winding(ring, x + k, y), 0) !== 0)
    const check = (name: string, x0: number, x1: number, y0: number, y1: number, step: number) => {
      const c = countries.find((k) => k.name === name)!
      const subs = subpaths(polygonsToPath(c.polys))
      const rp = refPolys(c.polys)
      const wrong: string[] = []
      let inside = 0
      for (let x = x0 + step * 0.37; x < x1; x += step) // off round numbers, so no point sits on an edge
        for (let y = y0 + step * 0.41; y < y1; y += step) {
          const want = rp.some((p) => ref(p, x, y))
          if (want) inside++
          if (filledIn(subs, x, y) !== want) wrong.push(`${x.toFixed(2)},${y.toFixed(2)}`)
        }
      expect(wrong).toEqual([])
      expect(inside).toBeGreaterThan(0)
    }
    check('Russia', 0, 360, 0, 50, 1) // the whole width of the map, every latitude Russia has
    check('Russia', 290, 360, 0, 45, 0.25) // the far east, where the wedge was
    check('Russia', 0, 15, 10, 25, 0.1) // Chukotka's tip at the left edge
    check('Fiji', 355, 360, 96, 106, 0.05) // Fiji at the right edge
    check('Fiji', 0, 2, 96, 106, 0.05) // and what crosses to the left edge

    const russia = countries.find((k) => k.name === 'Russia')!
    const now = polygonsToPath(russia.polys)
    expect(filled(now, 170 + 180, LAT_TOP - 64)).toBe(true) // inland Chukotka, west of the line
    expect(filled(now, 160 + 180, LAT_TOP - 57)).toBe(true) // Kamchatka
    expect(filled(now, -175 + 180, LAT_TOP - 66.5)).toBe(true) // Chukotka's tip, at the left edge
    expect(filled(now, 150 + 180, LAT_TOP - 52)).toBe(false) // the Sea of Okhotsk stays sea
    expect(filled(now, 170 + 180, LAT_TOP - 50)).toBe(false) // the Pacific off Kamchatka too
  }, 30_000)
})
