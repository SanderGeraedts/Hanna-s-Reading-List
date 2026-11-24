import { describe, expect, it } from 'vitest'
import { newestTrick, unlockedTricks } from './tricks'
import type { Pet } from './creature'
import type { ShopState } from './shop'

const pet = (level: number, stage: Pet['stage'] = 'young'): Pick<Pet, 'level' | 'stage'> => ({ level, stage })
const shop = (owned: string[] = [], placed: Partial<ShopState['placed']> = {}): Pick<ShopState, 'owned' | 'placed'> => ({
  owned: new Set(owned),
  placed: placed as ShopState['placed'],
})

describe('unlocked tricks by level and owned toys', () => {
  it('nothing before level 3', () => {
    expect(unlockedTricks(pet(1, 'baby'), shop())).toEqual([])
    expect(unlockedTricks(pet(2, 'baby'), shop())).toEqual([])
  })

  it('wave at 3, spin at 6, somersault at 10', () => {
    expect(unlockedTricks(pet(3, 'baby'), shop()).map((t) => t.id)).toEqual(['wave'])
    expect(unlockedTricks(pet(6, 'young'), shop()).map((t) => t.id)).toEqual(['wave', 'spin'])
    expect(unlockedTricks(pet(10, 'grown'), shop()).map((t) => t.id)).toContain('somersault')
  })

  it('one trick per owned toy', () => {
    const t = unlockedTricks(pet(3, 'baby'), shop(['ball', 'yarn']))
    expect(t.map((x) => x.id)).toEqual(['wave', 'toy:ball', 'toy:yarn'])
  })

  it('the newest trick is the one Trick! plays', () => {
    expect(newestTrick(pet(1, 'baby'), shop())).toBeNull()
    expect(newestTrick(pet(3, 'baby'), shop())!.id).toBe('wave')
    expect(newestTrick(pet(6, 'young'), shop(['ball']))!.id).toBe('toy:ball')
    expect(newestTrick(pet(10, 'grown'), shop(['ball']))!.id).toBe('bow')
  })

  it('grown-up gets a bow as its star trick', () => {
    const list = unlockedTricks(pet(10, 'grown'), shop())
    expect(list.map((t) => t.id)).toContain('bow')
  })
})
