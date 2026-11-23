import * as THREE from 'three'
import type { Plant } from '#/lib/garden/garden'
import type { PlantKind } from '#/lib/garden/plants'
import type { Season } from '#/lib/garden/seasons'
import type { GardenItemId } from '#/lib/garden/numbers'
import { BED_D, BED_RIM, BED_W, type GardenLayout, plantHeight, spotPoint } from '#/lib/garden/view'
import { leafColour } from './plantSvg'

/**
 * The cosy 3D garden's models (T-0062, D-0051 §3, §6): plants, beds, ground and
 * garden items built from boxes, cylinders, cones and low spheres in the
 * shelf's warm palette — no loaded models, no textures.
 *
 * **One plant is one draw call.** Every part of a plant is merged into a single
 * geometry with its colour baked into the vertices, so a garden of a hundred
 * plants is a handful of draw calls rather than hundreds (the budget is in
 * `gardenBudget.test.ts`). The shared material is lit, so the shapes still read
 * as shapes.
 */

export type Quality = 'low' | 'high'

/** One lit material for everything in the garden: the colour comes from the vertices. */
export const gardenMaterial = new THREE.MeshLambertMaterial({ vertexColors: true })

interface Part {
  geometry: THREE.BufferGeometry
  colour: string
  matrix: THREE.Matrix4
}

const geo = new Map<string, THREE.BufferGeometry>()
const cached = (key: string, make: () => THREE.BufferGeometry) => {
  let g = geo.get(key)
  if (!g) geo.set(key, (g = make().toNonIndexed()))
  return g
}

const sphere = (q: Quality) => cached(`sphere-${q}`, () => new THREE.SphereGeometry(0.5, q === 'low' ? 6 : 12, q === 'low' ? 4 : 8))
const cone = (q: Quality) => cached(`cone-${q}`, () => new THREE.ConeGeometry(0.5, 1, q === 'low' ? 5 : 10))
const cylinder = (q: Quality) => cached(`cyl-${q}`, () => new THREE.CylinderGeometry(0.4, 0.5, 1, q === 'low' ? 5 : 8))
const box = () => cached('box', () => new THREE.BoxGeometry(1, 1, 1))
const plane = () => cached('plane', () => new THREE.PlaneGeometry(1, 1))

const place = (x: number, y: number, z: number, sx: number, sy = sx, sz = sx, rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)),
    new THREE.Vector3(sx, sy, sz),
  )

/** Merges parts into one geometry with their colours in the vertices. */
export function mergeParts(parts: Part[]): THREE.BufferGeometry {
  let count = 0
  for (const p of parts) count += p.geometry.attributes.position.count
  const position = new Float32Array(count * 3)
  const normal = new Float32Array(count * 3)
  const colour = new Float32Array(count * 3)
  const c = new THREE.Color()
  const normalMatrix = new THREE.Matrix3()
  const v = new THREE.Vector3()
  let at = 0
  for (const p of parts) {
    const pos = p.geometry.attributes.position as THREE.BufferAttribute
    const nor = p.geometry.attributes.normal as THREE.BufferAttribute | undefined
    // a part that already carries its own colours (a whole plant) keeps them
    const own = p.geometry.attributes.color as THREE.BufferAttribute | undefined
    normalMatrix.getNormalMatrix(p.matrix)
    c.set(p.colour)
    for (let i = 0; i < pos.count; i++) {
      if (own) c.fromBufferAttribute(own, i)
      v.fromBufferAttribute(pos, i).applyMatrix4(p.matrix)
      position[(at + i) * 3] = v.x
      position[(at + i) * 3 + 1] = v.y
      position[(at + i) * 3 + 2] = v.z
      if (nor) {
        v.fromBufferAttribute(nor, i).applyMatrix3(normalMatrix).normalize()
        normal[(at + i) * 3] = v.x
        normal[(at + i) * 3 + 1] = v.y
        normal[(at + i) * 3 + 2] = v.z
      }
      colour[(at + i) * 3] = c.r
      colour[(at + i) * 3 + 1] = c.g
      colour[(at + i) * 3 + 2] = c.b
    }
    at += pos.count
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(position, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3))
  g.setAttribute('color', new THREE.BufferAttribute(colour, 3))
  return g
}

export interface PlantLook {
  kind: PlantKind
  /** 'sprout' is two leaves whatever the kind */
  sprout: boolean
  season: Season
  blooming: boolean
  night: boolean
  /** how tall, in garden units */
  height: number
  /** the simplest shape of its family, for the plants farthest from the camera */
  simple?: boolean
}

export const lookOf = (p: Plant, season: Season, simple = false): PlantLook => ({
  kind: p.kind,
  sprout: p.stage === 'sprout',
  season,
  blooming: p.blooming,
  night: p.night,
  height: plantHeight(p.kind.height, p.scale),
  simple,
})

const lookKey = (l: PlantLook, q: Quality) =>
  [l.kind.id, l.sprout ? 's' : '', l.season, l.blooming ? 'b' : '', l.night ? 'n' : '', l.simple ? 'x' : '', Math.round(l.height * 20), q].join('|')

const builtPlants = new Map<string, THREE.BufferGeometry>()

/** One plant's geometry, built once per look and then shared by every plant with the same look. */
export function plantGeometry(look: PlantLook, q: Quality = 'low'): THREE.BufferGeometry {
  const key = lookKey(look, q)
  let g = builtPlants.get(key)
  if (!g) builtPlants.set(key, (g = mergeParts(plantParts(look, q))))
  return g
}

/**
 * Every plant that does not need to move, merged into one mesh: the whole back
 * of the garden in a single draw call (T-0062 §4). Their colours come along, so
 * the field is still a garden and not one green blob.
 */
export function buildPlantField(items: Array<{ look: PlantLook; x: number; z: number }>, q: Quality = 'low'): THREE.Mesh | null {
  if (!items.length) return null
  const mesh = new THREE.Mesh(
    mergeParts(items.map((it) => ({ geometry: plantGeometry(it.look, q), colour: '#ffffff', matrix: place(it.x, 0.13, it.z, 1, 1, 1) }))),
    gardenMaterial,
  )
  mesh.name = 'plant-field'
  return mesh
}

/** A plant as a mesh: one draw call. */
export function buildPlant(look: PlantLook, q: Quality = 'low'): THREE.Mesh {
  const mesh = new THREE.Mesh(plantGeometry(look, q), gardenMaterial)
  mesh.name = `plant:${look.kind.id}`
  return mesh
}

function plantParts(look: PlantLook, q: Quality): Part[] {
  const { kind, height: h, season } = look
  const leaf = leafColour(kind, season)
  const flower = look.night ? '#f3f1ff' : kind.flower
  const parts: Part[] = []
  const add = (geometry: THREE.BufferGeometry, colour: string, matrix: THREE.Matrix4) => parts.push({ geometry, colour, matrix })

  if (look.sprout) {
    add(cylinder(q), kind.stem, place(0, h / 2, 0, 0.05, h, 0.05))
    add(sphere(q), kind.leaf, place(0.07, h * 0.9, 0, 0.16, 0.06, 0.1))
    add(sphere(q), kind.leaf, place(-0.07, h * 0.78, 0, 0.16, 0.06, 0.1))
    return parts
  }

  switch (kind.family) {
    case 'tree': {
      const trunk = h * (kind.id === 'pine' ? 0.25 : 0.42)
      const crown = h - trunk
      const w = Math.max(0.24, crown * 0.8)
      add(cylinder(q), kind.stem, place(0, trunk / 2, 0, 0.12 + h * 0.03, trunk, 0.12 + h * 0.03))
      if (leaf === null) {
        // winter: bare branches
        for (const [dx, dz, rz] of [
          [0.18, 0, 0.5],
          [-0.16, 0.1, -0.5],
          [0, -0.16, 0.2],
        ])
          add(cylinder(q), kind.stem, place(dx * w, trunk + crown * 0.3, dz * w, 0.05, crown * 0.7, 0.05, 0, rz))
      } else if (kind.id === 'pine') {
        for (let i = 0; i < (look.simple ? 1 : 3); i++)
          add(cone(q), leaf, place(0, trunk + (crown * (i + 0.5)) / 3, 0, w * (1 - i * 0.2), crown * 0.62, w * (1 - i * 0.2)))
      } else if (look.simple) {
        add(sphere(q), leaf, place(0, trunk + crown * 0.5, 0, w, crown, w))
      } else {
        add(sphere(q), leaf, place(0, trunk + crown * 0.66, 0, w * 0.95, crown * 0.8, w * 0.95))
        add(sphere(q), leaf, place(-w * 0.3, trunk + crown * 0.4, 0.05, w * 0.6, crown * 0.5, w * 0.6))
        add(sphere(q), leaf, place(w * 0.3, trunk + crown * 0.42, -0.05, w * 0.6, crown * 0.5, w * 0.6))
      }
      if (!look.simple && leaf !== null && look.blooming)
        for (const [dx, dy, dz] of [
          [0.3, 0.6, 0.2],
          [-0.3, 0.75, -0.1],
          [0.1, 0.5, -0.3],
        ])
          add(sphere(q), flower, place(dx * w, trunk + crown * dy, dz * w, 0.12 + h * 0.02))
      if (!look.simple && kind.berries && season !== 'spring')
        add(sphere(q), '#c0493f', place(w * 0.25, trunk + crown * 0.5, w * 0.2, 0.1))
      return parts
    }
    case 'shrub': {
      const w = Math.max(0.3, h * 1)
      const body = leaf ?? '#6a5747'
      add(cylinder(q), kind.stem, place(0, h * 0.18, 0, 0.08, h * 0.36, 0.08))
      add(sphere(q), body, place(0, h * 0.6, 0, w, h * 0.8, w))
      if (!look.simple) {
        add(sphere(q), body, place(w * 0.32, h * 0.52, 0.08, w * 0.5, h * 0.42, w * 0.5))
        add(sphere(q), body, place(-w * 0.3, h * 0.55, -0.08, w * 0.5, h * 0.42, w * 0.5))
      }
      if (!look.simple && look.blooming)
        for (const [dx, dy, dz] of [
          [0.35, 0.7, 0.1],
          [-0.3, 0.6, 0.2],
          [0.05, 0.85, -0.25],
        ])
          add(sphere(q), flower, place(dx * w, h * dy, dz * w, 0.11 + h * 0.03))
      if (!look.simple && kind.thorns)
        add(cone(q), kind.stem, place(w * 0.45, h * 0.7, 0, 0.05, 0.12, 0.05, 0, Math.PI / 3))
      if (!look.simple && kind.berries && season !== 'spring') add(sphere(q), '#c0493f', place(-w * 0.2, h * 0.45, w * 0.25, 0.09))
      return parts
    }
    case 'flower': {
      add(cylinder(q), kind.stem, place(0, h / 2, 0, 0.04, h, 0.04))
      add(sphere(q), kind.leaf, place(0.1, h * 0.35, 0, 0.18, 0.05, 0.1))
      if (kind.id === 'lavender' || kind.id === 'snowdrop') {
        for (let i = 0; i < (look.simple ? 1 : 3); i++)
          add(sphere(q), look.blooming ? flower : kind.leaf, place(0, h - i * h * 0.18, 0, 0.12, 0.16, 0.12))
      } else {
        const petal = Math.max(0.1, h * 0.3)
        if (look.blooming && !look.simple)
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2
            add(plane(), flower, place(Math.cos(a) * petal * 0.6, h, Math.sin(a) * petal * 0.6, petal * 0.7, petal * 0.5, 1, -Math.PI / 2, a))
          }
        add(sphere(q), look.blooming ? (kind.id === 'sunflower' ? '#7a5a2e' : '#d9a85b') : kind.leaf, place(0, h, 0, petal * 0.42))
      }
      return parts
    }
    case 'fern': {
      const w = Math.max(0.3, h * 1.2)
      const colour = leaf ?? kind.leaf
      for (let i = 0; i < (look.simple ? 2 : 4); i++) {
        const a = (i / 4) * Math.PI * 2
        add(sphere(q), colour, place(Math.cos(a) * w * 0.25, h * 0.6, Math.sin(a) * w * 0.25, w * 0.45, h * 0.5, 0.12, 0, Math.cos(a) * 0.5))
      }
      add(sphere(q), kind.stem, place(0, 0.04, 0, 0.14, 0.06, 0.14))
      return parts
    }
  }
}

// ---- the ground, the beds and the items ----------------------------------------------------

const GROUND: Record<Season, { grass: string; earth: string; rim: string }> = {
  spring: { grass: '#86ab6b', earth: '#6b4f39', rim: '#5d4531' },
  summer: { grass: '#6f9a58', earth: '#6b4f39', rim: '#5d4531' },
  autumn: { grass: '#8a9655', earth: '#64482f', rim: '#56402b' },
  winter: { grass: '#c9cfdc', earth: '#5a4434', rim: '#4c3a2a' },
}

/** The grass under everything: one flat box. */
export function buildGround(layout: GardenLayout, season: Season): THREE.Mesh {
  const g = mergeParts([
    { geometry: box(), colour: GROUND[season].grass, matrix: place(layout.width / 2, -0.06, layout.depth / 2, layout.width + 1, 0.12, layout.depth + 1) },
  ])
  const mesh = new THREE.Mesh(g, gardenMaterial)
  mesh.name = 'ground'
  return mesh
}

/** Every bed as one instanced box: one draw call however many beds there are. */
export function buildBeds(layout: GardenLayout, season: Season): THREE.InstancedMesh {
  const colour = season === 'winter' ? '#e8ecf5' : GROUND[season].earth
  const g = mergeParts([{ geometry: box(), colour, matrix: place(0, 0, 0, 1, 1, 1) }])
  const mesh = new THREE.InstancedMesh(g, gardenMaterial, Math.max(1, layout.beds.length))
  layout.beds.forEach((bed, i) => {
    mesh.setMatrixAt(i, place(bed.x + BED_W / 2, 0.04, bed.z + BED_D / 2, BED_W, 0.18, BED_D))
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.name = 'beds'
  return mesh
}

/** The soft dark disc under each plant, instead of a shadow map: one instanced disc. */
export function buildShadows(points: Array<{ x: number; z: number; r: number }>): THREE.InstancedMesh {
  const g = mergeParts([{ geometry: plane(), colour: '#2b2016', matrix: place(0, 0, 0, 1, 1, 1, -Math.PI / 2, 0) }])
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false })
  const mesh = new THREE.InstancedMesh(g, material, Math.max(1, points.length))
  points.forEach((p, i) => mesh.setMatrixAt(i, place(p.x, 0.15, p.z, p.r, p.r, p.r)))
  mesh.instanceMatrix.needsUpdate = true
  mesh.name = 'shadows'
  return mesh
}

/** A garden item, merged into one mesh. */
export function buildItem(item: GardenItemId, season: Season, q: Quality = 'low'): THREE.Mesh {
  const snow = season === 'winter'
  const parts: Part[] = []
  const add = (geometry: THREE.BufferGeometry, colour: string, matrix: THREE.Matrix4) => parts.push({ geometry, colour, matrix })
  switch (item) {
    case 'path':
      for (let i = 0; i < 3; i++) add(box(), snow ? '#e9ecf4' : '#b9ad99', place((i - 1) * 0.5, 0.02, 0, 0.42, 0.04, 0.34))
      break
    case 'bench':
      add(box(), '#8a6440', place(0, 0.24, 0, 1, 0.08, 0.34))
      add(box(), '#6f4f32', place(0, 0.4, -0.16, 1, 0.3, 0.06))
      add(box(), '#6f4f32', place(-0.42, 0.12, 0, 0.08, 0.24, 0.3))
      add(box(), '#6f4f32', place(0.42, 0.12, 0, 0.08, 0.24, 0.3))
      break
    case 'birdbath':
      add(cylinder(q), '#9aa0a8', place(0, 0.17, 0, 0.14, 0.34, 0.14))
      add(cylinder(q), '#b4bac2', place(0, 0.38, 0, 0.56, 0.1, 0.56))
      add(cylinder(q), snow ? '#dfe6f2' : '#7fa8c4', place(0, 0.43, 0, 0.42, 0.04, 0.42))
      break
    case 'pond':
      add(cylinder(q), '#6f91ae', place(0, 0.02, 0, 1.3, 0.06, 0.9))
      add(cylinder(q), snow ? '#cfdcea' : '#86aecb', place(0, 0.06, 0, 1.1, 0.04, 0.72))
      break
    case 'lanterns':
      for (const x of [-0.45, 0.45]) {
        add(cylinder(q), '#5a4a3a', place(x, 0.22, 0, 0.06, 0.44, 0.06))
        add(sphere(q), '#d9a85b', place(x, 0.5, 0, 0.22))
      }
      break
    case 'greenhouse':
      add(box(), '#cfe3e6', place(0, 0.35, 0, 1.2, 0.7, 0.8))
      add(cone(q), '#dceaec', place(0, 0.85, 0, 1.3, 0.35, 0.95))
      break
  }
  const mesh = new THREE.Mesh(mergeParts(parts), gardenMaterial)
  mesh.name = `item:${item}`
  return mesh
}

/** Snow or falling leaves: one Points object, never one per flake (T-0062 §3). */
export function buildWeather(layout: GardenLayout, season: Season, count = 120): THREE.Points | null {
  if (season !== 'winter' && season !== 'autumn') return null
  const position = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    position[i * 3] = Math.random() * layout.width
    position[i * 3 + 1] = Math.random() * 4
    position[i * 3 + 2] = Math.random() * layout.depth
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(position, 3))
  const points = new THREE.Points(
    g,
    new THREE.PointsMaterial({
      size: season === 'winter' ? 0.09 : 0.11,
      color: season === 'winter' ? '#ffffff' : '#d8a95a',
      transparent: true,
      opacity: 0.8,
    }),
  )
  points.name = 'weather'
  return points
}

/** The visitors: one Points object for all of them (T-0063 §3). */
export function buildVisitors(spots: Array<{ x: number; y: number; z: number; colour: string }>): THREE.Points | null {
  if (!spots.length) return null
  const position = new Float32Array(spots.length * 3)
  const colour = new Float32Array(spots.length * 3)
  const c = new THREE.Color()
  spots.forEach((s, i) => {
    position[i * 3] = s.x
    position[i * 3 + 1] = s.y
    position[i * 3 + 2] = s.z
    c.set(s.colour)
    colour[i * 3] = c.r
    colour[i * 3 + 1] = c.g
    colour[i * 3 + 2] = c.b
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(position, 3))
  g.setAttribute('color', new THREE.BufferAttribute(colour, 3))
  const points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.95 }))
  points.name = 'visitors'
  return points
}

/** Where a plant stands in the scene, in garden units. */
export const plantSpot = (layout: GardenLayout, bed: number, spot: number) => spotPoint(layout, bed, spot)

export { BED_RIM }
