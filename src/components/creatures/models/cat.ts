/**
 * House cat (T-0027 Design §8.1): the example model every other file follows.
 *
 * Primitives (28): body, tummy, 2 feet, 3 back stripes; head, 2 ears + 2 inner
 * ears, nose, 3 forehead stripes, 2 blush; 2 eyes + 2 glints; 2 arms; tail:
 * 2 segments, tip ball, tip ring.
 * Tagged `detail` (dropped on low): back stripes, inner ears, tail ring.
 * Tagged `foot`: the feet. No `extra` meshes, no `satin`.
 * Triangles: 2,638 on high, 1,154 on low; 8 draw calls after the merge
 * (body, head, head nose, head blush, eyes, arm L, arm R, tail).
 */
import * as THREE from 'three'
import { anchor, capsule, cone, creatureMaterials, group, mesh, orientBetween, sphere, torus } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildCat(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'cat'

  // ---- body: pivot at the body centre (0, 0.31, 0) -------------------------------------
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0, 0], [0, 0, 0], [1, 1.08, 0.88]))
  body.add(mesh(sphere(0.19, 'M', q), m.belly, [0, -0.02, 0.18], [0, 0, 0], [0.95, 1.15, 0.55]))
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.11, 'M', q), m.body, [s * 0.17, -0.235, 0.2], [0, 0, 0], [1, 0.7, 1.35])
    foot.userData.stageRole = 'foot'
    body.add(foot)
  }
  // three tabby stripes across the back
  for (const [i, y] of [0.13, 0.05, -0.03].entries()) {
    const stripe = mesh(sphere(0.06, 'XS', q), m.accent, [0, y, -0.245], [0.1 * (i - 1), 0, 0], [1.7, 0.32, 0.35])
    stripe.userData.detail = true
    body.add(stripe)
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
  // upright pointed ears: 4-sided cones, a flat side to the front, pink inside
  for (const s of [-1, 1]) {
    const ear = group('ear', [s * 0.15, 0.34, -0.02], [0, 0, -s * 0.3])
    ear.add(mesh(cone(0.09, 0.2, q, 4), m.body, [0, 0, 0], [0, Math.PI / 4, 0]))
    const inner = mesh(cone(0.055, 0.12, q, 4), m.accent2, [0, -0.025, 0.03], [0, Math.PI / 4, 0], [1, 1, 0.6])
    inner.userData.detail = true
    ear.add(inner)
    head.add(ear)
  }
  // small pink triangle nose, tip down
  head.add(mesh(cone(0.035, 0.03, q, 3), m.nose, [0, 0.08, 0.265], [Math.PI, 0, 0], [1, 1, 0.6]))
  // three short stripes on the forehead
  head.add(mesh(sphere(0.03, 'XS', q), m.accent, [0, 0.285, 0.195], [-0.75, 0, 0], [0.7, 1.8, 0.5]))
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.026, 'XS', q), m.accent, [s * 0.065, 0.272, 0.19], [-0.75, 0, s * 0.3], [0.7, 1.6, 0.5]))
  }
  // blush
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.17, 0.06, 0.215], [0, s * 0.6, 0], [1, 0.7, 0.3]))
  }
  // eyes: same on all 20, at y 0.68, x ±0.105, slightly sunk into the face
  const eyes = group('part:eyes', [0, 0.12, 0])
  for (const s of [-1, 1]) {
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.105, 0, 0.236]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.117, 0.014, 0.266]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.27)
  headAnchor.position.set(0, 0.1, 0.01)
  const hat = anchor('hat', 0.2)
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

  // ---- tail: from the lower back round to the +x side, curling up, ringed tip ----------
  const tail = group('part:tail', [0.1, 0.1, -0.22])
  const base = group('tail-base')
  const baseLength = orientBetween(base, [0, 0, 0], [0.22, -0.04, 0.12])
  base.add(mesh(capsule(0.045, baseLength, q), m.body))
  tail.add(base)
  const up = group('tail-up')
  const upLength = orientBetween(up, [0.22, -0.04, 0.12], [0.26, 0.24, 0.2])
  up.add(mesh(capsule(0.045, upLength, q), m.body))
  up.add(mesh(sphere(0.055, 'M', q), m.accent, [0, upLength / 2 + 0.01, 0]))
  const ring = mesh(torus(0.047, 0.016, q), m.accent, [0, upLength / 2 - 0.07, 0], [Math.PI / 2, 0, 0])
  ring.userData.detail = true
  up.add(ring)
  tail.add(up)
  root.add(tail)

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.58))
  return root
}

export const cat: CreatureModel = { id: 'cat', build: buildCat }
