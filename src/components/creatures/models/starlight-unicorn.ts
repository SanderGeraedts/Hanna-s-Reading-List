/**
 * Starlight unicorn (T-0027 Design §8.20): a pearl plush pony with a spiral gold horn.
 *
 * Primitives (29): body, tummy, 2 gold hooves (the feet), flank star (a flat
 * 10-point shape); head, muzzle, 2 ears, horn + 3 spiral rings,
 * 4 mane tufts, 2 blush; 2 eyes + 2 glints; 2 arms; tail: 2 tufts.
 * Tagged `detail` (dropped on low): the star, the middle horn ring.
 * Tagged `extra`: horn, rings, mane tufts, tail tufts. Tagged `foot`: the hooves.
 * Tagged `satin`: hooves and star (body), horn and rings (head).
 * Triangles: 2,864 on high, 1,288 on low; 9 draw calls after the merge
 * (body, body satin, head, head blush, head satin, eyes, arm L, arm R, tail).
 */
import * as THREE from 'three'
import { anchor, capsule, cone, creatureMaterials, group, mesh, sphere, torus } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

/** A flat five-pointed star in the xy plane, facing +z. */
function star(outer: number, inner: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = Math.PI / 2 + (i * Math.PI) / 5
    if (i === 0) shape.moveTo(r * Math.cos(a), r * Math.sin(a))
    else shape.lineTo(r * Math.cos(a), r * Math.sin(a))
  }
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

export function buildStarlightUnicorn(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'starlight-unicorn'

  // ---- body: pivot at the body centre (0, 0.31, 0) -------------------------------------
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0, 0], [0, 0, 0], [1, 1.08, 0.88]))
  body.add(mesh(sphere(0.19, 'M', q), m.belly, [0, -0.02, 0.18], [0, 0, 0], [0.95, 1.15, 0.55]))
  // gold hooves as the feet
  for (const s of [-1, 1]) {
    const hoof = mesh(sphere(0.11, 'M', q), m.accent, [s * 0.17, -0.235, 0.2], [0, 0, 0], [1, 0.7, 1.35])
    hoof.userData.stageRole = 'foot'
    hoof.userData.satin = true
    body.add(hoof)
  }
  // one small gold star on its left flank
  const flankStar = mesh(star(0.055, 0.024), m.accent, [0.243, -0.07, 0.151], [0, 0.9, 0])
  flankStar.userData.detail = true
  flankStar.userData.satin = true
  body.add(flankStar)
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
  // a longer, soft pony muzzle (no nostrils: the nose slot is unused, like the axolotl's)
  head.add(mesh(sphere(0.12, 'M', q), m.body, [0, 0.035, 0.2], [0, 0, 0], [0.95, 0.8, 1.05]))
  // small pointed ears
  for (const s of [-1, 1]) {
    head.add(mesh(cone(0.06, 0.15, q, 4), m.body, [s * 0.185, 0.33, -0.02], [0, Math.PI / 4, -s * 0.4]))
  }
  // the horn: a gold cone on the forehead with three rings winding up it
  const horn = group('horn', [0, 0.33, 0.1], [0.3, 0, 0])
  const hornMeshes = [mesh(cone(0.045, 0.23, q), m.accent, [0, 0.115, 0])]
  for (const [i, t] of [0.045, 0.105, 0.16].entries()) {
    const r = 0.045 * (1 - t / 0.23)
    const ring = mesh(torus(r, 0.011 - i * 0.002, q), m.accent, [0, t, 0], [Math.PI / 2 + 0.28, 0, 0])
    if (i === 1) ring.userData.detail = true
    hornMeshes.push(ring)
  }
  for (const h of hornMeshes) {
    h.userData.stageRole = 'extra'
    h.userData.satin = true
    horn.add(h)
  }
  head.add(horn)
  // lavender mane: four round tufts from the crown down its left side (+x, the tail side), so it shows from the front
  for (const [x, y, z, r] of [
    [0.17, 0.32, -0.08, 0.085],
    [0.24, 0.22, -0.13, 0.09],
    [0.27, 0.09, -0.14, 0.085],
    [0.24, -0.03, -0.12, 0.075],
  ]) {
    const tuft = mesh(sphere(r, 'S', q), m.accent2, [x, y, z])
    tuft.userData.stageRole = 'extra'
    head.add(tuft)
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
  const hat = anchor('hat', 0.22)
  hat.position.set(0, 0.348, -0.08)
  hat.rotation.x = -0.35
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

  // ---- tail: two lavender tufts from the lower back out to the +x side -----------------
  const tail = group('part:tail', [0.08, 0.13, -0.22])
  for (const [x, y, z, r] of [
    [0.09, 0, -0.02, 0.1],
    [0.22, 0.07, 0.05, 0.08],
  ]) {
    const tuft = mesh(sphere(r, 'S', q), m.accent2, [x, y, z])
    tuft.userData.stageRole = 'extra'
    tail.add(tuft)
  }
  root.add(tail)

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.58))
  return root
}

export const starlightUnicorn: CreatureModel = { id: 'starlight-unicorn', build: buildStarlightUnicorn }
