import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { speciesById } from '#/lib/creatures/species'
import type { CreaturePalette, SpeciesId } from '#/lib/creatures/species'

/**
 * The shared base of every book creature's 3D model (T-0027 Design §3–§6).
 *
 * A model file in `./models/<id>.ts` builds the grown-up creature as a
 * `THREE.Group` of named part groups with meshes, anchors and tags, painting
 * only with the slot materials from `creatureMaterials(p)`. Everything after
 * that happens here, the same for all 20: growth-stage scaling, dropping detail
 * on `low`, baking each slot colour into vertex colours and merging every
 * part's meshes into one mesh per material kind (four shared materials for a
 * whole den), shadows, and putting the creature back on y = 0.
 */

export type { CreaturePalette, SpeciesId }

export type CreatureStage = 'baby' | 'young' | 'grown'
export type CreatureQuality = 'low' | 'high'

export interface CreatureParams {
  palette: CreaturePalette
  /** a model file never reads this: it always builds the grown-up; the shared builder scales the parts */
  stage: CreatureStage
  quality: CreatureQuality
}

/** What a model file exports next to its `build<Name>` function. Its palette lives in the species list. */
export interface CreatureModel {
  id: SpeciesId
  build: (p: CreatureParams) => THREE.Group
}

export const ANCHORS = ['seat', 'neck', 'back', 'head', 'hat', 'face', 'paw'] as const
export type AnchorName = (typeof ANCHORS)[number]

export const PARTS = ['part:body', 'part:head', 'part:eyes', 'part:armL', 'part:armR', 'part:tail', 'part:wings'] as const
export type PartName = (typeof PARTS)[number]
export const REQUIRED_PARTS: readonly PartName[] = ['part:body', 'part:head', 'part:eyes', 'part:armL', 'part:armR']

/** Which part each anchor belongs in (Design §5); `root` is the model group itself. */
export const ANCHOR_PARENT: Record<AnchorName, PartName | 'root'> = {
  seat: 'root',
  neck: 'part:body',
  back: 'part:body',
  head: 'part:head',
  hat: 'part:head',
  face: 'part:head',
  paw: 'part:armR',
}

// ---------------------------------------------------------------------------
// Segments: the only place segment counts come from (Design §3)
// ---------------------------------------------------------------------------

export type SegSize = 'L' | 'M' | 'S' | 'XS'

/** Sphere segments [width, height]: L body/head, M tummy/feet/ears/snout/tail ball, S eyes/nose/inner ears/markings, XS glints/blush/tiny spots. */
export const SEG: Record<CreatureQuality, Record<SegSize, [number, number]>> = {
  high: { L: [16, 12], M: [10, 8], S: [8, 6], XS: [6, 4] },
  low: { L: [10, 8], M: [8, 6], S: [6, 4], XS: [5, 3] },
}

/** Radial segments for cylinders, cones, capsules and tori: 12 on high, 8 on low. */
export function radial(q: CreatureQuality): number {
  return q === 'high' ? 12 : 8
}

/** Capsule cap segments: 3 on high, 2 on low. */
export function capSegments(q: CreatureQuality): number {
  return q === 'high' ? 3 : 2
}

/** A sphere with the segments of its size class. */
export function sphere(r: number, size: SegSize, q: CreatureQuality): THREE.SphereGeometry {
  const [w, h] = SEG[q][size]
  return new THREE.SphereGeometry(r, w, h)
}

/** A capsule along y; `length` is the straight middle, the caps add `r` at each end. */
export function capsule(r: number, length: number, q: CreatureQuality): THREE.CapsuleGeometry {
  return new THREE.CapsuleGeometry(r, length, capSegments(q), radial(q), 1)
}

/** A cone along y, tip up. `sides` only for small ears (4, like the sleeping cat's) or a 3-sided nose. */
export function cone(r: number, h: number, q: CreatureQuality, sides?: number): THREE.ConeGeometry {
  return new THREE.ConeGeometry(r, h, sides ?? radial(q), 1)
}

/** A cylinder along y. */
export function cylinder(rTop: number, rBottom: number, h: number, q: CreatureQuality): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(rTop, rBottom, h, radial(q), 1)
}

/** A torus (ring) in the xy plane, round the z axis; `arc` for part of a ring. */
export function torus(r: number, tube: number, q: CreatureQuality, arc = Math.PI * 2): THREE.TorusGeometry {
  return new THREE.TorusGeometry(r, tube, q === 'high' ? 6 : 4, radial(q), arc)
}

type Vec3 = [number, number, number]

/** A mesh with its position, rotation (radians, XYZ) and scale, in one line. */
export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: Vec3 = [0, 0, 0],
  rotation: Vec3 = [0, 0, 0],
  scale: Vec3 = [1, 1, 1],
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material)
  m.position.set(...position)
  m.rotation.set(...rotation)
  m.scale.set(...scale)
  return m
}

/** A plain group at a position (and rotation), e.g. an ear with its inner ear, or a part at its pivot. */
export function group(name: string, position: Vec3 = [0, 0, 0], rotation: Vec3 = [0, 0, 0]): THREE.Group {
  const g = new THREE.Group()
  g.name = name
  g.position.set(...position)
  g.rotation.set(...rotation)
  return g
}

/** Puts `obj` halfway between a and b with its +y axis pointing from a to b; returns the distance. */
export function orientBetween(obj: THREE.Object3D, a: Vec3, b: Vec3): number {
  const va = new THREE.Vector3(...a)
  const vb = new THREE.Vector3(...b)
  const dir = vb.clone().sub(va)
  const length = dir.length()
  obj.position.copy(va).add(vb).multiplyScalar(0.5)
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  return length
}

/** z of the front surface of an ellipsoid (centre c, radii r) at x, y: where to put eyes, patches and markings. */
export function front(c: Vec3, r: Vec3, x: number, y: number): number {
  return c[2] + r[2] * Math.sqrt(Math.max(0, 1 - ((x - c[0]) / r[0]) ** 2 - ((y - c[1]) / r[1]) ** 2))
}

// ---------------------------------------------------------------------------
// Materials: palette slots in, four shared kinds out (Design §3)
// ---------------------------------------------------------------------------

export type Slot = 'body' | 'belly' | 'accent' | 'accent2' | 'eye' | 'nose' | 'glint' | 'blush'
export type MaterialKind = 'matte' | 'gloss' | 'satin' | 'blush'

const GLINT = '#ffffff'
const BLUSH = '#e8a6a6'

/**
 * One material per palette slot, for a model file to paint with. They only
 * carry the slot and its colour: `finishCreature` bakes the colour into the
 * mesh and swaps in the shared material of its kind, then disposes these.
 */
export function creatureMaterials(p: CreatureParams): Record<Slot, THREE.MeshStandardMaterial> {
  const colours: Record<Slot, string> = { ...p.palette, glint: GLINT, blush: BLUSH }
  const out = {} as Record<Slot, THREE.MeshStandardMaterial>
  for (const slot of Object.keys(colours) as Slot[]) {
    const kind = slotKind(slot, false)
    const m = new THREE.MeshStandardMaterial({
      color: colours[slot],
      roughness: KIND_ROUGHNESS[kind],
      transparent: kind === 'blush',
      opacity: kind === 'blush' ? 0.55 : 1,
    })
    m.userData.slot = slot
    out[slot] = m
  }
  return out
}

const KIND_ROUGHNESS: Record<MaterialKind, number> = { matte: 1, gloss: 0.2, satin: 0.45, blush: 1 }

function slotKind(slot: Slot, satin: boolean): MaterialKind {
  if (slot === 'blush') return 'blush'
  if (slot === 'eye' || slot === 'glint' || slot === 'nose') return 'gloss'
  return satin ? 'satin' : 'matte'
}

let shared: Record<MaterialKind, THREE.MeshStandardMaterial> | null = null

/** The four materials every creature shares (never dispose them). */
export function sharedCreatureMaterials(): Record<MaterialKind, THREE.MeshStandardMaterial> {
  if (!shared) {
    shared = {
      matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
      gloss: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0 }),
      satin: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.25 }),
      blush: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, transparent: true, opacity: 0.55 }),
    }
    for (const [kind, m] of Object.entries(shared)) m.name = `creature:${kind}`
  }
  return shared
}

// ---------------------------------------------------------------------------
// Anchors
// ---------------------------------------------------------------------------

/** An empty, named point outfits attach to; `size` in model units (Design §5). */
export function anchor(name: AnchorName, size: number): THREE.Object3D {
  if (!(size > 0)) throw new Error(`Anchor ${name} needs a size above 0`)
  const a = new THREE.Object3D()
  a.name = name
  a.userData.anchor = true
  a.userData.size = size
  return a
}

// ---------------------------------------------------------------------------
// Growth stages (Design §2; T-0029 may refine how they are applied)
// ---------------------------------------------------------------------------

export interface StageScale {
  head: number
  body: number
  /** arms and feet (meshes tagged `stageRole: 'foot'`) */
  limbs: number
  tail: number
  eyes: number
  /** horns, wings, ribbons, gills, ear tufts, mane (`stageRole: 'extra'`) */
  extra: number
  /** world units tall on the shelf (the placement scales the whole model to this) */
  shelfHeight: number
}

export const STAGE_SCALE: Record<CreatureStage, StageScale> = {
  baby: { head: 1.18, body: 0.85, limbs: 0.8, tail: 0.75, eyes: 1.15, extra: 0.7, shelfHeight: 0.12 },
  young: { head: 1.08, body: 0.93, limbs: 0.9, tail: 0.9, eyes: 1.07, extra: 0.85, shelfHeight: 0.17 },
  grown: { head: 1, body: 1, limbs: 1, tail: 1, eyes: 1, extra: 1, shelfHeight: 0.22 },
}

/**
 * Scales a freshly built (grown-up) model to a stage: the body round its
 * centre, the other parts follow the body's surface and scale round their own
 * pivots, the eyes, feet and extras get their own factor.
 */
export function applyStage(root: THREE.Group, stage: CreatureStage): void {
  const f = STAGE_SCALE[stage]
  if (stage === 'grown') return
  const body = root.getObjectByName('part:body')
  const centre = body ? body.position.clone() : new THREE.Vector3()
  const factorOf: Partial<Record<PartName, number>> = {
    'part:body': f.body,
    'part:head': f.head,
    'part:armL': f.limbs,
    'part:armR': f.limbs,
    'part:tail': f.tail,
    'part:wings': f.extra,
  }
  for (const child of root.children) {
    const factor = factorOf[child.name as PartName]
    if (factor === undefined) continue
    if (child !== body) child.position.sub(centre).multiplyScalar(f.body).add(centre)
    child.scale.multiplyScalar(factor)
  }
  const eyes = root.getObjectByName('part:eyes')
  if (eyes) eyes.scale.multiplyScalar(f.eyes / f.head)
  root.traverse((o) => {
    const role = o.userData.stageRole
    if (role !== 'extra' && role !== 'foot') return
    const owner = ownerPart(o, root)
    const ownerFactor = factorOf[owner?.name as PartName] ?? 1
    o.scale.multiplyScalar((role === 'extra' ? f.extra : f.limbs) / ownerFactor)
  })
}

// ---------------------------------------------------------------------------
// Finishing: drop detail, bake colours, merge per part and kind
// ---------------------------------------------------------------------------

function isPart(o: THREE.Object3D): boolean {
  return o.name.startsWith('part:')
}

/** The nearest part group above `o` (or the root when there is none). */
function ownerPart(o: THREE.Object3D, root: THREE.Object3D): THREE.Object3D {
  let p = o.parent
  while (p && p !== root && !isPart(p)) p = p.parent
  return p ?? root
}

/**
 * Turns a raw model into what the app draws: on `low` drops meshes tagged
 * `userData.detail`; bakes each slot's colour into vertex colours; merges each
 * part's meshes into one mesh per material kind; keeps parts and anchors (with
 * their places) and removes everything else; sets shadows; stands it on y = 0.
 */
export function finishCreature(root: THREE.Group, quality: CreatureQuality): THREE.Group {
  const kinds = sharedCreatureMaterials()
  root.updateMatrixWorld(true)

  const meshes: THREE.Mesh[] = []
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh)
  })
  const slotMaterials = new Set<THREE.Material>()
  const byOwner = new Map<THREE.Object3D, Map<MaterialKind, THREE.BufferGeometry[]>>()
  const inverse = new THREE.Matrix4()
  const local = new THREE.Matrix4()
  const colour = new THREE.Color()

  for (const m of meshes) {
    const material = m.material as THREE.MeshStandardMaterial
    slotMaterials.add(material)
    if (quality === 'low' && m.userData.detail) continue
    const slot = material.userData.slot as Slot | undefined
    if (!slot) throw new Error(`Mesh in ${root.name} is not painted with creatureMaterials()`)
    const owner = ownerPart(m, root)
    inverse.copy(owner.matrixWorld).invert()
    local.multiplyMatrices(inverse, m.matrixWorld)

    let g = m.geometry.clone()
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()])
    g.applyMatrix4(local)
    if (local.determinant() < 0) g = flipWinding(g)
    colour.copy(material.color)
    const n = g.attributes.position.count
    const colours = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) colour.toArray(colours, i * 3)
    g.setAttribute('color', new THREE.BufferAttribute(colours, 3))

    const kind = slotKind(slot, m.userData.satin === true)
    if (!byOwner.has(owner)) byOwner.set(owner, new Map())
    const lists = byOwner.get(owner)!
    if (!lists.has(kind)) lists.set(kind, [])
    lists.get(kind)!.push(g)
  }

  // keep parts and anchors where they are in the world; drop the raw meshes and helper groups
  const keep: THREE.Object3D[] = []
  root.traverse((o) => {
    if (o !== root && (isPart(o) || o.userData.anchor)) keep.push(o)
  })
  for (const o of keep) {
    const owner = ownerPart(o, root)
    if (o.parent !== owner) owner.attach(o)
  }
  const owners = [root, ...keep.filter(isPart)]
  for (const owner of owners) {
    for (const child of [...owner.children]) if (!isPart(child) && !child.userData.anchor) owner.remove(child)
  }
  for (const m of meshes) m.geometry.dispose()
  for (const mat of slotMaterials) mat.dispose()

  for (const [owner, lists] of byOwner) {
    for (const [kind, geometries] of lists) {
      const merged = mergeGeometries(geometries, false)
      for (const g of geometries) g.dispose()
      if (!merged) throw new Error(`Could not merge ${owner.name}/${kind} of ${root.name}`)
      const out = new THREE.Mesh(merged, kinds[kind])
      out.name = `mesh:${owner === root ? 'root' : owner.name.slice(5)}:${kind}`
      const shadow = kind !== 'blush' && owner.name !== 'part:eyes'
      out.castShadow = shadow
      out.receiveShadow = shadow
      owner.add(out)
    }
  }

  // stand it on the floor
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root, true)
  const dy = root.position.y - box.min.y
  if (Number.isFinite(dy) && Math.abs(dy) > 1e-6) for (const c of root.children) if (isPart(c)) c.position.y += dy
  root.updateMatrixWorld(true)
  return root
}

function flipWinding(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const index = g.index!
  for (let i = 0; i < index.count; i += 3) {
    const b = index.getX(i + 1)
    index.setX(i + 1, index.getX(i + 2))
    index.setX(i + 2, b)
  }
  return g
}

// ---------------------------------------------------------------------------
// Building and measuring
// ---------------------------------------------------------------------------

export interface CreatureOptions {
  stage?: CreatureStage
  quality?: CreatureQuality
  /** another palette, e.g. the shiny one; defaults to the species' own */
  palette?: CreaturePalette
}

export function creatureParams(id: SpeciesId, opts: CreatureOptions = {}): CreatureParams {
  return {
    palette: opts.palette ?? speciesById(id).palette,
    stage: opts.stage ?? 'grown',
    quality: opts.quality ?? 'high',
  }
}

/** Builds one model as the app draws it: default palette, build, stage, low-quality drop, merge. */
export function buildCreature(model: CreatureModel, opts: CreatureOptions = {}): THREE.Group {
  const p = creatureParams(model.id, opts)
  const g = model.build(p)
  g.name = model.id
  applyStage(g, p.stage)
  return finishCreature(g, p.quality)
}

export interface CreatureStats {
  triangles: number
  drawCalls: number
  meshes: number
  box: THREE.Box3
}

/** Triangles, draw calls (one per mesh) and the bounding box of a model, raw or finished. */
export function inspectCreature(root: THREE.Object3D): CreatureStats {
  root.updateMatrixWorld(true)
  let triangles = 0
  let meshes = 0
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    meshes++
    const g = m.geometry
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3
  })
  return { triangles, drawCalls: meshes, meshes, box: new THREE.Box3().setFromObject(root, true) }
}

/** Frees a creature's geometries (its materials are shared and stay). */
export function disposeCreature(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) m.geometry.dispose()
  })
}
