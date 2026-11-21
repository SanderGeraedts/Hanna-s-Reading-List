import { describe, expect, it } from 'vitest'
import { describeFailure } from './shelfDiagnosis'

describe('why the shelf could not be drawn, in one line (T-0003)', () => {
  it('names a lost drawing with the time, the books and the phone', () => {
    expect(
      describeFailure({ kind: 'lost', afterSeconds: 3.4 }, 412, {
        width: 412,
        height: 915,
        pixelRatio: 2.625,
        maxTexture: 4096,
        gpu: 'Mali-G57',
      }),
    ).toBe('lost after 3 s · 412 books · 412×915 · @2.63x · max texture 4096 · Mali-G57')
  })

  it('names an error by its message, kept short and on one line', () => {
    const line = describeFailure({ kind: 'error', message: "Cannot read properties of null (reading 'fillRect')\n at paintSpine" }, 300)
    expect(line).toBe("error: Cannot read properties of null (reading 'fillRect') at paintSpine · 300 books")
    expect(describeFailure({ kind: 'error', message: 'x'.repeat(500) }, 1).length).toBeLessThan(150)
  })
})
