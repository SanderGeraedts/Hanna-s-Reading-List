import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { DenSlot, HabitatId, OutfitSlot, RoomDecorId } from '#/lib/creatures/shop'
import type { Sky, Weather } from '#/lib/creatures/weather'
import { sharedCreatureMaterials } from './model'
import type { CreatureQuality } from './model'
import { glowTex } from './eggModel'

/**
 * Every shop item as a three.js model (T-0031 Design §2, §7–§10), built from
 * primitives like `Decorations.tsx`, by the normal agents (no Fable, D-0033
 * §14). Each model bakes its colours into vertex colours and merges into one
 * mesh per material, so an outfit is 1 draw call, a home item or toy 1–3, a
 * habitat 3. Built once per id and quality, then cloned (clones share the
 * geometry and the materials).
 *
 * The den, the dashboard block's still, the dev-only stills script and the
 * den's budget test all use these builders, so the test counts what is drawn.
 */

type V3 = [number, number, number]

// ---- painting: vertex colours, merged ------------------------------------------------------

/** Collects primitives with a colour each and merges them into one geometry. */
export class Paint {
  private parts: THREE.BufferGeometry[] = []
  private m = new THREE.Matrix4()
  private q = new THREE.Quaternion()
  private c = new THREE.Color()

  add(g: THREE.BufferGeometry, colour: string, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]): this {
    let geo = g
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name)
    geo.clearGroups()
    if (!geo.index) geo.setIndex([...Array(geo.attributes.position.count).keys()])
    this.q.setFromEuler(new THREE.Euler(...rot))
    this.m.compose(new THREE.Vector3(...pos), this.q, new THREE.Vector3(...scale))
    geo.applyMatrix4(this.m)
    if (this.m.determinant() < 0) geo = flip(geo)
    const n = geo.attributes.position.count
    const colours = new Float32Array(n * 3)
    this.c.set(colour)
    for (let i = 0; i < n; i++) this.c.toArray(colours, i * 3)
    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3))
    this.parts.push(geo)
    return this
  }

  get empty() {
    return this.parts.length === 0
  }

  mesh(material: THREE.Material, name: string, shadow = true): THREE.Mesh {
    const merged = mergeGeometries(this.parts, false)
    for (const p of this.parts) p.dispose()
    this.parts = []
    if (!merged) throw new Error(`could not merge ${name}`)
    const out = new THREE.Mesh(merged, material)
    out.name = name
    out.castShadow = shadow
    out.receiveShadow = shadow
    return out
  }
}

function flip(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const index = g.index!
  for (let i = 0; i < index.count; i += 3) {
    const b = index.getX(i + 1)
    index.setX(i + 1, index.getX(i + 2))
    index.setX(i + 2, b)
  }
  return g
}

// ---- materials: shared, never disposed ----------------------------------------------------

let mats: { wall: THREE.MeshBasicMaterial; glow: THREE.MeshStandardMaterial; bulbs: THREE.MeshStandardMaterial; weather: THREE.PointsMaterial; halo: THREE.SpriteMaterial } | null = null

/** The shop's own shared materials (the matte, satin and gloss ones are the creatures'). */
export function shopMaterials() {
  if (!mats) {
    mats = {
      // walls show their own colour, untouched by light and tone mapping (as T-0029's den walls)
      wall: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
      glow: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, emissive: '#ffcf7a', emissiveIntensity: 0.85 }),
      bulbs: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: '#ffd27a', emissiveIntensity: 1 }),
      weather: new THREE.PointsMaterial({ color: '#ffffff', size: 0.035, transparent: true, opacity: 0.85, depthWrite: false }),
      halo: new THREE.SpriteMaterial({ map: safeGlow(), color: '#ffd9a0', transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }),
    }
  }
  return mats
}

/** The soft glow texture; none where there is no 2D canvas (a unit test). */
function safeGlow(): THREE.Texture | null {
  try {
    return glowTex()
  } catch {
    return null
  }
}

const matte = () => sharedCreatureMaterials().matte
const satin = () => sharedCreatureMaterials().satin
const gloss = () => sharedCreatureMaterials().gloss

// ---- segment counts -----------------------------------------------------------------------

const hi = (q: CreatureQuality) => q === 'high'
const sph = (r: number, q: CreatureQuality, size: 'L' | 'M' | 'S' = 'M', partial?: { phiLen?: number; thetaLen?: number }) => {
  const [w, h] = { L: hi(q) ? [16, 10] : [10, 6], M: hi(q) ? [10, 7] : [7, 5], S: hi(q) ? [7, 5] : [5, 3] }[size]
  return new THREE.SphereGeometry(r, w, h, 0, partial?.phiLen ?? Math.PI * 2, 0, partial?.thetaLen ?? Math.PI)
}
const cyl = (rt: number, rb: number, h: number, q: CreatureQuality, open = false, n?: number) =>
  new THREE.CylinderGeometry(rt, rb, h, n ?? (hi(q) ? 14 : 8), 1, open)
const cone = (r: number, h: number, q: CreatureQuality, n?: number) => new THREE.ConeGeometry(r, h, n ?? (hi(q) ? 10 : 6), 1)
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
const tor = (r: number, tube: number, q: CreatureQuality, arc = Math.PI * 2, tubular?: number) =>
  new THREE.TorusGeometry(r, tube, hi(q) ? 6 : 3, tubular ?? (hi(q) ? 18 : 10), arc)

function starShape(outer: number, inner: number, points = 5): THREE.Shape {
  const s = new THREE.Shape()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer
    const a = Math.PI / 2 + (i * Math.PI) / points
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  s.closePath()
  return s
}

function heartShape(size: number): THREE.Shape {
  const s = new THREE.Shape()
  const k = size
  s.moveTo(0, -0.9 * k)
  s.bezierCurveTo(-0.3 * k, -0.55 * k, -1 * k, -0.2 * k, -1 * k, 0.25 * k)
  s.bezierCurveTo(-1 * k, 0.75 * k, -0.35 * k, 0.9 * k, 0, 0.45 * k)
  s.bezierCurveTo(0.35 * k, 0.9 * k, 1 * k, 0.75 * k, 1 * k, 0.25 * k)
  s.bezierCurveTo(1 * k, -0.2 * k, 0.3 * k, -0.55 * k, 0, -0.9 * k)
  return s
}

/** A flat frame: the shape with a smaller copy cut out, a little thick. */
function frame(outer: THREE.Shape, inner: THREE.Shape, depth: number, q: CreatureQuality): THREE.BufferGeometry {
  const o = outer.clone()
  o.holes.push(new THREE.Path(inner.getPoints(hi(q) ? 6 : 3).reverse()))
  return new THREE.ExtrudeGeometry(o, { depth, bevelEnabled: false, curveSegments: hi(q) ? 6 : 3 })
}

// ---- the palette (Design §2) --------------------------------------------------------------

const PLUM = '#6e4f8f'
const PLUM_DARK = '#57396f'
const GOLD = '#d9a85b'
const CREAM = '#f3e9d8'
const MIDNIGHT = '#1f2a4a'
const SAGE = '#a9c4a0'
const ROSE = '#e39aa8'
const WOOD = '#7a5236'
const WOOD_DARK = '#5c3d28'
const BOOKS = ['#6e4f8f', '#d9a85b', '#a9c4a0', '#e39aa8', '#4f6b8f', '#c46a4a', '#f3e9d8', '#8a5a3c']

// ---- outfits (Design §2, §7): made for an anchor of size 1, then scaled --------------------

/**
 * Outfits sit on the T-0027 anchors in the head or body part, so they move with
 * the head and scale with the stage. Each is built for an anchor of size 1:
 * - head (`hat`, on the skull, y up): about 1 wide at the brim;
 * - face (`face`, the face surface at eye height, facing +z): the two lenses 1 wide;
 * - neck (`neck`, the ring where head meets body, y up): a ring of radius 1;
 * - back (`back`, the middle of the back; every model turns it π, so its +z points out of the back):
 *   about 0.6 of the back's width.
 */
export const OUTFIT_ANCHOR: Record<OutfitSlot, string> = { head: 'hat', face: 'face', neck: 'neck', back: 'back' }

function outfitPaint(id: string, q: CreatureQuality): { p: Paint; material: THREE.Material } {
  const p = new Paint()
  let material: THREE.Material = matte()
  switch (id) {
    case 'big-bow': {
      // a rose bow tilted to one side, on the side of the head
      const t: V3 = [0, 0, 0.35]
      const at = (x: number, y: number): V3 => [0.12 + x * Math.cos(0.35) - y * Math.sin(0.35), 0.1 + x * Math.sin(0.35) + y * Math.cos(0.35), 0.05]
      p.add(sph(0.22, q, 'S'), ROSE, at(-0.24, 0), t, [1.25, 0.8, 0.5])
      p.add(sph(0.22, q, 'S'), ROSE, at(0.24, 0), t, [1.25, 0.8, 0.5])
      p.add(sph(0.11, q, 'S'), '#c97f8f', at(0, 0), t)
      break
    }
    case 'bobble-hat': {
      p.add(sph(0.5, q, 'M', { thetaLen: Math.PI / 2 }), PLUM, [0, -0.1, 0], [0, 0, 0], [1, 0.85, 1])
      p.add(tor(0.48, 0.1, q), PLUM_DARK, [0, -0.08, 0], [Math.PI / 2, 0, 0])
      p.add(sph(0.15, q, 'S'), GOLD, [0, 0.42, 0])
      break
    }
    case 'flower-crown': {
      p.add(tor(0.42, 0.05, q), SAGE, [0, 0, 0], [Math.PI / 2, 0, 0])
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.62 + Math.PI
        const x = Math.sin(a) * 0.42
        const z = -Math.cos(a) * 0.42
        p.add(sph(0.1, q, 'S'), i % 2 ? ROSE : CREAM, [x, 0.04, z], [0, 0, 0], [1, 0.7, 1])
        p.add(sph(0.04, q, 'S'), GOLD, [x * 1.08, 0.08, z * 1.08])
      }
      break
    }
    case 'little-crown': {
      material = satin()
      const band = new THREE.LatheGeometry(
        [new THREE.Vector2(0.33, -0.05), new THREE.Vector2(0.37, -0.05), new THREE.Vector2(0.37, 0.17), new THREE.Vector2(0.33, 0.17), new THREE.Vector2(0.33, -0.05)],
        hi(q) ? 16 : 10,
      )
      p.add(band, GOLD)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        p.add(cone(0.07, 0.17, q, 5), GOLD, [Math.sin(a) * 0.35, 0.25, Math.cos(a) * 0.35])
      }
      break
    }
    case 'reading-glasses': {
      for (const s of [-1, 1]) p.add(tor(0.2, 0.035, q), GOLD, [s * 0.26, 0, 0.16])
      p.add(cyl(0.025, 0.025, 0.14, q, false, 5), GOLD, [0, 0.04, 0.16], [0, 0, Math.PI / 2])
      for (const s of [-1, 1]) p.add(box(0.03, 0.03, 0.3), GOLD, [s * 0.46, 0.02, 0.02])
      material = gloss()
      break
    }
    case 'heart-glasses': {
      for (const s of [-1, 1]) {
        p.add(frame(heartShape(0.24), heartShape(0.17), 0.05, q), ROSE, [s * 0.26, 0, 0.13])
        p.add(new THREE.ShapeGeometry(heartShape(0.18), hi(q) ? 6 : 3), '#2b2433', [s * 0.26, 0, 0.15])
      }
      p.add(cyl(0.022, 0.022, 0.12, q, false, 5), ROSE, [0, 0.06, 0.16], [0, 0, Math.PI / 2])
      material = gloss()
      break
    }
    case 'star-glasses': {
      for (const s of [-1, 1]) p.add(frame(starShape(0.25, 0.12), starShape(0.17, 0.08), 0.05, q), GOLD, [s * 0.27, 0, 0.13])
      p.add(cyl(0.022, 0.022, 0.1, q, false, 5), GOLD, [0, 0.04, 0.16], [0, 0, Math.PI / 2])
      material = gloss()
      break
    }
    case 'bow-tie': {
      for (const s of [-1, 1]) p.add(cone(0.22, 0.38, q, 4), PLUM, [s * 0.2, -0.12, 1.02], [0, 0, (s * Math.PI) / 2], [1, 1, 0.45])
      p.add(sph(0.1, q, 'S'), PLUM_DARK, [0, -0.12, 1.05])
      break
    }
    case 'striped-scarf': {
      const n = 8
      for (let i = 0; i < n; i++) {
        const g = tor(1, 0.2, q, (Math.PI * 2) / n, hi(q) ? 4 : 2)
        p.add(g, i % 2 ? PLUM : CREAM, [0, -0.08, 0], [Math.PI / 2, 0, (i * Math.PI * 2) / n])
      }
      // one end hanging down at the front, a little to the side
      p.add(box(0.34, 0.36, 0.1), CREAM, [0.42, -0.42, 0.95], [0.12, 0, 0.12])
      p.add(box(0.34, 0.34, 0.1), PLUM, [0.46, -0.76, 0.99], [0.12, 0, 0.12])
      break
    }
    case 'bell-collar': {
      p.add(tor(1, 0.11, q, Math.PI * 2, hi(q) ? 20 : 12), ROSE, [0, -0.05, 0], [Math.PI / 2, 0, 0])
      p.add(sph(0.2, q, 'S'), GOLD, [0, -0.28, 1.04])
      break
    }
    case 'little-backpack': {
      p.add(box(0.55, 0.6, 0.3), SAGE, [0, -0.02, 0.12])
      p.add(box(0.57, 0.26, 0.32), CREAM, [0, 0.2, 0.13])
      p.add(box(0.3, 0.18, 0.08), '#93b08a', [0, -0.16, 0.29])
      for (const s of [-1, 1]) p.add(box(0.07, 0.05, 0.3), '#93b08a', [s * 0.19, 0.24, -0.08])
      break
    }
    case 'star-cape': {
      const len = Math.PI * 0.95
      // a curved sheet round the back (its axis inside the body), wider at the hem
      p.add(new THREE.CylinderGeometry(0.46, 0.7, 1.05, hi(q) ? 14 : 8, 1, true, -len / 2, len), MIDNIGHT, [0, -0.05, -0.4])
      p.add(new THREE.CylinderGeometry(0.47, 0.47, 0.08, hi(q) ? 14 : 8, 1, true, -len / 2, len), GOLD, [0, 0.47, -0.4])
      p.add(new THREE.ExtrudeGeometry(starShape(0.16, 0.07), { depth: 0.03, bevelEnabled: false }), GOLD, [0, -0.05, 0.2])
      break
    }
    default:
      throw new Error(`no outfit model for ${id}`)
  }
  return { p, material }
}

const outfitCache = new Map<string, THREE.Mesh>()

/** An outfit piece at anchor size 1 (cloned for each use; the clones share geometry and material). */
export function outfitModel(id: string, q: CreatureQuality): THREE.Mesh {
  const key = `${id}|${q}`
  let m = outfitCache.get(key)
  if (!m) {
    const { p, material } = outfitPaint(id, q)
    m = p.mesh(material, `outfit:${id}`, hi(q))
    outfitCache.set(key, m)
  }
  const c = m.clone()
  c.name = `outfit:${id}`
  return c
}

/**
 * The scale of a piece on an anchor of this size. A hat's anchor size is the free width between
 * the ears (T-0027 §5: 0.18 for the foxes up to 0.4 for the axolotl), so hats are kept between
 * 0.26 and 0.36 wide: none lost between big ears, none wider than the head.
 */
export function outfitScale(slot: OutfitSlot, size: number): number {
  if (slot === 'head') return Math.min(0.36, Math.max(0.26, size * 1.15))
  // the neck's size is the ring where head meets body; the fur there is fuller, so pieces sit a bit wider
  if (slot === 'neck') return size * 1.45
  return size
}

/**
 * Dresses a creature (a clone from `creatureFor`): takes off what it wore and puts each piece on
 * its anchor. Answers the pieces put on (for a small pop).
 */
export function dressCreature(root: THREE.Object3D, worn: Partial<Record<OutfitSlot, string>>, q: CreatureQuality): THREE.Mesh[] {
  const old: THREE.Object3D[] = []
  root.traverse((o) => {
    if (o.name.startsWith('outfit:')) old.push(o)
  })
  for (const o of old) o.removeFromParent()
  const out: THREE.Mesh[] = []
  for (const slot of Object.keys(worn) as OutfitSlot[]) {
    const id = worn[slot]
    if (!id) continue
    const a = root.getObjectByName(OUTFIT_ANCHOR[slot])
    if (!a) continue
    const m = outfitModel(id, q)
    m.scale.setScalar(outfitScale(slot, Number(a.userData.size) || 0.25))
    m.userData.slot = slot
    a.add(m)
    out.push(m)
  }
  return out
}

// ---- the den (Design §8): spots, home items, toys -----------------------------------------

/**
 * The six spots in den units, the cushion at 0, 0, 0, for the den of T-0029 seen ¾ from the front
 * right (with the camera pulled back 10 %). The den's budget test checks that every item fits in
 * view at 390 (300 px and 180 px canvases) and 1280.
 */
export const DEN_SPOTS: Record<DenSlot, V3> = {
  bed: [0, 0, 0],
  rug: [0, 0, 0.05],
  wall: [-1.7, 0, -1.58],
  left: [-1.5, 0, -0.75],
  right: [0.25, 0, -1.35],
  toy: [-0.62, 0, 0.4],
}
/** The food bowl, front right (nudged in from T-0029's spot so it stays in view on a phone). */
export const BOWL_SPOT: V3 = [0.66, 0, -0.36]
/** Where the wall items hang: the window's sill and the fairy lights' height. */
const WALL_Y = 0.9

export interface DenItemOptions {
  sky?: Sky
  weather?: Weather
  /** weather drifts and lights twinkle (a computer, no reduce motion) */
  moving?: boolean
}

/** A home item or toy at its spot's origin (the den adds the spot's position). */
export function buildDenItem(id: string, q: CreatureQuality, opts: DenItemOptions = {}): THREE.Group {
  const g = new THREE.Group()
  g.name = `den:${id}`
  const p = new Paint()
  const sh = hi(q)
  switch (id) {
    case 'cloud-cushion': {
      const puffs: Array<[number, number, number, number]> = [
        [0, 0.07, 0, 0.36],
        [0.3, 0.06, 0.12, 0.24],
        [-0.3, 0.06, 0.1, 0.25],
        [0.12, 0.06, -0.3, 0.24],
        [-0.16, 0.06, -0.28, 0.24],
        [0.05, 0.06, 0.32, 0.22],
      ]
      for (const [x, y, z, r] of puffs) p.add(sph(r, q, 'M'), '#f7f2ec', [x, y, z], [0, 0, 0], [1, 0.42, 1])
      g.add(p.mesh(matte(), 'mesh', sh))
      break
    }
    case 'basket-bed': {
      p.add(cyl(0.58, 0.5, 0.16, q, true), '#b07a45', [0, 0.08, 0])
      p.add(cyl(0.5, 0.5, 0.02, q), '#8f5f33', [0, 0.01, 0])
      p.add(tor(0.58, 0.04, q), '#c99055', [0, 0.16, 0], [Math.PI / 2, 0, 0])
      p.add(sph(0.48, q, 'M'), CREAM, [0, 0.06, 0], [0, 0, 0], [1, 0.16, 1])
      g.add(p.mesh(matte(), 'mesh', sh))
      break
    }
    case 'star-rug': {
      // flat stars, each a little higher: the midnight rug, a gold rim, a lighter middle
      p.add(new THREE.ExtrudeGeometry(starShape(0.98, 0.62), { depth: 0.008, bevelEnabled: false }), MIDNIGHT, [0, 0.004, 0], [-Math.PI / 2, 0, 0.3])
      p.add(new THREE.ExtrudeGeometry(starShape(0.88, 0.56), { depth: 0.003, bevelEnabled: false }), GOLD, [0, 0.012, 0], [-Math.PI / 2, 0, 0.3])
      p.add(new THREE.ExtrudeGeometry(starShape(0.8, 0.5), { depth: 0.003, bevelEnabled: false }), '#2a3866', [0, 0.015, 0], [-Math.PI / 2, 0, 0.3])
      g.add(p.mesh(matte(), 'mesh', false))
      g.children[0].receiveShadow = sh
      break
    }
    case 'fairy-lights': {
      // a gently drooping string across the wall with 9 small warm bulbs
      const pts: THREE.Vector3[] = []
      const span = 1.25
      for (let i = 0; i <= 12; i++) {
        const t = i / 12
        pts.push(new THREE.Vector3(-span / 2 + t * span, WALL_Y + 0.62 - Math.sin(t * Math.PI) * 0.16, 0.02))
      }
      const curve = new THREE.CatmullRomCurve3(pts)
      p.add(new THREE.TubeGeometry(curve, sh ? 24 : 12, 0.01, 3, false), '#4a3a2c')
      g.add(p.mesh(matte(), 'string', false))
      const b = new Paint()
      for (let i = 0; i < 9; i++) {
        const t = (i + 0.5) / 9
        const v = curve.getPoint(t)
        b.add(sph(0.026, q, 'S'), i % 3 === 0 ? '#ffe2a0' : i % 3 === 1 ? '#ffcf86' : '#ffd9b8', [v.x, v.y - 0.03, v.z + 0.01], [0, 0, 0], [1, 1.3, 1])
      }
      const bulbs = b.mesh(opts.moving ? shopMaterials().bulbs.clone() : shopMaterials().bulbs, 'bulbs', false)
      if (opts.moving) bulbs.userData.twinkle = true
      g.add(bulbs)
      break
    }
    case 'weather-window':
      return buildWindow(q, opts)
    case 'potted-plant': {
      p.add(cyl(0.13, 0.1, 0.2, q), '#c4703f', [0, 0.1, 0])
      p.add(cyl(0.14, 0.14, 0.03, q), '#b4643a', [0, 0.2, 0])
      p.add(cyl(0.12, 0.12, 0.01, q), '#4a3424', [0, 0.215, 0])
      const leaves: Array<[number, number, number, number]> = [
        [0, 0.42, 0, 0],
        [0.1, 0.36, 0.04, -0.5],
        [-0.1, 0.36, -0.02, 0.5],
        [0.03, 0.34, -0.1, 0.3],
        [-0.04, 0.33, 0.1, -0.3],
      ]
      for (const [x, y, z, r] of leaves) p.add(sph(0.09, q, 'S'), r > 0 ? '#5f8a4a' : '#7aa35f', [x, y, z], [r, 0, r], [0.7, 1.9, 0.5])
      g.add(p.mesh(matte(), 'mesh', sh))
      break
    }
    case 'mini-bookcase': {
      const W = 0.46
      const H = 0.74
      const D = 0.2
      p.add(box(W, 0.03, D), WOOD_DARK, [0, H, 0])
      p.add(box(W, 0.03, D), WOOD_DARK, [0, 0.015, 0])
      for (const s of [-1, 1]) p.add(box(0.03, H, D), WOOD_DARK, [(s * (W - 0.03)) / 2, H / 2, 0])
      p.add(box(W, H, 0.015), WOOD, [0, H / 2, -D / 2 + 0.008])
      for (const y of [0.25, 0.5]) p.add(box(W - 0.04, 0.02, D), WOOD_DARK, [0, y, 0])
      let k = 0
      for (const y0 of [0.03, 0.26, 0.51]) {
        let x = -W / 2 + 0.035
        while (x < W / 2 - 0.07) {
          const w = 0.03 + ((k * 7) % 3) * 0.008
          const h = 0.15 + ((k * 5) % 4) * 0.015
          p.add(box(w, h, 0.13), BOOKS[k % BOOKS.length], [x + w / 2, y0 + h / 2, 0.01])
          x += w + 0.004
          k++
        }
      }
      g.add(p.mesh(matte(), 'mesh', sh))
      break
    }
    case 'book-tower': {
      let y = 0
      for (let i = 0; i < 7; i++) {
        const h = 0.05 + (i % 3) * 0.012
        p.add(box(0.3 - (i % 2) * 0.03, h, 0.21 - (i % 3) * 0.015), BOOKS[(i * 3) % BOOKS.length], [0, y + h / 2, 0], [0, (i % 2 ? 0.2 : -0.12) + i * 0.05, 0])
        p.add(box(0.302 - (i % 2) * 0.03, h * 0.7, 0.18), CREAM, [0.004, y + h / 2, 0.022], [0, (i % 2 ? 0.2 : -0.12) + i * 0.05, 0])
        y += h
      }
      g.add(p.mesh(matte(), 'mesh', sh))
      break
    }
    case 'reading-lamp': {
      p.add(cyl(0.12, 0.14, 0.03, q), '#3b2e22', [0, 0.015, 0])
      p.add(cyl(0.012, 0.012, 0.72, q, false, 6), GOLD, [0, 0.37, 0])
      g.add(p.mesh(matte(), 'stand', sh))
      const s = new Paint()
      s.add(cyl(0.09, 0.17, 0.18, q, true), '#f3dfb8', [0, 0.78, 0])
      s.add(cyl(0.09, 0.09, 0.005, q), '#fff1cf', [0, 0.87, 0])
      g.add(s.mesh(shopMaterials().glow, 'shade', false))
      // a soft warm glow on the wall behind it (no real light on a phone, Design §8)
      const halo = new THREE.Sprite(shopMaterials().halo)
      halo.name = 'glow'
      halo.position.set(0.02, 0.8, -0.2)
      halo.scale.set(0.75, 0.75, 1)
      g.add(halo)
      break
    }
    case 'ball': {
      p.add(sph(0.11, q, 'M'), ROSE, [0, 0.11, 0])
      p.add(tor(0.111, 0.018, q), GOLD, [0, 0.11, 0], [0.4, 0.2, 0])
      p.add(tor(0.111, 0.018, q), CREAM, [0, 0.11, 0], [0.4, 0.2 + Math.PI / 2, 0])
      g.add(p.mesh(matte(), 'mesh', sh))
      break
    }
    case 'yarn': {
      p.add(sph(0.11, q, 'M'), PLUM, [0, 0.11, 0])
      for (let i = 0; i < 3; i++) p.add(tor(0.112, 0.008, q, Math.PI * 2, 12), '#8f6fb0', [0, 0.11, 0], [0.5 + i * 0.9, i * 0.7, 0])
      p.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.08, 0.04, 0.06), new THREE.Vector3(0.18, 0.01, 0.12), new THREE.Vector3(0.26, 0.01, 0.05)]), 6, 0.008, 3), '#8f6fb0')
      g.add(p.mesh(matte(), 'mesh', sh))
      break
    }
    case 'slide': {
      const top = 0.3
      // ladder at the back, a ramp down to the front
      for (const s of [-1, 1]) p.add(box(0.025, top + 0.02, 0.025), SAGE, [s * 0.1, (top + 0.02) / 2, -0.15])
      for (let i = 1; i <= 3; i++) p.add(box(0.2, 0.015, 0.02), CREAM, [0, (i * top) / 4, -0.15])
      p.add(box(0.22, 0.025, 0.06), SAGE, [0, top, -0.12])
      const ramp = Math.hypot(0.32, top)
      const tilt = Math.atan2(top, 0.32)
      p.add(box(0.18, 0.02, ramp), ROSE, [0, top / 2, 0.06], [tilt, 0, 0])
      for (const s of [-1, 1]) p.add(box(0.02, 0.045, ramp), GOLD, [s * 0.1, top / 2 + 0.02, 0.06], [tilt, 0, 0])
      g.add(p.mesh(matte(), 'mesh', sh))
      break
    }
    default:
      throw new Error(`no den model for ${id}`)
  }
  return g
}

/** The window: an arched wooden frame with a cross bar; the pane follows the sky and the weather (Design §8). */
export function buildWindow(q: CreatureQuality, opts: DenItemOptions = {}): THREE.Group {
  const sky = opts.sky ?? 'day'
  const weather = opts.weather ?? 'sun'
  const g = new THREE.Group()
  g.name = 'den:weather-window'
  const W = 0.5
  const H = 0.36
  const y0 = WALL_Y
  const R = W / 2
  const f = new Paint()
  f.add(box(W + 0.1, 0.05, 0.06), WOOD, [0, y0 - 0.025, 0.02])
  for (const s of [-1, 1]) f.add(box(0.04, H, 0.04), WOOD_DARK, [s * (R + 0.01), y0 + H / 2, 0.01])
  f.add(tor(R + 0.01, 0.022, q, Math.PI, hi(q) ? 14 : 8), WOOD_DARK, [0, y0 + H, 0.01])
  f.add(box(0.025, H + R, 0.03), WOOD_DARK, [0, y0 + (H + R) / 2, 0.015])
  f.add(box(W, 0.025, 0.03), WOOD_DARK, [0, y0 + H * 0.55, 0.015])
  g.add(f.mesh(matte(), 'frame', hi(q)))

  // the pane: one unlit mesh with the sky (a gradient at dawn and dusk), the sun or moon and stars
  const p = new Paint()
  const top = { day: '#9cc3e6', dawn: '#e8b49a', dusk: '#e8b49a', night: MIDNIGHT }[sky]
  const bottom = { day: '#b9d6ee', dawn: '#9a7aa8', dusk: '#7d5f93', night: '#24315a' }[sky]
  const rect = new THREE.PlaneGeometry(W, H, 1, 2)
  const arch = new THREE.CircleGeometry(R, hi(q) ? 14 : 8, 0, Math.PI)
  p.add(rect, top, [0, y0 + H / 2, 0])
  p.add(arch, top, [0, y0 + H, 0])
  const pane = p.mesh(shopMaterials().wall, 'pane', false)
  // the gradient: the sky's colour at the top, a softer one at the sill
  const pos = pane.geometry.attributes.position
  const col = pane.geometry.attributes.color
  const a = new THREE.Color(top)
  const b = new THREE.Color(bottom)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const k = Math.min(1, Math.max(0, (pos.getY(i) - y0) / (H + R)))
    c.copy(b).lerp(a, k)
    col.setXYZ(i, c.r, c.g, c.b)
  }
  col.needsUpdate = true
  g.add(pane)

  const extra = new Paint()
  if (sky === 'night') {
    extra.add(new THREE.CircleGeometry(0.06, 12), GOLD, [0.1, y0 + H + 0.1, 0.002])
    extra.add(new THREE.CircleGeometry(0.06, 12), MIDNIGHT, [0.13, y0 + H + 0.12, 0.003])
    for (const [x, y] of [
      [-0.13, y0 + H + 0.08],
      [-0.05, y0 + H * 0.7],
      [0.15, y0 + H * 0.45],
    ])
      extra.add(new THREE.CircleGeometry(0.012, 5), '#f4d68c', [x, y, 0.002])
  } else if (weather === 'sun' && sky === 'day') extra.add(new THREE.CircleGeometry(0.075, 14), '#fff0b8', [0.1, y0 + H + 0.06, 0.002])
  else if (weather === 'sun') extra.add(new THREE.CircleGeometry(0.07, 14), '#ffd59a', [0.12, y0 + H * 0.3, 0.002])
  if (!extra.empty) {
    // merged into the pane: still one draw call
    const merged = mergeGeometries([pane.geometry, extra.mesh(shopMaterials().wall, 'x', false).geometry], false)!
    pane.geometry.dispose()
    pane.geometry = merged
  }

  // rain or snow: one Points of 40 in front of the pane (falling on a computer, still on a phone)
  if (weather !== 'sun') {
    const n = 40
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      // a fixed scatter (no Math.random), so the still and the den show the same weather
      const u = ((i * 0.618034) % 1) - 0.5
      const v = (i * 0.381966 * 7) % 1
      arr.set([u * W * 0.92, y0 + 0.02 + v * (H + R * 0.8), 0.006], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    const mat = shopMaterials().weather.clone()
    if (weather === 'rain') {
      mat.color.set('#dbe9f5')
      mat.size = 0.02
      mat.opacity = 0.7
    } else mat.size = 0.03
    const pts = new THREE.Points(geo, mat)
    pts.name = 'weather'
    pts.userData = { moving: !!opts.moving, kind: weather, bottom: y0 + 0.02, top: y0 + H + R * 0.8, width: W * 0.92 }
    g.add(pts)
  }
  return g
}

// ---- habitats (Design §9): walls, floor and up to four props --------------------------------

export const HABITAT_IDS: readonly HabitatId[] = ['cosy', 'forest', 'beach', 'ice', 'castle-library']

const COSY_WALL = '#3a2c24'
const COSY_SIDE = '#362c2a'
const COSY_FLOOR = '#5a3f2c'

/** The background colour behind the den (the canvas clears to it): the back wall's. */
export const HABITAT_BACK: Record<HabitatId, string> = {
  cosy: COSY_WALL,
  forest: '#4f6b3f',
  beach: '#9cc9d9',
  ice: '#bcd6e6',
  'castle-library': '#6b6470',
}

/**
 * The den's walls and floor in a habitat (the Cosy den is T-0029's): a back wall at z −1.6, a side
 * wall at x −2.2, the floor, and the habitat's props, all matte. 3 draw calls for a habitat.
 */
export function buildRoom(habitat: HabitatId, q: CreatureQuality): THREE.Group {
  const g = new THREE.Group()
  g.name = `room:${habitat}`
  const sh = hi(q)
  const walls = new Paint()
  const floor = new Paint()
  const props = new Paint()
  const back = HABITAT_BACK[habitat]
  const side = { cosy: COSY_SIDE, forest: '#46603a', beach: '#93c1d2', ice: '#b2cddd', 'castle-library': '#625b67' }[habitat]
  const ground = { cosy: COSY_FLOOR, forest: '#55703f', beach: '#e3cfa1', ice: '#eef3f7', 'castle-library': '#5a4636' }[habitat]
  walls.add(new THREE.PlaneGeometry(12, 6), back, [0, 3, -1.6])
  walls.add(new THREE.PlaneGeometry(12, 6), side, [-2.2, 3, 0], [0, Math.PI / 2, 0])
  floor.add(new THREE.PlaneGeometry(12, 12), ground, [0, 0, 0], [-Math.PI / 2, 0, 0])
  // a skirting board where wall meets floor, so the corner reads
  const skirting = { cosy: '#2c211b', forest: '#3d5530', beach: '#c9b384', ice: '#d5e4ee', 'castle-library': '#4a434f' }[habitat]
  props.add(box(12, 0.08, 0.04), skirting, [0, 0.04, -1.58])

  switch (habitat) {
    case 'forest': {
      for (const [x, s] of [
        [-1.95, 1],
        [-0.55, 0.85],
        [0.9, 1.1],
      ] as const) {
        // rounded trunks against the wall, their leafy crowns where the den still shows them
        props.add(cyl(0.11 * s, 0.15 * s, 1.5, q), '#6b4a32', [x, 0.75, -1.5])
        props.add(sph(0.5 * s, q, 'M'), '#5f8a4a', [x, 1.55 + 0.1 * s, -1.45], [0, 0, 0], [1, 0.75, 0.4])
        props.add(sph(0.34 * s, q, 'S'), '#6f9a56', [x + 0.32 * s, 1.35, -1.4], [0, 0, 0], [1, 0.8, 0.4])
      }
      for (const [z, s] of [
        [-0.9, 1],
        [-0.35, 0.75],
      ] as const) {
        props.add(cyl(0.025 * s, 0.03 * s, 0.1 * s, q, false, 6), CREAM, [-2.05, 0.05 * s, z])
        props.add(sph(0.075 * s, q, 'S', { thetaLen: Math.PI / 2 }), '#e8dccb', [-2.05, 0.1 * s, z], [0, 0, 0], [1, 0.7, 1])
        for (const [dx, dz] of [
          [0.03, 0.02],
          [-0.02, 0.04],
          [0.01, -0.035],
        ])
          props.add(sph(0.014 * s, q, 'S'), ROSE, [-2.05 + dx * s, 0.145 * s, z + dz * s])
      }
      break
    }
    case 'beach': {
      // the sea, a band along the bottom of the back wall
      walls.add(new THREE.PlaneGeometry(12, 0.55), '#5e9bb5', [0, 0.275, -1.598])
      walls.add(new THREE.PlaneGeometry(12, 0.04), '#e8f3f7', [0, 0.55, -1.597])
      props.add(sph(0.08, q, 'S', { thetaLen: Math.PI / 2 }), '#f2c9b8', [-1.1, 0, 0.1], [0, 0, 0], [1, 0.6, 1.2])
      for (let i = 0; i < 4; i++) props.add(box(0.012, 0.05, 0.14), '#e6ad9a', [-1.1 + (i - 1.5) * 0.035, 0.03, 0.1], [0, (i - 1.5) * 0.25, 0])
      // a leaning palm at the right, behind the right corner
      props.add(cyl(0.035, 0.05, 1.3, q, false, 6), '#9a7450', [0.55, 0.62, -1.5], [0, 0, -0.22])
      for (let i = 0; i < 4; i++) props.add(sph(0.3, q, 'S'), '#5f8a4a', [0.72 + Math.cos(i * 1.6) * 0.25, 1.28 + Math.sin(i * 1.6) * 0.06, -1.45], [0, 0, i * 1.6 - 0.4], [1.3, 0.18, 0.4])
      break
    }
    case 'ice': {
      for (const [x, y, s] of [
        [-1.95, 1.05, 0.12],
        [-0.4, 1.3, 0.09],
        [0.55, 0.95, 0.11],
        [-1.0, 0.7, 0.07],
      ] as const)
        props.add(new THREE.OctahedronGeometry(s, 0), '#e7f3fb', [x, y, -1.56], [0, 0.4, 0.2], [0.7, 1.3, 0.3])
      // three icicles along the top of the wall (where the den shows it)
      props.add(box(4.4, 0.06, 0.08), '#e7f3fb', [-0.2, 1.62, -1.56])
      for (const [x, l] of [
        [-1.2, 0.3],
        [-0.15, 0.22],
        [0.5, 0.34],
      ] as const)
        props.add(cone(0.05, l, q, 6), '#f4fbff', [x, 1.6 - l / 2, -1.55], [Math.PI, 0, 0])
      break
    }
    case 'castle-library': {
      // a deep red carpet with a gold edge
      floor.add(new THREE.PlaneGeometry(3.4, 2.6), GOLD, [-0.2, 0.004, -0.15], [-Math.PI / 2, 0, 0])
      floor.add(new THREE.PlaneGeometry(3.25, 2.45), '#7a2e3a', [-0.2, 0.006, -0.15], [-Math.PI / 2, 0, 0])
      // two tall arched bookcases full of coloured books, either side of the wall spot
      for (const cx of [-0.85, 0.75]) {
        const W = 0.62
        const H = 1.55
        props.add(box(W + 0.08, H, 0.06), '#4a3426', [cx, H / 2, -1.57])
        props.add(cyl(W / 2 + 0.04, W / 2 + 0.04, 0.06, q, false, 10), '#4a3426', [cx, H, -1.57], [Math.PI / 2, 0, 0], [1, 1, 1])
        let k = cx > 0 ? 3 : 0
        for (let row = 0; row < 4; row++) {
          const y0 = 0.08 + row * 0.36
          props.add(box(W, 0.03, 0.14), '#5c4130', [cx, y0, -1.5])
          let x = cx - W / 2 + 0.02
          while (x < cx + W / 2 - 0.06) {
            const w = 0.04 + ((k * 5) % 3) * 0.01
            const h = 0.22 + ((k * 3) % 4) * 0.025
            props.add(box(w, h, 0.11), BOOKS[k % BOOKS.length], [x + w / 2, y0 + 0.015 + h / 2, -1.5])
            x += w + 0.005
            k++
          }
        }
      }
      break
    }
    default:
      break
  }

  g.add(walls.mesh(shopMaterials().wall, 'walls', false))
  const f = floor.mesh(matte(), 'floor', false)
  f.receiveShadow = sh
  g.add(f)
  g.add(props.mesh(matte(), 'props', sh))
  return g
}

/** T-0029's round floor cushion (gold) and rug (plum): the den's own bed and rug, back when put away. */
export function buildDefaultBed(q: CreatureQuality): THREE.Group {
  const g = new THREE.Group()
  g.name = 'den:cushion'
  const p = new Paint()
  p.add(sph(0.55, q, 'L'), GOLD, [0, 0.06, 0], [0, 0, 0], [1, 0.22, 1])
  g.add(p.mesh(matte(), 'mesh', hi(q)))
  return g
}
export function buildDefaultRug(q: CreatureQuality): THREE.Group {
  const g = new THREE.Group()
  g.name = 'den:rug'
  const p = new Paint()
  p.add(cyl(1.05, 1.05, 0.012, q, false, hi(q) ? 48 : 32), PLUM, [0, 0.006, 0])
  const m = p.mesh(matte(), 'mesh', false)
  m.receiveShadow = hi(q)
  g.add(m)
  return g
}

/** The wooden food bowl with one cookie per 5 🍪 up to 5 (none at 0 or below): 3 draw calls. */
export function buildBowl(cookies: number, q: CreatureQuality): THREE.Group {
  const g = new THREE.Group()
  g.name = 'den:bowl'
  g.position.set(...BOWL_SPOT)
  const n = Math.max(0, Math.min(5, Math.ceil(cookies / 5)))
  const sh = hi(q)
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.1, sh ? 24 : 16, 1, true), bowlMaterial())
  wall.position.y = 0.05
  wall.castShadow = sh
  wall.receiveShadow = sh
  g.add(wall)
  const p = new Paint()
  p.add(cyl(0.11, 0.11, 0.01, q, false, sh ? 24 : 16), WOOD, [0, 0.005, 0])
  const spots: Array<[number, number, number, number]> = [
    [-0.05, 0.1, 0.0, 0.2],
    [0.05, 0.1, 0.03, -0.3],
    [0.0, 0.1, -0.05, 0.5],
    [-0.01, 0.125, 0.0, -0.1],
    [0.03, 0.145, -0.01, 0.35],
  ]
  for (const [x, y, z, r] of spots.slice(0, n)) p.add(cyl(0.045, 0.045, 0.018, q, false, 12), '#c98a4b', [x, y - 0.02, z], [0.25, r, 0.2])
  g.add(p.mesh(matte(), 'mesh', sh))
  return g
}
let bowlMat: THREE.MeshStandardMaterial | null = null
const bowlMaterial = () => (bowlMat ??= new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.8, side: THREE.DoubleSide }))

// ---- food (only for the shop's pictures) ---------------------------------------------------

export function buildFood(id: string, q: CreatureQuality): THREE.Group {
  const g = new THREE.Group()
  const p = new Paint()
  switch (id) {
    case 'berry-snack': {
      p.add(cyl(0.2, 0.13, 0.1, q), CREAM, [0, 0.05, 0])
      for (const [x, z, c] of [
        [0, 0, '#b2304a'],
        [0.08, 0.05, '#4b3a8f'],
        [-0.08, 0.04, '#b2304a'],
        [0.04, -0.08, '#4b3a8f'],
        [-0.06, -0.06, '#c4405a'],
        [0.1, -0.03, '#c4405a'],
      ] as const)
        p.add(sph(0.05, q, 'S'), c, [x, 0.12, z])
      p.add(sph(0.04, q, 'S'), '#7aa35f', [0.02, 0.17, 0.02], [0, 0, 0.6], [1.4, 0.4, 0.8])
      break
    }
    case 'honey-cake': {
      p.add(cyl(0.2, 0.2, 0.12, q), '#e7b86a', [0, 0.06, 0])
      p.add(cyl(0.205, 0.205, 0.03, q), CREAM, [0, 0.13, 0])
      p.add(cyl(0.2, 0.2, 0.1, q), '#e7b86a', [0, 0.2, 0])
      p.add(cyl(0.21, 0.21, 0.025, q), '#e0a33a', [0, 0.26, 0])
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        p.add(sph(0.035, q, 'S'), '#e0a33a', [Math.sin(a) * 0.2, 0.22, Math.cos(a) * 0.2], [0, 0, 0], [1, 1.8, 1])
      }
      p.add(sph(0.04, q, 'S'), '#b2304a', [0, 0.3, 0])
      break
    }
    case 'picnic-feast': {
      p.add(box(0.5, 0.012, 0.4), '#e39aa8', [0, 0.006, 0])
      for (let i = -2; i <= 2; i++) p.add(box(0.02, 0.014, 0.4), CREAM, [i * 0.1, 0.008, 0])
      p.add(cyl(0.12, 0.1, 0.12, q), '#b07a45', [-0.1, 0.07, -0.05])
      p.add(tor(0.11, 0.012, q, Math.PI), '#8f5f33', [-0.1, 0.13, -0.05])
      p.add(sph(0.05, q, 'S'), '#c4405a', [0.1, 0.05, 0.08])
      p.add(cyl(0.07, 0.07, 0.05, q), '#e7b86a', [0.12, 0.04, -0.08])
      p.add(cyl(0.03, 0.03, 0.12, q, false, 6), '#f3e9d8', [0.18, 0.07, 0.1])
      break
    }
    default:
      throw new Error(`no food model for ${id}`)
  }
  g.add(p.mesh(matte(), 'mesh', hi(q)))
  return g
}

// ---- reading room decorations (Design §2, §11): built like Decorations.tsx, ≤ 0.16 wide ------

/** A decoration for the 3D bookshelf: origin at the bottom centre of its footprint, facing +z. */
export function buildRoomDecor(id: RoomDecorId): THREE.Group {
  const g = new THREE.Group()
  g.name = `decor:${id}`
  const q: CreatureQuality = 'high'
  const p = new Paint()
  switch (id) {
    case 'dragon-plush': {
      // a soft plum dragon with gold book wings, simple, not the creature model
      p.add(sph(0.05, q, 'M'), PLUM, [0, 0.05, 0], [0, 0, 0], [1, 1.05, 0.9])
      p.add(sph(0.032, q, 'S'), '#d7c3e6', [0, 0.045, 0.03], [0, 0, 0], [0.9, 1.1, 0.5])
      p.add(sph(0.042, q, 'M'), PLUM, [0, 0.118, 0.008])
      p.add(sph(0.022, q, 'S'), '#8a6aa8', [0, 0.11, 0.042], [0, 0, 0], [1.1, 0.8, 0.8])
      for (const s of [-1, 1]) {
        p.add(cone(0.01, 0.03, q, 6), GOLD, [s * 0.022, 0.16, 0.0], [0, 0, -s * 0.3])
        p.add(sph(0.006, q, 'S'), '#111114', [s * 0.016, 0.125, 0.04])
        // a book wing: an open book seen from the side
        p.add(box(0.06, 0.045, 0.004), GOLD, [s * 0.058, 0.085, -0.025], [0, s * 0.6, s * 0.3])
        p.add(box(0.055, 0.04, 0.006), CREAM, [s * 0.056, 0.085, -0.021], [0, s * 0.6, s * 0.3])
        p.add(sph(0.016, q, 'S'), PLUM, [s * 0.03, 0.012, 0.025], [0, 0, 0], [1, 0.7, 1.3])
      }
      p.add(cone(0.018, 0.07, q, 6), PLUM, [0, 0.03, -0.06], [-1.2, 0, 0])
      break
    }
    case 'pennant': {
      // a tiny bunting of plum, gold and cream flags on two sticks, within its own width
      for (const s of [-1, 1]) {
        p.add(cyl(0.004, 0.004, 0.17, q, false, 6), WOOD_DARK, [s * 0.072, 0.085, 0])
        p.add(cyl(0.012, 0.014, 0.012, q, false, 8), WOOD_DARK, [s * 0.072, 0.006, 0])
      }
      const cols = [PLUM, GOLD, CREAM, PLUM, GOLD]
      for (let i = 0; i < 5; i++) {
        const t = (i + 0.5) / 5
        const x = -0.066 + t * 0.132
        const y = 0.155 - Math.sin(t * Math.PI) * 0.02
        p.add(cone(0.012, 0.035, q, 3), cols[i], [x, y - 0.018, 0.002], [Math.PI, 0, 0], [1, 1, 0.25])
      }
      p.add(cyl(0.0015, 0.0015, 0.145, q, false, 4), '#3b2e22', [0, 0.152, 0], [0, 0, Math.PI / 2])
      break
    }
    case 'egg-display': {
      // three tiny eggs, cream, sage and gold, on a wooden stand
      p.add(box(0.13, 0.016, 0.06), WOOD, [0, 0.008, 0])
      p.add(box(0.12, 0.03, 0.05), WOOD_DARK, [0, 0.03, -0.004])
      for (const [x, c] of [
        [-0.04, CREAM],
        [0, SAGE],
        [0.04, GOLD],
      ] as const) {
        p.add(cyl(0.012, 0.014, 0.01, q, false, 10), WOOD_DARK, [x, 0.05, 0.004])
        p.add(sph(0.017, q, 'M'), c, [x, 0.074, 0.004], [0, 0, 0], [1, 1.35, 1])
      }
      break
    }
    case 'snow-globe': {
      // a glass dome on a gold base with a tiny tree and still snow
      p.add(cyl(0.045, 0.052, 0.03, q), GOLD, [0, 0.015, 0])
      p.add(cyl(0.04, 0.04, 0.006, q), '#f4f8fb', [0, 0.033, 0])
      p.add(cone(0.02, 0.05, q, 8), '#3f7a4a', [0, 0.06, 0])
      p.add(cyl(0.004, 0.004, 0.012, q, false, 5), WOOD_DARK, [0, 0.038, 0])
      for (const [x, y, z] of [
        [0.02, 0.08, 0.01],
        [-0.022, 0.07, -0.005],
        [0.008, 0.1, -0.015],
        [-0.01, 0.092, 0.018],
        [0.025, 0.06, -0.012],
      ])
        p.add(sph(0.003, q, 'S'), '#ffffff', [x, y, z])
      break
    }
  }
  const m = p.mesh(matte(), 'mesh', true)
  g.add(m)
  if (id === 'snow-globe') {
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 20, 14),
      new THREE.MeshStandardMaterial({ color: '#dff0ff', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, depthWrite: false }),
    )
    glass.position.y = 0.072
    glass.name = 'glass'
    g.add(glass)
  }
  return g
}

// ---- measuring (the den's budget test, Design §10) ---------------------------------------

/** Draw calls and triangles of what an object draws (a mesh, sprite or points is one draw call; a shadow caster draws again on `high`). */
export function drawCost(root: THREE.Object3D, shadows: boolean): { calls: number; triangles: number } {
  let calls = 0
  let triangles = 0
  root.traverseVisible((o) => {
    const m = o as THREE.Mesh
    if ((o as THREE.Sprite).isSprite) {
      calls++
      triangles += 2
    } else if ((o as THREE.Points).isPoints) calls++
    else if (m.isMesh) {
      const g = m.geometry
      const t = (g.index ? g.index.count : g.attributes.position.count) / 3
      calls += shadows && m.castShadow ? 2 : 1
      triangles += t * (shadows && m.castShadow ? 2 : 1)
    }
  })
  return { calls, triangles }
}

export function isOutfitSlot(s: string): s is OutfitSlot {
  return s === 'head' || s === 'face' || s === 'neck' || s === 'back'
}

// ---- the den's camera (T-0029 §5, pulled back 10 % for the six spots, T-0031 §8) -----------

/** Share of the canvas height a creature fills before the pull-back, per stage (T-0029 Design §5). */
export const DEN_FILL = { grown: 0.6, young: 0.46, baby: 0.33 } as const
export const DEN_FOV = 30
/** Visible height at the cushion before the pull-back: the grown-up (1 world unit tall) fills 60 % of it. */
export const DEN_VIEW_H = 1 / DEN_FILL.grown
/** Pulled back 10 % so the six spots are in view (the grown-up now fills about 54 %). */
const PULL = 1.1
const DISTANCE = (DEN_VIEW_H / (2 * Math.tan(((DEN_FOV / 2) * Math.PI) / 180))) * PULL
export const DEN_LOOK = new THREE.Vector3(0, 0.55, 0)
const DOWN = (10 * Math.PI) / 180
const TURN = (32 * Math.PI) / 180
export const DEN_CAMERA: V3 = [
  DEN_LOOK.x + DISTANCE * Math.sin(TURN) * Math.cos(DOWN),
  DEN_LOOK.y + DISTANCE * Math.sin(DOWN),
  DEN_LOOK.z + DISTANCE * Math.cos(TURN) * Math.cos(DOWN),
]

/** The den's camera for a canvas of this aspect (width / height). */
export function denCamera(aspect: number): THREE.PerspectiveCamera {
  const c = new THREE.PerspectiveCamera(DEN_FOV, aspect, 0.1, 30)
  c.position.set(...DEN_CAMERA)
  c.lookAt(DEN_LOOK)
  c.updateMatrixWorld()
  c.updateProjectionMatrix()
  return c
}

// ---- built once, reused (Design §10) ------------------------------------------------------

const built = new Map<string, THREE.Group>()
function once(key: string, make: () => THREE.Group): THREE.Group {
  let g = built.get(key)
  if (!g) built.set(key, (g = make()))
  return g.clone(true)
}

/** A den item for the scene: built once per id, quality, sky and weather, then cloned. */
export const denItem = (id: string, q: CreatureQuality, opts: DenItemOptions = {}) =>
  once(`item|${id}|${q}|${opts.sky ?? ''}|${opts.weather ?? ''}|${opts.moving ? 1 : 0}`, () => buildDenItem(id, q, opts))
/** A habitat's room for the scene: built once per habitat and quality, then cloned. */
export const denRoom = (habitat: HabitatId, q: CreatureQuality) => once(`room|${habitat}|${q}`, () => buildRoom(habitat, q))
export const denBed = (q: CreatureQuality) => once(`bed|${q}`, () => buildDefaultBed(q))
export const denRug = (q: CreatureQuality) => once(`rug|${q}`, () => buildDefaultRug(q))
