import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SPECIES } from '#/lib/creatures/species'
import { stillNames } from './stillPaths'

/**
 * The still pictures (T-0030 Design §1): every species at every stage, normal and shiny, and the
 * six eggs, so a new species or stage can't ship without its pictures. Made by
 * `pnpm run render:creatures`.
 */

const dir = join(process.cwd(), 'public', 'creatures')

describe('the still pictures', () => {
  it('names 120 creature pictures and 6 eggs', () => {
    const names = stillNames()
    expect(names.length).toBe(SPECIES.length * 3 * 2 + 6)
    expect(names.length).toBe(126)
    expect(new Set(names).size).toBe(126)
    expect(names).toContain('cat-baby.webp')
    expect(names).toContain('starlight-unicorn-grown-shiny.webp')
    expect(names).toContain('egg-very-rare.webp')
  })

  it('has every one of them as a small WebP file', () => {
    const missing = stillNames().filter((n) => !existsSync(join(dir, n)))
    expect(missing).toEqual([])
    for (const n of stillNames()) {
      const file = join(dir, n)
      const head = readFileSync(file).subarray(0, 12)
      expect(head.subarray(0, 4).toString('latin1')).toBe('RIFF')
      expect(head.subarray(8, 12).toString('latin1')).toBe('WEBP')
      expect(statSync(file).size).toBeLessThan(40_000)
    }
  })
})

describe("the shop's pictures (T-0031 Design §10)", () => {
  it('has a picture for every item in SHOP (eggs reuse the egg pictures) and the Cosy den', async () => {
    const { SHOP_ITEMS } = await import('#/lib/creatures/shop')
    const { shopStill, eggStill } = await import('./stillPaths')
    const pub = join(process.cwd(), 'public')
    const files = SHOP_ITEMS.map((i) => (i.category === 'eggs' ? eggStill(i.tier!) : shopStill(i.id)))
    files.push(shopStill('cosy'))
    expect(files.length).toBe(42)
    const missing = files.filter((f) => !existsSync(join(pub, f)))
    expect(missing).toEqual([])
    for (const f of files) {
      const head = readFileSync(join(pub, f)).subarray(0, 12)
      expect(head.subarray(8, 12).toString('latin1'), f).toBe('WEBP')
      expect(statSync(join(pub, f)).size, f).toBeLessThan(40_000)
    }
  })
})
