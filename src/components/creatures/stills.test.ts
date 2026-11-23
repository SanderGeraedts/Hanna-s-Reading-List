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
