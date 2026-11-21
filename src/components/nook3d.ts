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

export const NOOK_3D: NookThemeId[] = ['alley', 'castle', 'forest', 'seaside', 'winter', 'neon', 'library', 'meadow', 'space', 'aurora']

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

// ---------------------------------------------------------------------------
// Shared pieces for the other scenes
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2
const NEAR = FRONT - 0.012 // nothing in a scene comes closer than this (the sign hangs in front)

/** A row of little houses along one side, like the alley's, with options per scene. */
function houseRow(
  solid: Builder,
  glow: Builder,
  r: () => number,
  side: -1 | 1,
  o: {
    palette: string[]
    roofs: string[]
    minH: number
    maxH: number
    lit: number
    windowGlow: string[]
    dark: string
    snowy?: boolean
    /** start and end along the depth */
    from?: number
    to?: number
  },
) {
  let z = o.from ?? BACK + 0.01
  const end = o.to ?? NEAR
  while (z < end - 0.02) {
    const len = Math.min(end - z, 0.04 + r() * 0.035)
    const height = o.minH + r() * (o.maxH - o.minH)
    const deep = 0.022 + r() * 0.008
    const cz = z + len / 2
    const x = side * (IW / 2 - deep / 2)
    solid.box(deep, height, len, pick(o.palette, r), [x, FLOOR + height / 2, cz])
    solid.add(new THREE.CylinderGeometry(0.0001, deep * 0.75, len * 0.62, 4, 1), pick(o.roofs, r), [x, FLOOR + height + 0.012, cz], [Math.PI / 2, 0, Math.PI / 4])
    if (o.snowy) {
      // snow on the roof ridge and along the eaves
      solid.add(new THREE.CylinderGeometry(0.0001, deep * 0.62, len * 0.64, 4, 1), '#f4f7fb', [x, FLOOR + height + 0.016, cz], [Math.PI / 2, 0, Math.PI / 4])
    }
    const face = side * (IW / 2 - deep) - side * 0.0006
    for (const row of height > 0.1 ? [0.3, 0.68] : [0.45]) {
      const n = len > 0.06 ? 2 : 1
      for (let k = 0; k < n; k++) {
        const wz = cz + (n === 1 ? 0 : (k - 0.5) * len * 0.45)
        const lit = r() < o.lit
        ;(lit ? glow : solid).box(0.001, 0.012, 0.009, lit ? pick(o.windowGlow, r) : o.dark, [face, FLOOR + height * row, wz])
      }
    }
    solid.box(0.001, 0.022, 0.011, pick(['#4b2e22', '#2e3b4b', '#5b2a2a', '#2f4b3a'], r), [face, FLOOR + 0.011, cz + len * 0.25])
    z += len + 0.001
  }
}

/** A pine tree: a trunk and stacked cones, with snow on top if asked. */
function pine(solid: Builder, x: number, z: number, h: number, green: string, snowy = false) {
  solid.add(new THREE.CylinderGeometry(0.002, 0.003, h * 0.25, 6), '#5a3a26', [x, FLOOR + h * 0.125, z])
  for (let i = 0; i < 3; i++) {
    const s = 1 - i * 0.25
    const y = FLOOR + h * (0.3 + i * 0.22)
    solid.add(new THREE.ConeGeometry(0.014 * s * (h / 0.12), h * 0.36, 8), green, [x, y + h * 0.18, z])
    if (snowy) solid.add(new THREE.ConeGeometry(0.009 * s * (h / 0.12), h * 0.14, 8), '#f4f7fb', [x, y + h * 0.31, z])
  }
}

/** A string of bulbs across the scene, sagging in the middle. */
function bulbs(glow: Builder, colours: string[], z: number, y: number, n = 6) {
  for (let k = 1; k <= n; k++) {
    const t = k / (n + 1)
    glow.box(0.0035, 0.0045, 0.0035, colours[k % colours.length], [-IW / 2 + t * IW, FLOOR + y - 0.02 * 4 * t * (1 - t), z])
  }
}

/** Somewhere in the scene, away from the sides, for little things on the ground. */
const midX = (r: () => number, spread = 0.03) => (r() - 0.5) * spread

// ---------------------------------------------------------------------------
// The enchanted forest: tall trees on both sides, a fairy door in a trunk,
// red toadstools, stepping stones and fireflies.
// ---------------------------------------------------------------------------

function forest(variant: number): NookGeometry {
  const theme = NOOK_THEMES.forest
  const r = seeded(variant + 59)
  const solid = new Builder()
  const glow = new Builder()
  shell(solid, theme.shell)
  for (const side of [-1, 1] as const) {
    // leafy tops stay inside the box and behind the sign
    for (let z = BACK + 0.02; z < NEAR - 0.022; z += 0.03 + r() * 0.012) {
      const x = side * (IW / 2 - 0.018 - r() * 0.004)
      const h = 0.18 + r() * 0.08
      // a round-topped tree: trunk and three leafy balls
      solid.add(new THREE.CylinderGeometry(0.004, 0.006, h * 0.55, 7), pick(['#5a3a26', '#4a3020', '#6a4630'], r), [x, FLOOR + h * 0.275, z])
      for (let i = 0; i < 3; i++) {
        const leaf = new THREE.SphereGeometry(0.011 + r() * 0.005, 10, 8)
        solid.add(leaf, pick(theme.palettes[side < 0 ? 0 : 1], r), [x + (r() - 0.5) * 0.006, FLOOR + h * (0.6 + i * 0.14), z + (r() - 0.5) * 0.006])
      }
    }
  }
  // a fairy door with a glowing window in the big tree at the back
  solid.add(new THREE.CylinderGeometry(0.016, 0.02, 0.2, 10), '#5a3a26', [0, FLOOR + 0.1, BACK + 0.022])
  solid.add(new THREE.SphereGeometry(0.03, 12, 10), pick(theme.palettes[0], r), [0, FLOOR + 0.21, BACK + 0.031])
  solid.box(0.012, 0.018, 0.002, '#7a3a2a', [0, FLOOR + 0.009, BACK + 0.042])
  glow.add(new THREE.CircleGeometry(0.004, 10), '#ffd27a', [0, FLOOR + 0.03, BACK + 0.04])
  // toadstools and stepping stones
  for (let i = 0; i < 4; i++) {
    const x = midX(r, 0.05)
    const z = BACK + 0.06 + i * 0.03
    solid.add(new THREE.CylinderGeometry(0.0015, 0.002, 0.008, 6), '#f4ead8', [x, FLOOR + 0.004, z])
    solid.add(new THREE.SphereGeometry(0.005, 10, 6, 0, TAU, 0, Math.PI / 2), '#c93a3a', [x, FLOOR + 0.008, z])
    solid.box(0.012, 0.0015, 0.009, '#8a8378', [midX(r, 0.01), FLOOR + 0.0008, z + 0.012])
  }
  // fireflies drifting between the trees
  for (let i = 0; i < 16; i++) {
    glow.box(0.002, 0.002, 0.002, pick(theme.lights ?? ['#e8ff9a'], r), [midX(r, 0.08), FLOOR + 0.04 + r() * 0.2, BACK + 0.02 + r() * (NEAR - BACK - 0.03)])
  }
  return { solid: solid.done(), glow: glow.done() }
}

// ---------------------------------------------------------------------------
// The beach at sunset: pastel beach huts on both sides, a boardwalk, beach
// umbrellas, a lighthouse with a glowing lamp at the end, lights strung across.
// ---------------------------------------------------------------------------

function seaside(variant: number): NookGeometry {
  const theme = NOOK_THEMES.seaside
  const r = seeded(variant + 71)
  const solid = new Builder()
  const glow = new Builder()
  shell(solid, theme.shell)
  for (const side of [-1, 1] as const) {
    for (let z = BACK + 0.03; z < NEAR - 0.02; z += 0.038) {
      const w = 0.024
      const h = 0.06 + r() * 0.02
      const x = side * (IW / 2 - w / 2 - 0.002)
      const colour = pick(theme.palettes[side < 0 ? 0 : 1], r)
      solid.box(w, h, 0.032, colour, [x, FLOOR + 0.006 + h / 2, z])
      // white stripes and a little gable roof
      for (let k = 0; k < 3; k++) solid.box(w + 0.0005, 0.004, 0.0325, '#fbf6ee', [x, FLOOR + 0.006 + h * (0.25 + k * 0.25), z])
      solid.add(new THREE.CylinderGeometry(0.0001, 0.02, 0.034, 4, 1), '#f4ead8', [x, FLOOR + 0.006 + h + 0.008, z], [Math.PI / 2, 0, Math.PI / 4])
      const face = side * (IW / 2 - w - 0.002) - side * 0.0006
      solid.box(0.001, 0.026, 0.012, '#fbf6ee', [face, FLOOR + 0.019, z])
      // the hut stands on stilts over the sand
      for (const dz of [-0.013, 0.013]) solid.box(0.002, 0.006, 0.002, '#8a6a4a', [x, FLOOR + 0.003, z + dz])
      if (r() < 0.5) glow.box(0.001, 0.008, 0.008, '#ffd59a', [face, FLOOR + 0.04, z - 0.008])
    }
  }
  // the boardwalk down the middle
  for (let z = BACK + 0.04; z < NEAR - 0.004; z += 0.008) solid.box(0.032, 0.002, 0.007, pick(['#b08a62', '#a07a52', '#c09a72'], r), [0, FLOOR + 0.001, z])
  // the lighthouse at the end: red and white rings, a glowing lamp
  for (let i = 0; i < 6; i++) solid.add(new THREE.CylinderGeometry(0.0105 - i * 0.0008, 0.0115 - i * 0.0008, 0.025, 12), i % 2 ? '#fbf6ee' : '#c94f4f', [0, FLOOR + 0.0125 + i * 0.025, BACK + 0.02])
  glow.add(new THREE.CylinderGeometry(0.007, 0.007, 0.014, 12), '#fff3c4', [0, FLOOR + 0.157, BACK + 0.02])
  solid.add(new THREE.ConeGeometry(0.01, 0.014, 12), '#c94f4f', [0, FLOOR + 0.171, BACK + 0.02])
  // beach umbrellas
  for (const [x, z] of [
    [-0.012, NEAR - 0.04],
    [0.012, BACK + 0.08],
  ]) {
    solid.box(0.0012, 0.04, 0.0012, '#fbf6ee', [x, FLOOR + 0.02, z])
    solid.add(new THREE.ConeGeometry(0.014, 0.008, 10), pick(theme.palettes[1], r), [x, FLOOR + 0.042, z])
  }
  bulbs(glow, theme.lights ?? ['#ffe0a3'], D * 0.2, IH * 0.62)
  return { solid: solid.done(), glow: glow.done() }
}

// ---------------------------------------------------------------------------
// The snowy village: houses with snow on their roofs, coloured lights, a lamp
// post, snowy pines and a snowman.
// ---------------------------------------------------------------------------

function winter(variant: number): NookGeometry {
  const theme = NOOK_THEMES.winter
  const r = seeded(variant + 83)
  const solid = new Builder()
  const glow = new Builder()
  shell(solid, theme.shell)
  for (const side of [-1, 1] as const) {
    houseRow(solid, glow, r, side, {
      palette: theme.palettes[side < 0 ? 0 : 1],
      roofs: ['#4a3a3a', '#3d3a44', '#5a3a2e'],
      minH: 0.1,
      maxH: 0.17,
      lit: 0.8,
      windowGlow: ['#ffd28a', '#ffc46b'],
      dark: '#1e2430',
      snowy: true,
    })
  }
  // snowy pines at the back and a snowman in the street
  pine(solid, -0.012, BACK + 0.02, 0.14, '#2f5a3f', true)
  pine(solid, 0.014, BACK + 0.03, 0.11, '#36603f', true)
  const sx = midX(r, 0.012)
  const sz = BACK + 0.09 + r() * 0.03
  solid.add(new THREE.SphereGeometry(0.009, 12, 10), '#f4f7fb', [sx, FLOOR + 0.008, sz])
  solid.add(new THREE.SphereGeometry(0.0065, 12, 10), '#f4f7fb', [sx, FLOOR + 0.021, sz])
  solid.add(new THREE.ConeGeometry(0.0012, 0.005, 6), '#ff8a3a', [sx, FLOOR + 0.022, sz + 0.0075], [Math.PI / 2, 0, 0])
  solid.box(0.009, 0.0015, 0.009, pick(['#c94f4f', '#4f7ac9', '#3f6b3a'], r), [sx, FLOOR + 0.017, sz])
  // a lamp post
  solid.box(0.0018, 0.11, 0.0018, '#1c1c22', [-0.016, FLOOR + 0.055, NEAR - 0.03])
  glow.box(0.006, 0.007, 0.006, '#ffd28a', [-0.016, FLOOR + 0.114, NEAR - 0.03])
  for (const [z, y] of [
    [D * 0.22, IH * 0.66],
    [-D * 0.08, IH * 0.72],
  ])
    bulbs(glow, theme.lights ?? ['#ff6b6b'], z, y, 7)
  return { solid: solid.done(), glow: glow.done() }
}

// ---------------------------------------------------------------------------
// The rainy neon street: tall dark buildings with glowing neon signs, lit
// windows, a lamp post, cables overhead and a glowing vending machine.
// ---------------------------------------------------------------------------

function neon(variant: number): NookGeometry {
  const theme = NOOK_THEMES.neon
  const r = seeded(variant + 97)
  const solid = new Builder()
  const glow = new Builder()
  shell(solid, theme.shell)
  for (const side of [-1, 1] as const) {
    let z = BACK + 0.008
    while (z < NEAR - 0.02) {
      const len = Math.min(NEAR - z, 0.045 + r() * 0.03)
      const h = 0.2 + r() * 0.08
      const deep = 0.024
      const x = side * (IW / 2 - deep / 2)
      const cz = z + len / 2
      solid.box(deep, Math.min(h, IH - 0.004), len, pick(['#262a3a', '#1f2333', '#2c2f44', '#232637'], r), [x, FLOOR + Math.min(h, IH - 0.004) / 2, cz])
      const face = side * (IW / 2 - deep) - side * 0.0006
      // rows of small windows, some lit cool white
      for (let y = 0.05; y < h - 0.02; y += 0.022) {
        for (const dz of [-len * 0.25, len * 0.25]) {
          if (r() < 0.45) glow.box(0.001, 0.006, 0.006, pick(['#cfe8ff', '#ffe9c2', '#bfc8ff'], r), [face, FLOOR + y, cz + dz])
        }
      }
      // a vertical neon sign sticking out
      const neonColour = pick(theme.palettes[side < 0 ? 0 : 1], r)
      glow.box(0.006, 0.04 + r() * 0.03, 0.002, neonColour, [face - side * 0.006, FLOOR + 0.08 + r() * 0.08, cz])
      glow.box(0.0015, 0.0015, len * 0.7, neonColour, [face - side * 0.001, FLOOR + 0.035, cz])
      z += len + 0.001
    }
  }
  // cables strung across, a lamp post and a vending machine
  for (const z of [D * 0.1, -D * 0.2]) solid.box(IW - 0.04, 0.0006, 0.0006, '#0d0d14', [0, FLOOR + 0.22, z])
  solid.box(0.0018, 0.12, 0.0018, '#1c1c22', [0.016, FLOOR + 0.06, NEAR - 0.035])
  glow.box(0.006, 0.006, 0.006, '#ffe2a0', [0.016, FLOOR + 0.122, NEAR - 0.035])
  solid.box(0.012, 0.03, 0.01, '#2a3a6a', [-0.015, FLOOR + 0.015, BACK + 0.07])
  glow.box(0.009, 0.018, 0.001, pick(['#45e0ff', '#ff4fa3'], r), [-0.015, FLOOR + 0.019, BACK + 0.0755])
  return { solid: solid.done(), glow: glow.done() }
}

// ---------------------------------------------------------------------------
// The cosy library: bookcases full of tiny books on both sides, a rolling
// ladder, an armchair and a reading lamp at the end, warm lights strung across.
// ---------------------------------------------------------------------------

function library(variant: number): NookGeometry {
  const theme = NOOK_THEMES.library
  const r = seeded(variant + 101)
  const solid = new Builder()
  const glow = new Builder()
  shell(solid, theme.shell)
  const wood = '#5a3a26'
  for (const side of [-1, 1] as const) {
    const deep = 0.02
    const x = side * (IW / 2 - deep / 2)
    const len = NEAR - BACK - 0.006
    const cz = BACK + 0.003 + len / 2
    solid.box(0.003, IH - 0.01, len, wood, [side * (IW / 2 - 0.0015), FLOOR + (IH - 0.01) / 2, cz])
    // shelves, each full of books of different heights and colours
    for (let y = 0.004; y < IH - 0.04; y += 0.042) {
      solid.box(deep, 0.003, len, wood, [x, FLOOR + y, cz])
      let z = BACK + 0.006
      while (z < NEAR - 0.006) {
        const t = 0.003 + r() * 0.003
        const h = 0.026 + r() * 0.01
        if (r() < 0.92) solid.box(deep * 0.8, h, t, pick(theme.palettes[side < 0 ? 0 : 1], r), [x + side * 0.002, FLOOR + y + 0.0015 + h / 2, z + t / 2])
        z += t + 0.0004
      }
    }
  }
  // a rolling ladder against the left bookcase
  for (const dz of [-0.008, 0.008]) solid.box(0.0015, 0.2, 0.0015, '#8a5a32', [-IW / 2 + 0.024, FLOOR + 0.1, BACK + 0.07 + dz], [0, 0, -0.12])
  for (let y = 0.02; y < 0.2; y += 0.025) solid.box(0.0015, 0.0012, 0.016, '#8a5a32', [-IW / 2 + 0.024 + y * 0.12, FLOOR + y, BACK + 0.07])
  // an armchair and a reading lamp at the end
  const chair = pick(['#8c2f39', '#2f5d8c', '#3f7a4a'], r)
  solid.box(0.026, 0.01, 0.018, chair, [0, FLOOR + 0.01, BACK + 0.025])
  solid.box(0.026, 0.026, 0.005, chair, [0, FLOOR + 0.022, BACK + 0.015])
  for (const s of [-1, 1]) solid.box(0.005, 0.016, 0.018, chair, [s * 0.0135, FLOOR + 0.016, BACK + 0.025])
  solid.box(0.0012, 0.05, 0.0012, '#c9a24a', [0.02, FLOOR + 0.025, BACK + 0.02])
  glow.add(new THREE.ConeGeometry(0.007, 0.008, 10, 1, true), '#ffcf7a', [0.02, FLOOR + 0.053, BACK + 0.02])
  bulbs(glow, theme.lights ?? ['#ffe2a0'], D * 0.15, IH * 0.85)
  return { solid: solid.done(), glow: glow.done() }
}

// ---------------------------------------------------------------------------
// The sunny meadow: pastel cottages, a picket fence, flowers everywhere and a
// round tree. Daylight, so nothing much glows.
// ---------------------------------------------------------------------------

function meadow(variant: number): NookGeometry {
  const theme = NOOK_THEMES.meadow
  const r = seeded(variant + 113)
  const solid = new Builder()
  const glow = new Builder()
  shell(solid, theme.shell)
  for (const side of [-1, 1] as const) {
    houseRow(solid, glow, r, side, {
      palette: theme.palettes[side < 0 ? 0 : 1],
      roofs: ['#c97a5a', '#d98a8a', '#8a6a4a', '#7aa0c9'],
      minH: 0.06,
      maxH: 0.1,
      lit: 0,
      windowGlow: [],
      dark: '#bfe0f0',
      from: BACK + 0.06,
    })
  }
  // a round tree at the back, a picket fence, and flowers
  solid.add(new THREE.CylinderGeometry(0.004, 0.006, 0.09, 8), '#6a4630', [0.008, FLOOR + 0.045, BACK + 0.036])
  solid.add(new THREE.SphereGeometry(0.035, 14, 12), pick(['#7aa85a', '#6a9a4a', '#8ab86a'], r), [0.008, FLOOR + 0.12, BACK + 0.036])
  for (let x = -IW / 2 + 0.006; x < IW / 2 - 0.004; x += 0.007) solid.box(0.0025, 0.014, 0.0015, '#fbf6ee', [x, FLOOR + 0.007, BACK + 0.074])
  solid.box(IW - 0.008, 0.0015, 0.001, '#fbf6ee', [0, FLOOR + 0.01, BACK + 0.074])
  const flowers = ['#f5b8b0', '#f7e3a3', '#e8c6e8', '#ffffff', '#f28a8a']
  for (let i = 0; i < 26; i++) {
    const x = midX(r, 0.05)
    const z = BACK + 0.06 + r() * (NEAR - BACK - 0.07)
    solid.box(0.0008, 0.008, 0.0008, '#5a8a3a', [x, FLOOR + 0.004, z])
    solid.add(new THREE.SphereGeometry(0.0022, 6, 5), pick(flowers, r), [x, FLOOR + 0.009, z])
  }
  return { solid: solid.done(), glow: glow.done() }
}

// ---------------------------------------------------------------------------
// Outer space: an alien landscape with rocky spires, domes with glowing
// windows, a rocket on its pad, an antenna and glowing crystals.
// ---------------------------------------------------------------------------

function space(variant: number): NookGeometry {
  const theme = NOOK_THEMES.space
  const r = seeded(variant + 127)
  const solid = new Builder()
  const glow = new Builder()
  shell(solid, theme.shell)
  const crystals = theme.lights ?? ['#7af0ff']
  for (const side of [-1, 1] as const) {
    for (let z = BACK + 0.02; z < NEAR - 0.01; z += 0.028 + r() * 0.01) {
      const h = 0.05 + r() * 0.12
      solid.add(new THREE.ConeGeometry(0.01 + r() * 0.006, h, 6), pick(theme.palettes[side < 0 ? 0 : 1], r), [side * (IW / 2 - 0.014), FLOOR + h / 2, z])
      if (r() < 0.6) glow.add(new THREE.ConeGeometry(0.0025, 0.012, 5), pick(crystals, r), [side * (IW / 2 - 0.026), FLOOR + 0.006, z + 0.006], [0, 0, side * 0.3])
    }
  }
  // two domes with glowing windows
  for (const [x, z, s] of [
    [-0.012, BACK + 0.04, 1],
    [0.014, BACK + 0.09, 0.7],
  ]) {
    solid.add(new THREE.SphereGeometry(0.02 * s, 14, 8, 0, TAU, 0, Math.PI / 2), '#b9c2d6', [x, FLOOR, z])
    glow.box(0.006 * s, 0.004 * s, 0.001, crystals[0], [x, FLOOR + 0.008 * s, z + 0.0195 * s])
    glow.box(0.004 * s, 0.003 * s, 0.001, crystals[1 % crystals.length], [x + 0.008 * s, FLOOR + 0.012 * s, z + 0.016 * s])
  }
  // a rocket on its pad, with fins and a glowing flame window
  const rz = NEAR - 0.045
  solid.add(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 12), '#5a5285', [0, FLOOR + 0.002, rz])
  solid.add(new THREE.CylinderGeometry(0.006, 0.007, 0.05, 12), '#e9e6f2', [0, FLOOR + 0.03, rz])
  solid.add(new THREE.ConeGeometry(0.006, 0.018, 12), pick(['#c94f4f', '#4f7ac9', '#c9a24a'], r), [0, FLOOR + 0.064, rz])
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU
    solid.box(0.001, 0.014, 0.008, '#c94f4f', [Math.cos(a) * 0.007, FLOOR + 0.011, rz + Math.sin(a) * 0.007], [0, -a, 0])
  }
  glow.add(new THREE.CircleGeometry(0.0025, 10), '#7af0ff', [0, FLOOR + 0.038, rz + 0.0068])
  // an antenna with a blinking tip
  solid.box(0.0012, 0.08, 0.0012, '#b9c2d6', [0.02, FLOOR + 0.04, BACK + 0.02])
  glow.add(new THREE.SphereGeometry(0.003, 8, 6), '#ff6b6b', [0.02, FLOOR + 0.082, BACK + 0.02])
  return { solid: solid.done(), glow: glow.done() }
}

// ---------------------------------------------------------------------------
// The northern lights: snowy log cabins with glowing windows, snowy pines, a
// little campfire and a lamp, under the aurora (painted on the sky).
// ---------------------------------------------------------------------------

function aurora(variant: number): NookGeometry {
  const theme = NOOK_THEMES.aurora
  const r = seeded(variant + 131)
  const solid = new Builder()
  const glow = new Builder()
  shell(solid, theme.shell)
  for (const side of [-1, 1] as const) {
    houseRow(solid, glow, r, side, {
      palette: theme.palettes[side < 0 ? 0 : 1],
      roofs: ['#3a2a20', '#4a3a3a'],
      minH: 0.06,
      maxH: 0.1,
      lit: 0.85,
      windowGlow: ['#ffd28a', '#ffc46b'],
      dark: '#1e2430',
      snowy: true,
      from: BACK + 0.07,
    })
  }
  // pines at the back, a campfire and a lamp
  for (const [x, z, h] of [
    [-0.02, BACK + 0.02, 0.16],
    [0.002, BACK + 0.035, 0.12],
    [0.022, BACK + 0.022, 0.14],
  ])
    pine(solid, x, z, h, pick(['#2f5a3f', '#36603f', '#2c4f36'], r), true)
  const fz = NEAR - 0.05
  for (let i = 0; i < 4; i++) solid.box(0.012, 0.002, 0.002, '#5a3a26', [0, FLOOR + 0.002, fz], [0, (i / 4) * Math.PI, 0])
  glow.add(new THREE.ConeGeometry(0.004, 0.012, 6), '#ffb35a', [0, FLOOR + 0.008, fz])
  glow.add(new THREE.ConeGeometry(0.0025, 0.008, 6), '#fff0a0', [0.001, FLOOR + 0.007, fz + 0.001])
  solid.box(0.0018, 0.1, 0.0018, '#1c1c22', [0.017, FLOOR + 0.05, NEAR - 0.025])
  glow.box(0.006, 0.007, 0.006, '#ffd28a', [0.017, FLOOR + 0.104, NEAR - 0.025])
  return { solid: solid.done(), glow: glow.done() }
}

const BUILDERS: Record<NookThemeId, (variant: number) => NookGeometry> = {
  alley,
  castle,
  forest,
  seaside,
  winter,
  neon,
  library,
  meadow,
  space,
  aurora,
}

const cache = new Map<string, NookGeometry>()

/** The 3D geometry of a nook, the same every time for a group (cached; shared by every nook with that scene and variant). */
export function nookGeometry(theme: NookThemeId, variant: number): NookGeometry | null {
  if (!NOOK_3D.includes(theme)) return null
  const key = `${theme}:${variant}`
  let g = cache.get(key)
  if (!g) {
    g = BUILDERS[theme](variant)
    cache.set(key, g)
  }
  return g
}
