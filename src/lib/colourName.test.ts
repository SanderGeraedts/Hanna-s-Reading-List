import { describe, expect, it } from 'vitest'
import { colourName, swatchNames } from './colourName'

describe('colourName (T-0019)', () => {
  it.each([
    ['#7a2e2e', 'Red'],
    ['#4a0d0d', 'Dark red'],
    ['#2e4a7a', 'Blue'],
    ['#9fc4f0', 'Light blue'],
    ['#2f5d46', 'Green'],
    ['#1f5f6b', 'Teal'],
    ['#6b4c8a', 'Purple'],
    ['#c4467e', 'Pink'],
    ['#e07b1f', 'Orange'],
    ['#8a5a2b', 'Brown'],
    ['#72564d', 'Brown'],
    ['#a8875f', 'Brown'],
    ['#5a3a1b', 'Brown'],
    ['#d1d100', 'Yellow'],
    ['#3d3d3d', 'Grey'],
    ['#151515', 'Black'],
    ['#fafafa', 'White'],
    ['#f2e6c8', 'Cream'],
    ['#b0b0b0', 'Grey'],
    ['#d8d8d8', 'Light grey'],
  ])('%s is %s', (hex, name) => {
    expect(colourName(hex)).toBe(name)
  })

  it('never gives a hex code', () => {
    for (let v = 0; v < 0x1000000; v += 0x10305) {
      const hex = '#' + v.toString(16).padStart(6, '0')
      expect(colourName(hex)).not.toMatch(/#|[0-9]/)
    }
  })
})

describe('swatchNames (T-0019)', () => {
  it('adds ", dominant" to the first and numbers repeated names', () => {
    expect(swatchNames(['#7a2e2e', '#2e4a7a', '#7d3030', '#2e4a7a'], true)).toEqual([
      'Red, dominant',
      'Blue',
      'Red 2',
      'Blue 2',
    ])
  })

  it('has no dominant without cover swatches', () => {
    expect(swatchNames(['#7a2e2e'], false)).toEqual(['Red'])
  })
})

describe('muted warm swatches are brown (T-0019 review, M1)', () => {
  it('names the real Harry Potter cover row without a red or orange that isn’t there', () => {
    const names = swatchNames(['#72564d', '#a17e5a', '#1c3654', '#583a39', '#322d32', '#534d60'], true)
    expect(names).toEqual(['Brown, dominant', 'Brown 2', 'Dark blue', 'Brown 3', 'Dark grey', 'Grey'])
  })
})
