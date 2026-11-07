import * as THREE from 'three'
import { NOOK } from '#/lib/shelfLayout'
import { NOOK_THEMES } from '#/lib/nookThemes'
import type { NookTheme, NookThemeId } from '#/lib/nookThemes'
import { toTexture } from './textures'

/**
 * Canvas painters for the book nook scenes (#17): two side walls, the sky at
 * the back and the ground, for each theme. `variant` changes colours, lit
 * windows and stars, so every group's nook is its own.
 */

export const SHELL = 0.007 // board thickness of the box
export const W = NOOK.width
export const H = NOOK.height
export const D = NOOK.depth
export const IW = W - SHELL * 2 // inner width
export const IH = H - SHELL * 2

const PX = 2000 // pixels per metre

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.round(w * PX)
  c.height = Math.round(h * PX)
  return c
}

/** Seeded random, so a group's nook looks the same every time. */
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export interface Lit {
  map: THREE.Texture
  /** what glows in the dark: lit windows, torches, fireflies */
  glow: THREE.Texture
}

export interface SceneTextures {
  leftWall: Lit
  rightWall: Lit
  sky: THREE.Texture
  ground: Lit
}

type Ctx = CanvasRenderingContext2D

/** Rotates a palette by the variant, so groups with the same theme still differ. */
const pick = (palette: string[], i: number, variant: number) => palette[(i + variant) % palette.length]

// ---------------------------------------------------------------------------
// walls
// ---------------------------------------------------------------------------

interface WallArgs {
  ctx: Ctx
  gl: Ctx
  cw: number
  ch: number
  frontFirst: boolean
  palette: string[]
  theme: NookTheme
  variant: number
  rand: () => number
}

function houses({ ctx, gl, cw, ch, frontFirst, palette, theme, variant, rand }: WallArgs) {
  const n = 3
  const hw = cw / n
  for (let i = 0; i < n; i++) {
    const fromFront = frontFirst ? i : n - 1 - i
    const x0 = i * hw
    const roof = ch * (0.08 + fromFront * 0.07 + rand() * 0.04)
    ctx.fillStyle = pick(palette, i, variant)
    ctx.fillRect(x0, roof, hw + 1, ch - roof)
    ctx.globalAlpha = 0.08
    for (let k = 0; k < 120; k++) {
      ctx.fillStyle = rand() < 0.5 ? '#000' : '#fff'
      ctx.fillRect(x0 + rand() * hw, roof + rand() * (ch - roof), 2 + rand() * 6, 1 + rand() * 3)
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(30,20,20,0.75)'
    ctx.fillRect(x0, roof, hw, ch * 0.012)
    if (theme.snowy) {
      ctx.fillStyle = '#f4f8ff'
      ctx.fillRect(x0, roof - ch * 0.012, hw, ch * 0.02)
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(x0 + hw - 2, roof, 3, ch - roof)
    const day = theme.sky === 'day'
    const floors = 3
    const floorH = (ch * 0.74 - roof) / floors
    for (let f = 0; f < floors; f++) {
      for (let k = 0; k < 2; k++) {
        const wx = x0 + hw * (0.2 + k * 0.42)
        const wy = roof + ch * 0.04 + f * floorH
        const ww = hw * 0.22
        const wh = floorH * 0.55
        ctx.fillStyle = '#2a1e18'
        ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4)
        if (day) {
          ctx.fillStyle = '#bfe3f5'
        } else if (rand() < 0.62) {
          const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh)
          grad.addColorStop(0, '#ffe7a8')
          grad.addColorStop(1, theme.glow)
          ctx.fillStyle = grad
          gl.fillStyle = rand() < 0.5 ? '#ffffff' : '#d9c6a0'
          gl.fillRect(wx, wy, ww, wh)
        } else {
          ctx.fillStyle = '#26304f'
        }
        ctx.fillRect(wx, wy, ww, wh)
        ctx.fillStyle = '#2a1e18'
        ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh)
        ctx.fillRect(wx, wy + wh / 2 - 1, ww, 2)
        ctx.fillStyle = '#5b3b26'
        ctx.fillRect(wx - 3, wy + wh + 2, ww + 6, 5)
        const flowers = theme.snowy ? ['#f4f8ff'] : ['#e26d8a', '#f2c14e', '#ffffff', '#c45ab3']
        for (let p = 0; p < 4; p++) {
          ctx.fillStyle = flowers[(p + f + k) % flowers.length]
          ctx.beginPath()
          ctx.arc(wx + (ww * (p + 0.5)) / 4, wy + wh + 1, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    // a door with a lit fanlight
    const dx = x0 + hw * 0.33
    const dw = hw * 0.32
    const dy = ch * 0.8
    ctx.fillStyle = ['#7b2f2f', '#2f4f6b', '#3f5f3a'][(i + variant) % 3]
    ctx.beginPath()
    ctx.moveTo(dx, ch)
    ctx.lineTo(dx, dy + dw / 2)
    ctx.arc(dx + dw / 2, dy + dw / 2, dw / 2, Math.PI, 0)
    ctx.lineTo(dx + dw, ch)
    ctx.fill()
    ctx.fillStyle = '#ffd98a'
    ctx.beginPath()
    ctx.arc(dx + dw / 2, dy + dw / 2, dw * 0.36, Math.PI, 0)
    ctx.fill()
    if (!day) {
      gl.fillStyle = '#c8a870'
      gl.beginPath()
      gl.arc(dx + dw / 2, dy + dw / 2, dw * 0.36, Math.PI, 0)
      gl.fill()
    }
  }
}

function trees({ ctx, gl, cw, ch, palette, variant, rand }: WallArgs) {
  // dark undergrowth, then trunks and round canopies, fireflies in between
  ctx.fillStyle = '#16241a'
  ctx.fillRect(0, ch * 0.2, cw, ch)
  for (let i = 0; i < 6; i++) {
    const x = (cw * (i + 0.3 + rand() * 0.4)) / 6
    const tw = cw * 0.035
    ctx.fillStyle = '#3a2a1e'
    ctx.fillRect(x - tw / 2, ch * 0.3, tw, ch * 0.7)
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = pick(palette, i + k, variant)
      ctx.beginPath()
      ctx.arc(x + (rand() - 0.5) * cw * 0.16, ch * (0.12 + rand() * 0.3), cw * (0.07 + rand() * 0.06), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // mushrooms at the foot of the trees
  for (let i = 0; i < 5; i++) {
    const x = rand() * cw
    const y = ch * (0.9 + rand() * 0.08)
    ctx.fillStyle = '#f2ead8'
    ctx.fillRect(x - 1.5, y - 6, 3, 7)
    ctx.fillStyle = ['#d9483b', '#e0a040', '#c96bd9'][i % 3]
    ctx.beginPath()
    ctx.arc(x, y - 6, 6, Math.PI, 0)
    ctx.fill()
  }
  for (let i = 0; i < 26; i++) {
    const x = rand() * cw
    const y = ch * (0.3 + rand() * 0.6)
    ctx.fillStyle = '#e8ff9a'
    ctx.fillRect(x, y, 3, 3)
    const halo = gl.createRadialGradient(x, y, 0, x, y, 9)
    halo.addColorStop(0, 'rgba(255,255,255,0.9)')
    halo.addColorStop(1, 'rgba(255,255,255,0)')
    gl.fillStyle = halo
    gl.fillRect(x - 9, y - 9, 18, 18)
  }
}

function huts({ ctx, gl, cw, ch, palette, variant, rand }: WallArgs) {
  const n = 3
  const hw = cw / n
  for (let i = 0; i < n; i++) {
    const x0 = i * hw + hw * 0.08
    const w = hw * 0.84
    const top = ch * (0.36 + rand() * 0.06)
    const colour = pick(palette, i, variant)
    // striped boards
    for (let s = 0; s < 6; s++) {
      ctx.fillStyle = s % 2 ? colour : '#fbf6ec'
      ctx.fillRect(x0 + (w * s) / 6, top, w / 6 + 1, ch - top)
    }
    // pitched roof
    ctx.fillStyle = '#6b4a3a'
    ctx.beginPath()
    ctx.moveTo(x0 - 4, top)
    ctx.lineTo(x0 + w / 2, top - ch * 0.1)
    ctx.lineTo(x0 + w + 4, top)
    ctx.fill()
    // a little window, warm in the evening light
    const wx = x0 + w * 0.35
    const wy = top + ch * 0.1
    ctx.fillStyle = '#ffd59a'
    ctx.fillRect(wx, wy, w * 0.3, ch * 0.08)
    gl.fillStyle = '#d9c09a'
    gl.fillRect(wx, wy, w * 0.3, ch * 0.08)
  }
  // sea between the huts and the sky
  const sea = ctx.createLinearGradient(0, ch * 0.2, 0, ch * 0.4)
  sea.addColorStop(0, '#4f8fb3')
  sea.addColorStop(1, '#7fc0d6')
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = sea
  ctx.fillRect(0, ch * 0.22, cw, ch)
  ctx.globalCompositeOperation = 'source-over'
}

function stone({ ctx, gl, cw, ch, palette, theme, variant, rand }: WallArgs) {
  const top = ch * 0.1
  const bh = ch * 0.06
  for (let y = top, row = 0; y < ch; y += bh, row++) {
    const bw = cw * 0.16
    for (let x = row % 2 ? -bw / 2 : 0; x < cw; x += bw) {
      ctx.fillStyle = pick(palette, Math.floor(rand() * 3), variant)
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2)
    }
  }
  // battlements along the top
  ctx.fillStyle = pick(palette, 0, variant)
  for (let x = 0; x < cw; x += cw * 0.12) ctx.fillRect(x, top - ch * 0.04, cw * 0.07, ch * 0.05)
  // arched windows and torches
  for (let i = 0; i < 2; i++) {
    const x = cw * (0.28 + i * 0.45)
    ctx.fillStyle = '#1a1424'
    ctx.beginPath()
    ctx.moveTo(x - 10, ch * 0.5)
    ctx.lineTo(x - 10, ch * 0.36)
    ctx.arc(x, ch * 0.36, 10, Math.PI, 0)
    ctx.lineTo(x + 10, ch * 0.5)
    ctx.fill()
    const tx = x + cw * 0.16
    const ty = ch * 0.6
    ctx.fillStyle = '#3a2a1e'
    ctx.fillRect(tx - 2, ty, 4, 16)
    ctx.fillStyle = theme.glow
    ctx.beginPath()
    ctx.ellipse(tx, ty - 4, 5, 9, 0, 0, Math.PI * 2)
    ctx.fill()
    const halo = gl.createRadialGradient(tx, ty - 4, 0, tx, ty - 4, 40)
    halo.addColorStop(0, 'rgba(255,255,255,1)')
    halo.addColorStop(1, 'rgba(255,255,255,0)')
    gl.fillStyle = halo
    gl.fillRect(tx - 40, ty - 44, 80, 80)
  }
}

function neon({ ctx, gl, cw, ch, palette, variant, rand }: WallArgs) {
  ctx.fillStyle = '#1b1d2b'
  ctx.fillRect(0, ch * 0.06, cw, ch)
  // dark windows, a few lit
  for (let y = ch * 0.12; y < ch * 0.7; y += ch * 0.09) {
    for (let x = cw * 0.06; x < cw; x += cw * 0.14) {
      const lit = rand() < 0.3
      ctx.fillStyle = lit ? '#ffe2a8' : '#2a2e44'
      ctx.fillRect(x, y, cw * 0.07, ch * 0.05)
      if (lit) {
        gl.fillStyle = '#806a50'
        gl.fillRect(x, y, cw * 0.07, ch * 0.05)
      }
    }
  }
  // neon signs
  for (let i = 0; i < 3; i++) {
    const colour = pick(palette, i, variant)
    const x = cw * (0.08 + i * 0.32 + rand() * 0.05)
    const y = ch * (0.3 + rand() * 0.35)
    const w = cw * 0.18
    const h = ch * 0.05
    ctx.strokeStyle = colour
    ctx.lineWidth = 4
    ctx.strokeRect(x, y, w, h)
    ctx.fillStyle = colour
    ctx.fillRect(x + 6, y + h / 2 - 2, w - 12, 4)
    gl.strokeStyle = '#ffffff'
    gl.lineWidth = 8
    gl.strokeRect(x, y, w, h)
    gl.fillStyle = '#ffffff'
    gl.fillRect(x + 6, y + h / 2 - 3, w - 12, 6)
  }
}

function shelves({ ctx, gl, cw, ch, palette, variant, rand }: WallArgs) {
  ctx.fillStyle = '#3b2518'
  ctx.fillRect(0, 0, cw, ch)
  const rows = 6
  const rh = ch / rows
  for (let r = 0; r < rows; r++) {
    const y = r * rh
    ctx.fillStyle = '#5a3a24'
    ctx.fillRect(0, y + rh - 6, cw, 6)
    for (let x = 4; x < cw - 6; ) {
      const bw = 6 + rand() * 9
      const bh = rh * (0.55 + rand() * 0.35)
      ctx.fillStyle = pick(palette, Math.floor(rand() * palette.length), variant)
      ctx.fillRect(x, y + rh - 6 - bh, bw, bh)
      ctx.fillStyle = 'rgba(255,230,170,0.5)'
      ctx.fillRect(x + 1, y + rh - 6 - bh * 0.7, bw - 2, 2)
      x += bw + 1
    }
  }
  // warm reading-lamp light falling on the shelves
  const pool = gl.createRadialGradient(cw * 0.5, ch * 0.35, 0, cw * 0.5, ch * 0.35, cw * 0.7)
  pool.addColorStop(0, 'rgba(255,255,255,0.45)')
  pool.addColorStop(1, 'rgba(255,255,255,0)')
  gl.fillStyle = pool
  gl.fillRect(0, 0, cw, ch)
}

const WALLS = { houses, trees, huts, stone, neon, shelves }

function paintWall(theme: NookTheme, side: 0 | 1, variant: number): Lit {
  const wallLen = D - SHELL
  const c = makeCanvas(wallLen, IH)
  const g = makeCanvas(wallLen, IH)
  const ctx = c.getContext('2d')!
  const gl = g.getContext('2d')!
  const cw = c.width
  const ch = c.height
  gl.fillStyle = '#000'
  gl.fillRect(0, 0, cw, ch)
  // the left wall's texture runs from the opening to the back, the right wall's the other way
  const frontFirst = side === 0
  WALLS[theme.walls]({
    ctx,
    gl,
    cw,
    ch,
    frontFirst,
    palette: theme.palettes[side],
    theme,
    variant,
    rand: rng(variant * 31 + side + 1),
  })
  // darker towards the back
  const shade = ctx.createLinearGradient(0, 0, cw, 0)
  shade.addColorStop(frontFirst ? 0 : 1, 'rgba(0,0,10,0)')
  shade.addColorStop(frontFirst ? 1 : 0, 'rgba(0,0,10,0.35)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, cw, ch)
  // the sky above the walls
  ctx.globalCompositeOperation = 'destination-over'
  const [top, bottom] = SKY_COLOURS[theme.sky]
  const sky = ctx.createLinearGradient(0, 0, 0, ch * 0.3)
  sky.addColorStop(0, top)
  sky.addColorStop(1, bottom)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, cw, ch)
  ctx.globalCompositeOperation = 'source-over'
  return { map: toTexture(c), glow: toTexture(g) }
}

// ---------------------------------------------------------------------------
// sky at the back
// ---------------------------------------------------------------------------

const SKY_COLOURS: Record<NookTheme['sky'], [string, string]> = {
  night: ['#141a3a', '#2b2f62'],
  sunset: ['#ff9e7a', '#ffd3a0'],
  day: ['#8fc8f0', '#cfe9fb'],
  dusk: ['#2b2350', '#7a4a6e'],
  space: ['#07061a', '#1d1240'],
  aurora: ['#0b1a2e', '#163a4a'],
  rain: ['#1a1d2a', '#2c3042'],
}

function paintSky(theme: NookTheme, variant: number) {
  const c = makeCanvas(IW, IH)
  const ctx = c.getContext('2d')!
  const cw = c.width
  const ch = c.height
  const rand = rng(variant * 7 + 3)
  const grad = ctx.createLinearGradient(0, 0, 0, ch)
  const stops: Record<NookTheme['sky'], string[]> = {
    night: ['#0f1433', '#2e3170', '#7a5a8c', '#d9927a'],
    sunset: ['#5a3f8c', '#e0708a', '#ffb070', '#ffe0a0'],
    day: ['#5fa8e0', '#8fc8f0', '#cfe9fb', '#f2f8ff'],
    dusk: ['#1d1840', '#4a2f6b', '#a8587a', '#f0a070'],
    space: ['#05040f', '#120a2e', '#2a1550', '#3d1f6b'],
    aurora: ['#06101f', '#0b2436', '#123a4a', '#1f4f5a'],
    rain: ['#14161f', '#22263a', '#33384f', '#4a4f66'],
  }
  stops[theme.sky].forEach((s, i, a) => grad.addColorStop(i / (a.length - 1), s))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, cw, ch)

  const stars = (count: number, top: number) => {
    for (let i = 0; i < count; i++) {
      ctx.fillStyle = `rgba(255,255,240,${0.4 + rand() * 0.6})`
      ctx.fillRect(rand() * cw, rand() * ch * top, 1.5, 1.5)
    }
  }
  const disc = (x: number, y: number, r: number, colour: string, haloColour: string) => {
    const halo = ctx.createRadialGradient(x, y, 2, x, y, r * 4)
    halo.addColorStop(0, haloColour)
    halo.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = halo
    ctx.fillRect(0, 0, cw, ch)
    ctx.fillStyle = colour
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const mx = cw * (0.3 + rand() * 0.45)
  switch (theme.sky) {
    case 'night':
      stars(40, 0.55)
      disc(mx, ch * 0.2, cw * 0.075, '#fff6d8', 'rgba(255,245,210,0.55)')
      break
    case 'dusk':
      stars(20, 0.4)
      disc(mx, ch * 0.22, cw * 0.06, '#fff0d0', 'rgba(255,220,200,0.4)')
      break
    case 'sunset':
      disc(mx, ch * 0.62, cw * 0.14, '#fff1b0', 'rgba(255,200,120,0.6)')
      break
    case 'day':
      disc(cw * 0.75, ch * 0.16, cw * 0.08, '#fff8c0', 'rgba(255,250,200,0.6)')
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        const x = rand() * cw
        const y = ch * (0.1 + rand() * 0.3)
        for (let k = 0; k < 4; k++) {
          ctx.beginPath()
          ctx.arc(x + k * 9, y + (k % 2) * 3, 9, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    case 'space':
      stars(120, 1)
      disc(cw * 0.3, ch * 0.28, cw * 0.16, ['#c96b4a', '#6b8ac9', '#c9b16b'][variant % 3], 'rgba(180,140,255,0.25)')
      ctx.strokeStyle = 'rgba(240,220,180,0.8)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(cw * 0.3, ch * 0.28, cw * 0.28, cw * 0.06, -0.3, 0, Math.PI * 2)
      ctx.stroke()
      disc(cw * 0.78, ch * 0.12, cw * 0.04, '#e8e8f8', 'rgba(200,200,255,0.2)')
      break
    case 'aurora': {
      stars(60, 0.6)
      for (let b = 0; b < 3; b++) {
        const band = ctx.createLinearGradient(0, 0, 0, ch * 0.6)
        band.addColorStop(0, 'rgba(120,255,180,0)')
        band.addColorStop(0.5, b === 1 ? 'rgba(180,120,255,0.45)' : 'rgba(120,255,180,0.5)')
        band.addColorStop(1, 'rgba(120,255,180,0)')
        ctx.fillStyle = band
        ctx.beginPath()
        ctx.moveTo(0, ch * (0.15 + b * 0.08))
        for (let x = 0; x <= cw; x += 8) ctx.lineTo(x, ch * (0.15 + b * 0.08) + Math.sin(x / 18 + b + variant) * 14)
        ctx.lineTo(cw, ch * (0.45 + b * 0.05))
        ctx.lineTo(0, ch * (0.45 + b * 0.05))
        ctx.fill()
      }
      break
    }
    case 'rain':
      ctx.strokeStyle = 'rgba(200,210,255,0.35)'
      ctx.lineWidth = 1
      for (let i = 0; i < 90; i++) {
        const x = rand() * cw
        const y = rand() * ch
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - 4, y + 14)
        ctx.stroke()
      }
      break
  }
  // the skyline at the end of the scene
  const skyline: Record<NookTheme['walls'], string> = {
    houses: '#1b1838',
    neon: '#10121c',
    stone: '#1b1730',
    trees: '#102016',
    huts: '#3f6f8f',
    shelves: '#2a1a12',
  }
  ctx.fillStyle = theme.sky === 'day' ? '#7da0b8' : theme.sky === 'sunset' ? '#5a4a7a' : skyline[theme.walls]
  ctx.beginPath()
  ctx.moveTo(0, ch)
  let x = 0
  while (x < cw) {
    const w = cw * (0.12 + rand() * 0.14)
    const top = ch * (0.62 + rand() * 0.12)
    if (theme.walls === 'trees') {
      ctx.lineTo(x + w / 2, top - ch * 0.05)
      ctx.lineTo(x + w, top + ch * 0.04)
    } else if (theme.walls === 'huts') {
      // the sea line
      ctx.lineTo(x + w, ch * 0.7)
    } else {
      ctx.lineTo(x, top + ch * 0.03)
      ctx.lineTo(x + w / 2, top)
      ctx.lineTo(x + w, top + ch * 0.03)
    }
    x += w
  }
  ctx.lineTo(cw, ch)
  ctx.fill()
  if (theme.sky !== 'day' && theme.walls !== 'huts' && theme.walls !== 'trees') {
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = theme.walls === 'neon' ? ['#ff4fa3', '#45e0ff'][i % 2] : '#ffcf7a'
      ctx.fillRect(rand() * cw, ch * (0.74 + rand() * 0.2), 2, 3)
    }
  }
  return toTexture(c)
}

// ---------------------------------------------------------------------------
// ground
// ---------------------------------------------------------------------------

function paintGround(theme: NookTheme, variant: number): Lit {
  const c = makeCanvas(IW, D - SHELL)
  const g = makeCanvas(IW, D - SHELL)
  const ctx = c.getContext('2d')!
  const gl = g.getContext('2d')!
  const cw = c.width
  const ch = c.height
  const rand = rng(variant * 13 + 5)
  gl.fillStyle = '#000'
  gl.fillRect(0, 0, cw, ch)
  switch (theme.ground) {
    case 'cobbles': {
      ctx.fillStyle = '#2b2724'
      ctx.fillRect(0, 0, cw, ch)
      const s = 13
      for (let y = 0; y < ch + s; y += s * 0.8) {
        const off = (Math.round(y / (s * 0.8)) % 2) * s * 0.5
        for (let x = -s; x < cw + s; x += s) {
          const v = 70 + rand() * 40
          ctx.fillStyle = `rgb(${v + 8}, ${v + 2}, ${v - 6})`
          ctx.beginPath()
          ctx.ellipse(x + off, y, s * 0.42, s * 0.32, rand() * 0.4, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      break
    }
    case 'grass':
      ctx.fillStyle = '#3f6b32'
      ctx.fillRect(0, 0, cw, ch)
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = rand() < 0.5 ? '#5a8a3f' : '#2f5a2a'
        ctx.fillRect(rand() * cw, rand() * ch, 1.5, 4)
      }
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = ['#f2f2f2', '#f2d24a', '#e26d8a'][i % 3]
        ctx.beginPath()
        ctx.arc(rand() * cw, rand() * ch, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    case 'sand':
      ctx.fillStyle = theme.id === 'space' ? '#6b4a7a' : '#e6cf9a'
      ctx.fillRect(0, 0, cw, ch)
      for (let i = 0; i < 700; i++) {
        ctx.fillStyle = `rgba(${theme.id === 'space' ? '40,20,60' : '120,90,40'},${rand() * 0.25})`
        ctx.fillRect(rand() * cw, rand() * ch, 2, 2)
      }
      break
    case 'snow':
      ctx.fillStyle = '#e8eef8'
      ctx.fillRect(0, 0, cw, ch)
      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `rgba(150,170,210,${rand() * 0.3})`
        ctx.fillRect(rand() * cw, rand() * ch, 3, 2)
      }
      break
    case 'wet': {
      ctx.fillStyle = '#16171f'
      ctx.fillRect(0, 0, cw, ch)
      // puddles reflecting the neon
      for (let i = 0; i < 6; i++) {
        const colour = pick(theme.palettes[i % 2], i, variant)
        const x = rand() * cw
        const y = rand() * ch
        ctx.fillStyle = colour
        ctx.globalAlpha = 0.35
        ctx.beginPath()
        ctx.ellipse(x, y, 14 + rand() * 18, 5 + rand() * 6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        gl.fillStyle = 'rgba(255,255,255,0.5)'
        gl.beginPath()
        gl.ellipse(x, y, 14, 5, 0, 0, Math.PI * 2)
        gl.fill()
      }
      break
    }
    case 'boards':
      for (let x = 0; x < cw; x += 22) {
        const v = 90 + rand() * 30
        ctx.fillStyle = `rgb(${v + 30}, ${v}, ${v - 30})`
        ctx.fillRect(x, 0, 21, ch)
      }
      // a rug in the middle
      ctx.fillStyle = pick(theme.palettes[0], 0, variant)
      ctx.fillRect(cw * 0.2, ch * 0.3, cw * 0.6, ch * 0.45)
      ctx.strokeStyle = '#e8c56a'
      ctx.lineWidth = 3
      ctx.strokeRect(cw * 0.24, ch * 0.34, cw * 0.52, ch * 0.37)
      break
  }
  // a warm pool of light where the lamp and windows shine
  if (theme.sky !== 'day') {
    const pool = gl.createRadialGradient(cw * 0.25, ch * 0.6, 4, cw * 0.4, ch * 0.55, cw * 0.9)
    pool.addColorStop(0, 'rgba(255,220,160,0.55)')
    pool.addColorStop(1, 'rgba(255,220,160,0)')
    gl.fillStyle = pool
    gl.fillRect(0, 0, cw, ch)
  }
  return { map: toTexture(c), glow: toTexture(g) }
}

// ---------------------------------------------------------------------------

const cache = new Map<string, SceneTextures>()

/** The painted scene for a theme and variant (painted once, then shared). */
export function sceneTextures(id: NookThemeId, variant: number): SceneTextures {
  const key = `${id}:${variant}`
  let t = cache.get(key)
  if (!t) {
    const theme = NOOK_THEMES[id]
    t = {
      leftWall: paintWall(theme, 0, variant),
      rightWall: paintWall(theme, 1, variant),
      sky: paintSky(theme, variant),
      ground: paintGround(theme, variant),
    }
    cache.set(key, t)
  }
  return t
}
