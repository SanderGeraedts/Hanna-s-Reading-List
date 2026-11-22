import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { SPECIES, isSpeciesId, speciesById } from '#/lib/creatures/species'
import type { SpeciesId } from '#/lib/creatures/species'
import {
  ANCHORS,
  ANCHOR_PARENT,
  PARTS,
  REQUIRED_PARTS,
  buildCreature,
  creatureParams,
  disposeCreature,
  inspectCreature,
} from './model'
import type { CreatureModel, CreatureStage } from './model'
import { CREATURE_MODELS, MODEL_FILES } from './models'

/**
 * The model test (T-0027 Done when 2 and 6): every model file in ./models is
 * built and checked against the style sheet's budget, parts and anchors.
 * One model only: `pnpm exec vitest run src/components/creatures/models.test.ts -t <id> --silent=false`
 */

/** Flip to true once all 20 model files exist (end of step A). */
const EXPECT_ALL_MODELS = false

const MODELS_DIR = join(process.cwd(), 'src', 'components', 'creatures', 'models')
const modelFiles = readdirSync(MODELS_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts' && !f.endsWith('.test.ts'))
const ids = modelFiles.map((f) => f.replace(/\.ts$/, ''))

const pascal = (id: string) => id.replace(/(^|-)([a-z])/g, (_, __, c: string) => c.toUpperCase())
const camel = (id: string) => pascal(id).replace(/^./, (c) => c.toLowerCase())

function partOf(o: THREE.Object3D): string {
  let p = o.parent
  while (p && !p.name.startsWith('part:') && p.parent) p = p.parent
  return p && p.name.startsWith('part:') ? p.name : 'root'
}

function checkPartsAndAnchors(g: THREE.Object3D) {
  for (const part of REQUIRED_PARTS) expect(g.getObjectByName(part), part).toBeDefined()
  g.traverse((o) => {
    if (o.name.startsWith('part:')) expect(PARTS as readonly string[], `unknown part ${o.name}`).toContain(o.name)
  })
  expect(g.getObjectByName('part:eyes')!.parent?.name, 'part:eyes sits in part:head').toBe('part:head')
  for (const name of ANCHORS) {
    const a = g.getObjectByName(name)
    expect(a, `anchor ${name}`).toBeDefined()
    expect(a!.userData.size, `anchor ${name} size`).toBeGreaterThan(0)
    expect(partOf(a!), `anchor ${name} belongs in ${ANCHOR_PARENT[name]}`).toBe(ANCHOR_PARENT[name])
  }
}


describe('creature model files', () => {
  it('are all found by the registry', () => {
    expect(Object.keys(MODEL_FILES).sort()).toEqual(modelFiles.map((f) => `./${f}`).sort())
  })

  it.skipIf(!EXPECT_ALL_MODELS)('has a model for every one of the 20 species', () => {
    expect(CREATURE_MODELS.map((m) => m.id)).toEqual(SPECIES.map((s) => s.id))
  })
})

describe.each(ids)('%s', (id) => {
  const model = () => CREATURE_MODELS.find((m) => m.id === id)!
  const source = readFileSync(join(MODELS_DIR, `${id}.ts`), 'utf8')
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

  it('is named after a species and exports build<Name> and <name>: CreatureModel', () => {
    const mod = MODEL_FILES[`./${id}.ts`]
    expect(isSpeciesId(id), `${id}.ts is not named after a species id`).toBe(true)
    expect(typeof mod[`build${pascal(id)}`], `exports build${pascal(id)}`).toBe('function')
    const exported = mod[camel(id)] as CreatureModel | undefined
    expect(exported?.id, `exports ${camel(id)} with id '${id}'`).toBe(id)
    expect(exported?.build).toBe(mod[`build${pascal(id)}`])
  })

  it('imports only three and ../model, and writes no colour or material of its own', () => {
    const imports = [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
    for (const from of imports) expect(['three', '../model'], `import from ${from}`).toContain(from)
    expect(code, 'colour literal').not.toMatch(/#[0-9a-fA-F]{3,8}\b|0x[0-9a-fA-F]{6}\b|\brgba?\(|\bhsla?\(/)
    expect(code, 'own colour').not.toMatch(/THREE\.Color\b|\.setHex\(|\.setRGB\(|\.setHSL\(|\.setStyle\(/)
    expect(code, 'own material').not.toMatch(/new\s+THREE\.\w*Material\b/)
    expect(code, 'reads p.stage').not.toMatch(/\.stage\b/)
    expect(code, 'merges by itself').not.toMatch(/mergeGeometries|BufferGeometryUtils/)
  })

  it('builds the raw grown-up: a THREE.Group of parts, at most 40 primitives, standing on y = 0', () => {
    const g = model().build(creatureParams(id as SpeciesId))
    expect(g).toBeInstanceOf(THREE.Group)
    const raw = inspectCreature(g)
    expect(raw.meshes, 'primitives before merging').toBeLessThanOrEqual(40)
    expect(Math.abs(raw.box.min.y), 'bottom at y = 0').toBeLessThanOrEqual(0.02)
    for (const child of g.children) {
      expect(child.name.startsWith('part:') || child.name === 'seat', `${child.name || child.type} on the root`).toBe(true)
    }
    checkPartsAndAnchors(g)
    disposeCreature(g)
  })

  it('fits the phone budget on high and low, with every part and anchor, about 1 unit tall', () => {
    const high = buildCreature(model())
    const low = buildCreature(model(), { quality: 'low' })
    const h = inspectCreature(high)
    const l = inspectCreature(low)
    const size = h.box.getSize(new THREE.Vector3())
    console.info(
      `model ${id}: ${h.triangles} / ${l.triangles} tris, ${h.drawCalls} / ${l.drawCalls} calls, ` +
        `${size.x.toFixed(2)} wide × ${size.y.toFixed(2)} tall × ${size.z.toFixed(2)} deep`,
    )
    expect(h.triangles, 'triangles on high').toBeLessThanOrEqual(3000)
    expect(l.triangles, 'triangles on low').toBeLessThanOrEqual(1500)
    expect(h.drawCalls, 'draw calls on high').toBeLessThanOrEqual(12)
    expect(l.drawCalls, 'draw calls on low').toBeLessThanOrEqual(12)
    expect(Math.abs(h.box.min.y), 'stands on y = 0').toBeLessThan(1e-4)
    expect(size.y, 'height').toBeGreaterThanOrEqual(0.95)
    expect(size.y, 'height').toBeLessThanOrEqual(1.15)
    expect(size.x, 'width').toBeLessThanOrEqual(1.1)
    expect(size.z, 'depth').toBeLessThanOrEqual(0.8)
    checkPartsAndAnchors(high)
    checkPartsAndAnchors(low)
    disposeCreature(high)
    disposeCreature(low)
  })

  it('builds as a shiny and at every stage', () => {
    const shiny = buildCreature(model(), { palette: speciesById(id as SpeciesId).shinyPalette })
    const bodyMesh = shiny.getObjectByName('mesh:body:matte') as THREE.Mesh
    const plain = buildCreature(model())
    const plainBody = plain.getObjectByName('mesh:body:matte') as THREE.Mesh
    expect(bodyMesh.geometry.attributes.color.array).not.toEqual(plainBody.geometry.attributes.color.array)
    const heights = (['baby', 'young', 'grown'] as CreatureStage[]).map((stage) => {
      const g = buildCreature(model(), { stage })
      const box = inspectCreature(g).box
      expect(Math.abs(box.min.y), `${stage} stands on y = 0`).toBeLessThan(1e-4)
      disposeCreature(g)
      return box.max.y
    })
    expect(heights[0]).toBeLessThan(heights[2] + 0.05)
    disposeCreature(shiny)
    disposeCreature(plain)
  })
})
