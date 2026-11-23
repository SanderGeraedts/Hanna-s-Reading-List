import * as THREE from 'three'
import type { Tier } from '#/lib/creatures/species'

/**
 * The egg (T-0029 §3a: a sphere scaled [1, 1.28, 1] with six flat spots), in
 * the colours of its tier (T-0030 Design §2). Built in plain three.js, so the
 * den, the dashboard block and the still-picture script all use the same egg.
 */

export interface EggLook {
  shell: string
  spots: string
  /** the legendary egg's shell is satin: a little shine */
  satin?: boolean
}

export const EGG_LOOK: Record<Tier, EggLook> = {
  common: { shell: '#f3e9d8', spots: '#d9a85b' },
  uncommon: { shell: '#a9c4a0', spots: '#f3e9d8' },
  rare: { shell: '#8fb3d9', spots: '#f3e9d8' },
  'very rare': { shell: '#b39ad9', spots: '#f4d68c' },
  epic: { shell: '#e39aa8', spots: '#f4d68c' },
  legendary: { shell: '#d9a85b', spots: '#fbf6ee', satin: true },
}

/** 0.55 model units tall. */
export const EGG_STRETCH = 1.28
export const EGG_R = 0.55 / 2 / EGG_STRETCH

const SPOTS: Array<[number, number]> = [
  [0.3, 0.35],
  [1.4, 0.55],
  [2.5, 0.3],
  [3.6, 0.6],
  [4.7, 0.4],
  [5.7, 0.7],
]

/**
 * The six spots lie flat on the upper half. They live inside the egg's [1, 1.28, 1] group, so each
 * first undoes that scale at its point and is then turned to the stretched shell's real normal (a
 * non-uniform parent scale would otherwise skew the flattened discs into slits).
 */
const SPOT_PLACES = SPOTS.map(([a, h]) => {
  const phi = (1 - h) * (Math.PI / 2)
  const p = new THREE.Vector3(Math.sin(phi) * Math.cos(a), Math.cos(phi), Math.sin(phi) * Math.sin(a))
  const n = new THREE.Vector3(p.x, p.y / EGG_STRETCH, p.z).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
  return { position: p.multiplyScalar(EGG_R * 0.985), quaternion: q }
})

function half(top: boolean, look: EggLook, low: boolean): THREE.Group {
  const seg = low ? 16 : 24
  const g = new THREE.Group()
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(EGG_R, seg, seg / 2, 0, Math.PI * 2, top ? 0 : Math.PI / 2, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: look.shell,
      roughness: look.satin ? 0.45 : 1,
      metalness: look.satin ? 0.25 : 0,
      side: THREE.DoubleSide,
    }),
  )
  shell.castShadow = !low
  g.add(shell)
  if (top) {
    const spotGeo = new THREE.SphereGeometry(0.032, 10, 6)
    const spotMat = new THREE.MeshStandardMaterial({ color: look.spots, roughness: 0.7 })
    for (const s of SPOT_PLACES) {
      const holder = new THREE.Group()
      holder.position.copy(s.position)
      holder.scale.set(1, 1 / EGG_STRETCH, 1)
      const m = new THREE.Mesh(spotGeo, spotMat)
      m.quaternion.copy(s.quaternion)
      m.scale.set(1, 1, 0.3)
      holder.add(m)
      g.add(holder)
    }
  }
  return g
}

export interface EggParts {
  /** stands on y = 0 */
  root: THREE.Group
  top: THREE.Group
  bottom: THREE.Group
}

/** An egg of a tier, standing on y = 0, in two halves (so it can crack). */
export function makeEgg(tier: Tier, low = false): EggParts {
  const look = EGG_LOOK[tier]
  const root = new THREE.Group()
  const stretched = new THREE.Group()
  stretched.scale.set(1, EGG_STRETCH, 1)
  stretched.position.set(0, EGG_R * EGG_STRETCH, 0)
  const top = half(true, look, low)
  const bottom = half(false, look, low)
  stretched.add(top, bottom)
  root.add(stretched)
  return { root, top, bottom }
}

/** A soft four-point star (the shiny sparkle, T-0030 Design §4) as a texture, drawn once. */
let starTexture: THREE.Texture | null = null
export function sparkleTexture(): THREE.Texture {
  if (starTexture) return starTexture
  const c = document.createElement('canvas')
  c.width = c.height = 64
  drawStar(c.getContext('2d')!, 32, 32, 30, '#f4d68c', 1)
  starTexture = new THREE.CanvasTexture(c)
  starTexture.colorSpace = THREE.SRGBColorSpace
  return starTexture
}

/** A soft round glow (the reveal's glow and the legendary egg's halo) as a texture, drawn once. */
let glowTexture: THREE.Texture | null = null
export function glowTex(): THREE.Texture {
  if (glowTexture) return glowTexture
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(244,214,140,0.85)')
  grad.addColorStop(0.45, 'rgba(244,214,140,0.35)')
  grad.addColorStop(1, 'rgba(244,214,140,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  glowTexture = new THREE.CanvasTexture(c)
  glowTexture.colorSpace = THREE.SRGBColorSpace
  return glowTexture
}

/** A four-point star with soft points, centred at x, y. */
export function drawStar(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  g.save()
  g.globalAlpha = alpha
  g.fillStyle = color
  g.beginPath()
  const inner = r * 0.22
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2
    const rr = i % 2 === 0 ? r : inner
    const px = x + Math.cos(a) * rr
    const py = y + Math.sin(a) * rr
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.closePath()
  g.shadowColor = color
  g.shadowBlur = r * 0.4
  g.fill()
  g.restore()
}

/** Where the 8 sparkle stars sit around a creature 1 unit tall: a loose ring at head and shoulder height. */
export const SPARKLE_SPOTS: ReadonlyArray<{ angle: number; y: number; size: number }> = [
  { angle: 0.2, y: 0.78, size: 0.09 },
  { angle: 1.0, y: 0.55, size: 0.07 },
  { angle: 1.75, y: 0.9, size: 0.06 },
  { angle: 2.5, y: 0.62, size: 0.08 },
  { angle: 3.3, y: 0.82, size: 0.07 },
  { angle: 4.05, y: 0.5, size: 0.06 },
  { angle: 4.8, y: 0.72, size: 0.09 },
  { angle: 5.6, y: 0.95, size: 0.06 },
]
