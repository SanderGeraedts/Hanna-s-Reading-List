import { describe, expect, it } from 'vitest'
import { BOOK_PILE_AT, shelfPetPose } from './ShelfPet'

/** T-0119: at night the shelf pet nods off sitting up; it never tips over into the shelf. */
describe('shelfPetPose', () => {
  it('sits up straight and awake in the daytime', () => {
    for (const t of [0, 1.3, 7.9]) {
      const p = shelfPetPose(false, t)
      expect(p.headX).toBe(0)
      expect(p.headZ).toBe(0)
      expect(p.eyesOpen).toBe(1)
      expect(Math.abs(p.breathe - 1)).toBeLessThanOrEqual(0.015)
    }
  })

  it('droops the head forward and a little sideways at night, eyes shut', () => {
    for (let t = 0; t < 12; t += 0.25) {
      const p = shelfPetPose(true, t)
      // forward 20°–24°: clearly asleep, never so far the head goes into the chest
      expect(p.headX).toBeGreaterThan(0.3)
      expect(p.headX).toBeLessThan(0.45)
      // a slight sideways tilt, nowhere near lying down (90°)
      expect(p.headZ).toBeGreaterThan(0)
      expect(p.headZ).toBeLessThan(0.3)
      expect(p.eyesOpen).toBeLessThanOrEqual(0.05)
    }
  })

  it('breathes slower and deeper asleep than awake', () => {
    const swing = (night: boolean) => {
      let lo = Infinity
      let hi = -Infinity
      for (let t = 0; t < 12; t += 0.05) {
        const b = shelfPetPose(night, t).breathe
        lo = Math.min(lo, b)
        hi = Math.max(hi, b)
      }
      return hi - lo
    }
    expect(swing(true)).toBeGreaterThan(swing(false))
  })

  it('puts the night books on the shelf floor beside the pet, not under it', () => {
    const [x, y, z] = BOOK_PILE_AT
    expect(y).toBe(0)
    expect(Math.hypot(x, z)).toBeGreaterThan(0.05)
    // inside the shelf-pet slot (0.17 wide) so it never pokes into the books next to it
    expect(Math.abs(x) + 0.035).toBeLessThanOrEqual(0.085)
  })
})
