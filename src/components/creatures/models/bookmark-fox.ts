/**
 * Bookmark fox (T-0027 Design §8.19): a cream paper fox with three ribbon bookmarks for a tail.
 *
 * Primitives (28): body, tummy, 2 feet; head, 2 ears + 2 gold inner ears, snout,
 * nose, 2 cheek tufts, 2 blush; 2 eyes + 2 glints; 2 arms; tail: 3 ribbons of a
 * strip and a V-notched end each (the end is a 5-point extruded shape).
 * Tagged `detail` (dropped on low): the cheek tufts.
 * Tagged `extra`: the six ribbon meshes. Tagged `foot`: the feet.
 * Tagged `satin`: the ribbons (tail) and the gold inner ears (head).
 * Triangles: about 2,000 on high, 960 on low; 9 draw calls after the merge
 * (body, head, head nose, head blush, head satin, eyes, arm L, arm R, tail satin).
 */
import * as THREE from 'three'
import { anchor, capsule, cone, creatureMaterials, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

const RIBBON_WIDTH = 0.07
const RIBBON_THICKNESS = 0.014

/** A flat ribbon end along +y with a V notch cut into its tip. */
function ribbonEnd(length: number): THREE.ExtrudeGeometry {
  const w = RIBBON_WIDTH / 2
  const shape = new THREE.Shape()
  shape.moveTo(-w, -0.02)
  shape.lineTo(w, -0.02)
  shape.lineTo(w, length)
  shape.lineTo(0, length - 0.05)
  shape.lineTo(-w, length)
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: RIBBON_THICKNESS, bevelEnabled: false, steps: 1 })
  g.translate(0, 0, -RIBBON_THICKNESS / 2)
  return g
}

export function buildBookmarkFox(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'bookmark-fox'

  // ---- body: pivot at the body centre (0, 0.31, 0) -------------------------------------
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0, 0], [0, 0, 0], [1, 1.08, 0.88]))
  body.add(mesh(sphere(0.19, 'M', q), m.belly, [0, -0.02, 0.18], [0, 0, 0], [0.95, 1.15, 0.55]))
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.11, 'M', q), m.body, [s * 0.17, -0.235, 0.2], [0, 0, 0], [1, 0.7, 1.35])
    foot.userData.stageRole = 'foot'
    body.add(foot)
  }
  const neck = anchor('neck', 0.18)
  neck.position.set(0, 0.25, 0)
  body.add(neck)
  const back = anchor('back', 0.48)
  back.position.set(0, 0.05, -0.255)
  back.rotation.y = Math.PI
  body.add(back)
  root.add(body)

  // ---- head: pivot where head meets body (0, 0.56, 0.02) -------------------------------
  const head = group('part:head', [0, 0.56, 0.02])
  head.add(mesh(sphere(0.27, 'L', q), m.body, [0, 0.1, 0.01], [0, 0, 0], [1.08, 0.98, 0.95]))
  // big fox ears: 4-sided cones, a flat side to the front, gold inside
  for (const s of [-1, 1]) {
    const ear = group('ear', [s * 0.165, 0.35, -0.02], [0, 0, -s * 0.3])
    ear.add(mesh(cone(0.11, 0.25, q, 4), m.body, [0, 0, 0], [0, Math.PI / 4, 0]))
    const inner = mesh(cone(0.068, 0.16, q, 4), m.accent2, [0, -0.03, 0.036], [0, Math.PI / 4, 0], [1, 1, 0.6])
    inner.userData.satin = true
    ear.add(inner)
    head.add(ear)
  }
  // pointed fox snout with a round nose on its tip
  head.add(mesh(cone(0.09, 0.17, q), m.belly, [0, 0.055, 0.265], [Math.PI / 2, 0, 0], [1, 1, 0.85]))
  head.add(mesh(sphere(0.03, 'S', q), m.nose, [0, 0.06, 0.34]))
  // cheek tufts, folded like paper corners
  for (const s of [-1, 1]) {
    const cheek = mesh(cone(0.06, 0.12, q, 4), m.belly, [s * 0.28, 0.02, 0.03], [0, 0, -s * 1.9], [1, 1, 0.5])
    cheek.userData.detail = true
    head.add(cheek)
  }
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.17, 0.06, 0.215], [0, s * 0.6, 0], [1, 0.7, 0.3]))
  }
  const eyes = group('part:eyes', [0, 0.12, 0])
  for (const s of [-1, 1]) {
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.105, 0, 0.236]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.117, 0.014, 0.266]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.27)
  headAnchor.position.set(0, 0.1, 0.01)
  const hat = anchor('hat', 0.18)
  hat.position.set(0, 0.365, 0.01)
  const face = anchor('face', 0.29)
  face.position.set(0, 0.12, 0.25)
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- arms: pivot at the shoulders, resting on the tummy -----------------------------
  for (const s of [-1, 1]) {
    const arm = group(s > 0 ? 'part:armL' : 'part:armR', [s * 0.21, 0.42, 0.13])
    const limb = group('limb', [-s * 0.01, -0.06, 0.03], [-0.9, 0, s * 0.75])
    limb.add(mesh(capsule(0.075, 0.18, q), m.body))
    if (s < 0) {
      const paw = anchor('paw', 0.075)
      paw.position.set(0, -0.165, 0)
      limb.add(paw)
    }
    arm.add(limb)
    root.add(arm)
  }

  // ---- tail: three ribbon bookmarks fanning up and back, red – gold – red --------------
  // each: [fan round z, strip length, end length, bend of the end, which ribbon colour]
  const tail = group('part:tail', [0, 0.12, -0.25])
  const ribbons: [number, number, number, number, THREE.Material][] = [
    [0.7, 0.36, 0.24, 0.45, m.accent],
    [0, 0.6, 0.36, -0.22, m.accent2],
    [-0.7, 0.36, 0.24, -0.45, m.accent],
  ]
  for (const [fan, stripLength, endLength, bend, material] of ribbons) {
    const ribbon = group('ribbon', [0, 0, 0], [-0.12, 0, fan])
    const strip = mesh(
      new THREE.BoxGeometry(RIBBON_WIDTH, stripLength, RIBBON_THICKNESS),
      material,
      [0, stripLength / 2, 0],
    )
    const tip = group('ribbon-end', [0, stripLength, 0], [0, 0, bend])
    const end = mesh(ribbonEnd(endLength), material)
    tip.add(end)
    ribbon.add(strip, tip)
    for (const part of [strip, end]) {
      part.userData.stageRole = 'extra'
      part.userData.satin = true
    }
    tail.add(ribbon)
  }
  root.add(tail)

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.58))
  return root
}

export const bookmarkFox: CreatureModel = { id: 'bookmark-fox', build: buildBookmarkFox }
