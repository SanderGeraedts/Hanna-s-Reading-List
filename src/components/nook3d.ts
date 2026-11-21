import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { NOOK_THEMES } from '#/lib/nookThemes'
import type { NookThemeId } from '#/lib/nookThemes'
import { D, H, IH, IW, SHELL, W } from './nookPaint'

/**
 * 3D book nooks (T-0012): tiny worlds built from blocks, like the handmade
 * nooks people put between their books. Everything solid in one nook (the
 * box, houses, roofs, stone) is merged into one geometry with vertex colours,
 * and everything that glows (windows, lanterns, bulbs, torches) into another,
 * so a whole nook is two draws however much is in it.
 *
 * Origin: bottom-centre of the box, opening towards +z, like the painted nooks.
 */

export const NOOK_3D: NookThemeId[] = ['alley', 'castle']

export interface NookGeometry {
  solid: THREE.BufferGeometry
  glow: THREE.BufferGeometry
}

/** A small seeded random, so a group's nook looks the same every time. */
function seeded(seed: number) {
  let h = (seed * 2654435761) >>> 0 || 1
  return () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return ((h >>> 0) % 100_000) / 100_000
  }
}

class Builder {
  private parts: THREE.BufferGeometry[] = []
  private color = new THREE.Color()
  add(g: THREE.BufferGeometry, color: string, at: [number, number, number], rot: [number, number, number] = [0, 0, 0]) {
    const geo = g.index ? g.toNonIndexed() : g
    if (geo !== g) g.dispose()
    geo.deleteAttribute('uv')
    geo.rotateX(rot[0])
    geo.rotateY(rot[1])
    geo.rotateZ(rot[2])
    geo.translate(at[0], at[1], at[2])
    this.color.set(color)
    const n = geo.attributes.position.count
    const c = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) c.set([this.color.r, this.color.g, this.color.b], i * 3)
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3))
    this.parts.push(geo)
    return this
  }
  box(w: number, h: number, d: number, color: string, at: [number, number, number], rot?: [number, number, number]) {
    return this.add(new THREE.BoxGeometry(w, h, d), color, at, rot)
  }
  done(): THREE.BufferGeometry {
    if (!this.parts.length) return new THREE.BufferGeometry()
    const merged = mergeGeometries(this.parts, false)!
    this.parts.forEach((p) => p.dispose())
    this.parts = []
    return merged
  }
}

const FLOOR = SHELL
const BACK = -D / 2 + SHELL
const FRONT = D / 2

/** The box itself, bound like a book, with gilt edging round the opening (as the painted nooks). */
function shell(b: Builder, colour: string) {
  b.box(SHELL, H, D, colour, [-W / 2 + SHELL / 2, H / 2, 0])
  b.box(SHELL, H, D, colour, [W / 2 - SHELL / 2, H / 2, 0])
  b.box(W, SHELL, D, colour, [0, H - SHELL / 2, 0])
  b.box(W, SHELL, D, colour, [0, SHELL / 2, 0])
  b.box(W, H, SHELL, colour, [0, H / 2, -D / 2 + SHELL / 2])
  const gilt = '#c9a24a'
  b.box(W, 0.0025, 0.001, gilt, [0, H - SHELL / 2, D / 2 + 0.0006])
  b.box(W, 0.0025, 0.001, gilt, [0, SHELL / 2, D / 2 + 0.0006])
  for (const s of [-1, 1]) b.box(0.0025, H, 0.001, gilt, [s * (W / 2 - SHELL / 2), H / 2, D / 2 + 0.0006])
}

const pick = <T,>(list: T[], r: () => number) => list[Math.floor(r() * list.length) % list.length]

// ---------------------------------------------------------------------------
// The night alley: crooked house fronts on both sides, lit windows and doors,
// hanging lanterns, bulbs strung across, steps up to an arch at the back.
// ---------------------------------------------------------------------------

function alley(variant: number): NookGeometry {
  const theme = NOOK_THEMES.alley
  const r = seeded(variant + 17)
  const solid = new Builder()
  const glow = new Builder()
  shell(solid, theme.shell)

  const depthStart = BACK + 0.01
  const depthEnd = FRONT - 0.012
  const lightColours = theme.lights ?? ['#ffd27a']
  for (const side of [-1, 1] as const) {
    const palette = theme.palettes[side < 0 ? 0 : 1]
    let z = depthStart
    let i = 0
    while (z < depthEnd - 0.02) {
      const len = Math.min(depthEnd - z, 0.04 + r() * 0.035)
      const height = 0.12 + r() * 0.1
      const deep = 0.022 + r() * 0.008
      const wall = pick(palette, r)
      const cz = z + len / 2
      const x = side * (IW / 2 - deep / 2)
      // the house front, a slightly darker storey line, and a pitched roof
      solid.box(deep, height, len, wall, [x, FLOOR + height / 2, cz])
      solid.box(deep + 0.002, 0.003, len + 0.001, '#3a2a20', [x, FLOOR + height * 0.48, cz])
      const roof = new THREE.CylinderGeometry(0.0001, deep * 0.75, len * 0.62, 4, 1)
      solid.add(roof, pick(['#5a3a2e', '#4a3a3a', '#6a4430', '#3d3a44'], r), [x, FLOOR + height + 0.012, cz], [Math.PI / 2, 0, Math.PI / 4])
      // a chimney now and then
      if (r() < 0.45) solid.box(0.006, 0.02, 0.006, '#5a3a2e', [x - side * 0.004, FLOOR + height + 0.02, cz + len * 0.2])
      // windows on the street side: lit (glow) or dark, two storeys
      const face = side * (IW / 2 - deep) - side * 0.0006
      for (const row of [0.3, 0.68]) {
        const n = len > 0.06 ? 2 : 1
        for (let k = 0; k < n; k++) {
          const wz = cz + (n === 1 ? 0 : (k - 0.5) * len * 0.45)
          const wy = FLOOR + height * row
          const lit = r() < 0.72
          ;(lit ? glow : solid).box(0.001, 0.012, 0.009, lit ? pick(['#ffd27a', '#ffc46b', '#ffe3a3'], r) : '#1e2430', [face, wy, wz])
          solid.box(0.0015, 0.0016, 0.011, '#2a1d16', [face - side * 0.0004, wy - 0.007, wz])
        }
      }
      // a door, sometimes with a lamp over it
      if (i % 2 === 0 || r() < 0.4) {
        solid.box(0.001, 0.022, 0.011, pick(['#4b2e22', '#2e3b4b', '#5b2a2a', '#2f4b3a'], r), [face, FLOOR + 0.011, cz + len * 0.25])
        if (r() < 0.6) glow.box(0.004, 0.005, 0.004, '#ffcf7a', [face - side * 0.003, FLOOR + 0.027, cz + len * 0.25])
      }
      // a hanging lantern on a bracket
      if (r() < 0.5) {
        solid.box(0.008, 0.0012, 0.0012, '#1c1c22', [face - side * 0.004, FLOOR + height * 0.82, cz - len * 0.2])
        glow.box(0.004, 0.006, 0.004, '#ffd27a', [face - side * 0.008, FLOOR + height * 0.82 - 0.005, cz - len * 0.2])
      }
      z += len + 0.001
      i++
    }
  }

  // steps at the back, up to an arch across the alley
  const street = IW - 0.05
  for (let s = 0; s < 4; s++) {
    solid.box(street, 0.006, 0.012, '#6f6a62', [0, FLOOR + 0.003 + s * 0.006, BACK + 0.04 - s * 0.009])
  }
  solid.box(IW, 0.018, 0.014, '#7a6a58', [0, FLOOR + 0.15 + r() * 0.04, BACK + 0.03])
  // bulbs strung across, in two sagging strings
  for (const [zf, yf] of [
    [0.25, 0.74],
    [-0.1, 0.8],
  ]) {
    const zz = zf * D
    for (let k = 1; k <= 6; k++) {
      const t = k / 7
      const y = FLOOR + IH * yf - 0.02 * 4 * t * (1 - t)
      glow.box(0.0035, 0.0045, 0.0035, lightColours[k % lightColours.length], [-IW / 2 + t * IW, y, zz])
    }
  }
  return { solid: solid.done(), glow: glow.done() }
}

// ---------------------------------------------------------------------------
// The castle: round towers with cone roofs on both sides, battlements along
// the walls, a gate with a glowing portcullis at the back, torches, pennants,
// and a keep with lit windows against the night sky.
// ---------------------------------------------------------------------------

function castle(variant: number): NookGeometry {
  const theme = NOOK_THEMES.castle
  const r = seeded(variant + 41)
  const solid = new Builder()
  const glow = new Builder()
  shell(solid, theme.shell)
  const stone = (side: number) => pick(theme.palettes[side < 0 ? 0 : 1], r)
  const roofColour = pick(['#4a5a8a', '#7a3a4a', '#3f6b5a', '#6a4a8a', '#8a5a3a'], r)
  const flag = pick(['#d4a843', '#c94f4f', '#4f7ac9', '#e9e2d0', '#7ac9a0'], r)

  for (const side of [-1, 1] as const) {
    const wallX = side * (IW / 2 - 0.012)
    // the curtain wall along the side, with battlements
    const wallH = 0.13 + r() * 0.02
    solid.box(0.024, wallH, D - 0.03, stone(side), [wallX, FLOOR + wallH / 2, 0])
    for (let z = BACK + 0.02; z < FRONT - 0.02; z += 0.014) {
      solid.box(0.026, 0.008, 0.007, stone(side), [wallX, FLOOR + wallH + 0.004, z])
    }
    // arrow slits and a few lit windows
    for (let z = BACK + 0.04; z < FRONT - 0.03; z += 0.035) {
      const lit = r() < 0.5
      ;(lit ? glow : solid).box(0.001, 0.014, 0.004, lit ? '#ff9b45' : '#1a1a20', [wallX - side * 0.0125, FLOOR + wallH * 0.62, z])
    }
    // torches on the wall
    for (const z of [FRONT * 0.35, -D * 0.1]) {
      solid.box(0.002, 0.012, 0.002, '#3a2a1a', [wallX - side * 0.014, FLOOR + 0.06, z])
      glow.box(0.004, 0.006, 0.004, '#ffb35a', [wallX - side * 0.014, FLOOR + 0.069, z])
    }
    // a round tower at the front corner, with a cone roof and a pennant
    const tx = side * (IW / 2 - 0.016)
    const tz = FRONT - 0.04
    const th = 0.17 + r() * 0.04
    solid.add(new THREE.CylinderGeometry(0.016, 0.017, th, 10), stone(side), [tx, FLOOR + th / 2, tz])
    solid.add(new THREE.ConeGeometry(0.02, 0.045, 10), roofColour, [tx, FLOOR + th + 0.0225, tz])
    solid.box(0.0012, 0.02, 0.0012, '#2a2a2a', [tx, FLOOR + th + 0.055, tz])
    solid.add(new THREE.ConeGeometry(0.004, 0.012, 3), flag, [tx + side * -0.006, FLOOR + th + 0.06, tz], [0, 0, side * Math.PI / 2])
    glow.box(0.001, 0.012, 0.005, '#ffb35a', [tx - side * 0.0165, FLOOR + th * 0.7, tz])
  }

  // the gate at the back: a gatehouse with a glowing portcullis
  const gateW = IW - 0.05
  solid.box(gateW, 0.11, 0.02, stone(-1), [0, FLOOR + 0.055, BACK + 0.012])
  for (let x = -gateW / 2 + 0.004; x < gateW / 2; x += 0.009) {
    solid.box(0.006, 0.007, 0.02, stone(1), [x, FLOOR + 0.114, BACK + 0.012])
  }
  glow.box(0.026, 0.05, 0.001, '#ff9b45', [0, FLOOR + 0.025, BACK + 0.023])
  for (let x = -0.011; x <= 0.011; x += 0.0055) solid.box(0.0012, 0.05, 0.0015, '#1c1c22', [x, FLOOR + 0.025, BACK + 0.024])
  // the keep beyond the gate, against the sky, with a tower of its own
  solid.box(0.04, 0.2, 0.02, stone(1), [0, FLOOR + 0.1, BACK + 0.004])
  solid.add(new THREE.CylinderGeometry(0.01, 0.011, 0.07, 10), stone(-1), [0.014, FLOOR + 0.212, BACK + 0.009])
  // its roof stays below the top of the box
  solid.add(new THREE.ConeGeometry(0.014, 0.04, 10), roofColour, [0.014, FLOOR + 0.267, BACK + 0.009])
  for (const [x, y] of [
    [-0.01, 0.15],
    [0.008, 0.16],
    [-0.004, 0.185],
  ]) {
    if (r() < 0.8) glow.box(0.005, 0.008, 0.001, '#ffc06a', [x, FLOOR + y, BACK + 0.0145])
  }
  // a cobbled courtyard path: a few flat stones
  for (let z = BACK + 0.035; z < FRONT - 0.01; z += 0.016) {
    solid.box(0.03 + r() * 0.01, 0.0015, 0.012, pick(['#6a645c', '#5e5952', '#77716a'], r), [(r() - 0.5) * 0.008, FLOOR + 0.0008, z])
  }
  return { solid: solid.done(), glow: glow.done() }
}

const cache = new Map<string, NookGeometry>()

/** The 3D geometry of a nook, the same every time for a group (cached; shared by every nook with that scene and variant). */
export function nookGeometry(theme: NookThemeId, variant: number): NookGeometry | null {
  if (!NOOK_3D.includes(theme)) return null
  const key = `${theme}:${variant}`
  let g = cache.get(key)
  if (!g) {
    g = theme === 'alley' ? alley(variant) : castle(variant)
    cache.set(key, g)
  }
  return g
}
