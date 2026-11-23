import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import * as THREE from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SPECIES, speciesById } from '#/lib/creatures/species'
import type { SpeciesId } from '#/lib/creatures/species'
import { creatureParams, disposeCreature, inspectCreature, sharedCreatureMaterials } from './model'
import type { CreatureQuality, CreatureStage } from './model'
import { makeCreature, modelFor } from './models'

/**
 * The tester's checks for T-0027 that the model test leaves out: every
 * creature at every stage and quality, plain and shiny; nothing leaks when a
 * creature is built and disposed over and over; an unknown id fails clearly;
 * and no model file sets a colour by name.
 */

const STAGES: CreatureStage[] = ['baby', 'young', 'grown']
const QUALITIES: CreatureQuality[] = ['low', 'high']

/** Every geometry and material made while `fn` runs (each one sets an attribute or its values when it is made). */
function track<T>(fn: () => T) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const disposed = new Set<object>()
  const setAttribute = THREE.BufferGeometry.prototype.setAttribute
  const setValues = THREE.Material.prototype.setValues
  const gDispose = THREE.BufferGeometry.prototype.dispose
  const mDispose = THREE.Material.prototype.dispose
  vi.spyOn(THREE.BufferGeometry.prototype, 'setAttribute').mockImplementation(function (this: THREE.BufferGeometry, ...a) {
    geometries.add(this)
    return setAttribute.apply(this, a)
  })
  vi.spyOn(THREE.Material.prototype, 'setValues').mockImplementation(function (this: THREE.Material, ...a) {
    materials.add(this)
    return setValues.apply(this, a)
  })
  vi.spyOn(THREE.BufferGeometry.prototype, 'dispose').mockImplementation(function (this: THREE.BufferGeometry) {
    disposed.add(this)
    return gDispose.apply(this)
  })
  vi.spyOn(THREE.Material.prototype, 'dispose').mockImplementation(function (this: THREE.Material) {
    disposed.add(this)
    return mDispose.apply(this)
  })
  const result = fn()
  return { result, geometries, materials, disposed }
}

function liveGeometries(root: THREE.Object3D): Set<THREE.BufferGeometry> {
  const out = new Set<THREE.BufferGeometry>()
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) out.add((o as THREE.Mesh).geometry)
  })
  return out
}

/** The palette slots a model paints with (its raw meshes' materials). */
function usedSlots(id: SpeciesId): Set<string> {
  const raw = modelFor(id)!.build(creatureParams(id, { quality: 'low' }))
  const out = new Set<string>()
  raw.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) out.add((m.material as THREE.Material).userData.slot as string)
  })
  disposeCreature(raw)
  return out
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('every creature at every stage and quality, plain and shiny', () => {
  it.each(SPECIES.map((s) => s.id))('%s', (id) => {
    const s = speciesById(id)
    const shared = new Set<THREE.Material>(Object.values(sharedCreatureMaterials()))
    for (const stage of STAGES) {
      for (const quality of QUALITIES) {
        for (const palette of [s.palette, s.shinyPalette]) {
          const label = `${id} ${stage} ${quality} ${palette === s.shinyPalette ? 'shiny' : 'plain'}`
          const g = makeCreature(id, { stage, quality, palette })
          const stats = inspectCreature(g)
          const size = stats.box.getSize(new THREE.Vector3())
          expect(stats.triangles, `${label} triangles`).toBeLessThanOrEqual(quality === 'low' ? 1500 : 3000)
          expect(stats.drawCalls, `${label} draw calls`).toBeLessThanOrEqual(12)
          expect(Math.abs(stats.box.min.y), `${label} stands on y = 0`).toBeLessThan(1e-4)
          expect(size.y, `${label} height`).toBeGreaterThan(0.5)
          expect(size.y, `${label} height`).toBeLessThanOrEqual(1.15)
          g.traverse((o) => {
            const m = o as THREE.Mesh
            if (!m.isMesh) return
            expect(shared.has(m.material as THREE.Material), `${label} ${m.name} uses a shared material`).toBe(true)
            const pos = m.geometry.attributes.position.array
            for (let i = 0; i < pos.length; i++) if (!Number.isFinite(pos[i])) throw new Error(`${label} ${m.name}: NaN vertex`)
            expect(m.geometry.attributes.color.count, `${label} ${m.name} vertex colours`).toBe(m.geometry.attributes.position.count)
          })
          disposeCreature(g)
        }
      }
    }
  })
})

describe('building and disposing', () => {
  it.each(SPECIES.map((s) => s.id))('%s leaves no geometry or material behind', (id) => {
    const shared = new Set<THREE.Material>(Object.values(sharedCreatureMaterials()))
    const used = usedSlots(id)
    const { result: g, geometries, materials, disposed } = track(() => makeCreature(id, { quality: 'low' }))
    const live = liveGeometries(g)
    for (const geo of geometries) {
      if (!live.has(geo)) expect(disposed.has(geo), `${id}: a building geometry was not disposed`).toBe(true)
    }
    // a slot the model never paints with is never drawn, so it holds nothing on the GPU and the
    // garbage collector takes it; every slot material that was on a mesh must be disposed
    for (const mat of materials) {
      if (shared.has(mat)) continue
      if (used.has(mat.userData.slot)) expect(disposed.has(mat), `${id}: slot ${mat.userData.slot} was not disposed`).toBe(true)
      else expect(mat.userData.slot, `${id}: a material that is not a slot material`).toBeTypeOf('string')
    }
    disposeCreature(g)
    for (const geo of live) expect(disposed.has(geo), `${id}: disposeCreature missed a geometry`).toBe(true)
    // the shared materials must survive a dispose
    for (const mat of shared) expect(disposed.has(mat), `${id}: a shared material was disposed`).toBe(false)
  })

  it('builds and disposes all 20 many times with no growth in what stays alive', () => {
    const before = Object.values(sharedCreatureMaterials())
    const unusedPerRound = SPECIES.reduce((n, s) => n + 8 - usedSlots(s.id).size, 0)
    const { geometries, materials, disposed } = track(() => {
      for (let round = 0; round < 10; round++) {
        for (const s of SPECIES) {
          const g = makeCreature(s.id, { palette: round % 2 ? s.shinyPalette : s.palette, quality: round % 3 ? 'high' : 'low' })
          disposeCreature(g)
        }
      }
    })
    const shared = new Set<THREE.Material>(before)
    const leftGeometries = [...geometries].filter((g) => !disposed.has(g))
    const leftMaterials = [...materials].filter((m) => !disposed.has(m) && !shared.has(m))
    expect(leftGeometries, 'geometries never disposed').toHaveLength(0)
    // only the unused slot materials of creatureMaterials() stay undisposed (never drawn, see above)
    for (const m of leftMaterials) expect(m.userData.slot, 'a material left that is not a slot material').toBeTypeOf('string')
    expect(leftMaterials.length, 'exactly the unused slots of each build').toBe(10 * unusedPerRound)
    expect(Object.values(sharedCreatureMaterials())).toEqual(before)
  })
})

describe('an unknown creature', () => {
  it('fails with a clear error instead of drawing nothing', () => {
    const nope = 'unicorn-cat' as SpeciesId
    expect(modelFor(nope)).toBeUndefined()
    expect(() => makeCreature(nope)).toThrow(/No model for creature unicorn-cat/)
    expect(() => speciesById(nope)).toThrow(/Unknown creature: unicorn-cat/)
  })
})

describe('model files set no colour of their own', () => {
  const dir = join(process.cwd(), 'src', 'components', 'creatures', 'models')
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts' && !f.endsWith('.test.ts'))
  it.each(files)('%s', (f) => {
    const code = readFileSync(join(dir, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
    // `.color.set('white')`, `.color.copy(...)`, `emissive` and the like: colours that are not palette slots
    expect(code, 'writes a colour on a material').not.toMatch(/\.(color|emissive|specular)\s*(\.\w+\s*\(|=)/)
    expect(code, 'sets an emissive or a colour option').not.toMatch(/\b(emissive|vertexColors)\b/)
  })
})
