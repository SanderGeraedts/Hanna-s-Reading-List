import { describe, expect, it } from 'vitest'
import { NOOK_3D, nookGeometry } from './nook3d'
import { D, H, W } from './nookPaint'

describe('3D book nooks (T-0012)', () => {
  it('builds the night alley and the castle in 3D; the other scenes stay painted', () => {
    expect(NOOK_3D).toEqual(['alley', 'castle'])
    expect(nookGeometry('forest', 1)).toBeNull()
    for (const theme of NOOK_3D) {
      const g = nookGeometry(theme, 7)!
      expect(g.solid.attributes.position.count).toBeGreaterThan(100)
      expect(g.glow.attributes.position.count).toBeGreaterThan(10)
      // one material each: the colours are in the geometry
      expect(g.solid.attributes.color.count).toBe(g.solid.attributes.position.count)
      expect(g.glow.attributes.color.count).toBe(g.glow.attributes.position.count)
    }
  })

  it('stays inside the box (the scene never sticks out of the nook)', () => {
    for (const theme of NOOK_3D) {
      const g = nookGeometry(theme, 3)!
      g.solid.computeBoundingBox()
      const b = g.solid.boundingBox!
      expect(b.min.x).toBeGreaterThanOrEqual(-W / 2 - 1e-6)
      expect(b.max.x).toBeLessThanOrEqual(W / 2 + 1e-6)
      expect(b.min.y).toBeGreaterThanOrEqual(-1e-6)
      expect(b.max.y).toBeLessThanOrEqual(H + 1e-6)
      expect(b.min.z).toBeGreaterThanOrEqual(-D / 2 - 1e-6)
      expect(b.max.z).toBeLessThanOrEqual(D / 2 + 0.002)
    }
  })

  it('is the same every time for a group, and differs between groups', () => {
    expect(nookGeometry('alley', 12)).toBe(nookGeometry('alley', 12))
    const a = nookGeometry('alley', 12)!.solid.attributes.color.array
    const b = nookGeometry('alley', 345)!.solid.attributes.color.array
    expect(Array.from(a.slice(0, 2000)).join()).not.toBe(Array.from(b.slice(0, 2000)).join())
  })
})
