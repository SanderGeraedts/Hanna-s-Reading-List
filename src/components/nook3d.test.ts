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

describe('the name sign is always in front (T-0012, Hanna on #211)', () => {
  it('hangs in front of everything inside the scene', async () => {
    const { INNER_SIGN } = await import('./BookNook')
    const { IW, SHELL } = await import('./nookPaint')
    for (const theme of NOOK_3D) {
      for (const variant of [0, 7, 123, 999]) {
        const g = nookGeometry(theme, variant)!
        for (const geo of [g.solid, g.glow]) {
          const pos = geo.attributes.position
          let front = -Infinity
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i)
            const y = pos.getY(i)
            // only the scene inside the box, not the box and its gilt edging
            if (Math.abs(x) < IW / 2 - 0.001 && y > SHELL + 0.001 && y < H - SHELL - 0.001) front = Math.max(front, pos.getZ(i))
          }
          // the back of the sign board is still in front of the scene's frontmost point
          expect(INNER_SIGN.z - 0.00125, `${theme} ${variant}`).toBeGreaterThan(front)
        }
      }
    }
  })
})
