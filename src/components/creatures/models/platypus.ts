/**
 * Platypus (T-0027 Design §8.8).
 *
 * Primitives (18): body, tummy, 2 webbed feet; head, bill, 2 nostrils,
 * 2 blush; 2 eyes + 2 glints; 2 arms; paddle tail.
 * Tagged `detail` (dropped on low): the nostrils.
 * Tagged `foot`: the feet. No `extra` meshes, no `satin`.
 * Triangles: 2,116 on high, 992 on low; 8 draw calls after the merge
 * (body, head, head nose, head blush, eyes, arm L, arm R, tail), 7 on low.
 *
 * No ears, and the head is 10 % smaller, so the body is a little taller and
 * the head pivot and eyes sit 0.06 higher than the cat's to reach the family
 * height.
 */
import * as THREE from 'three'
import { anchor, capsule, creatureMaterials, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildPlatypus(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'platypus'

  // ---- body: pivot at the body centre (0, 0.31, 0); a wider, slightly taller barrel ----
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0.025, 0], [0, 0, 0], [1.12, 1.15, 0.9]))
  body.add(mesh(sphere(0.2, 'M', q), m.belly, [0, 0, 0.19], [0, 0, 0], [1, 1.2, 0.55]))
  // flat webbed feet, toes turned a little outward
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.12, 'M', q), m.accent, [s * 0.2, -0.254, 0.2], [0, s * 0.3, 0], [1.15, 0.45, 1.3])
    foot.userData.stageRole = 'foot'
    body.add(foot)
  }
  const neck = anchor('neck', 0.18)
  neck.position.set(0, 0.31, 0)
  body.add(neck)
  const back = anchor('back', 0.52)
  back.position.set(0, 0.08, -0.261)
  back.rotation.y = Math.PI
  body.add(back)
  root.add(body)

  // ---- head: 10 % smaller, no ears; pivot where head meets body (0, 0.62, 0.02) --------
  const head = group('part:head', [0, 0.62, 0.02])
  head.add(mesh(sphere(0.245, 'L', q), m.body, [0, 0.095, 0.01], [0, 0, 0], [1.08, 1, 0.95]))
  // the broad flat duck bill, sticking out 0.17 below the eyes
  head.add(mesh(sphere(0.13, 'M', q), m.accent, [0, 0.028, 0.28], [0.06, 0, 0], [1.3, 0.35, 1]))
  for (const s of [-1, 1]) {
    const nostril = mesh(sphere(0.012, 'XS', q), m.nose, [s * 0.035, 0.066, 0.335], [0, 0, 0], [1, 0.6, 1.3])
    nostril.userData.detail = true
    head.add(nostril)
  }
  // blush, just above the corners of the bill
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.178, 0.075, 0.184], [0, s * 0.68, 0], [1, 0.7, 0.3]))
  }
  // eyes: same on all 20
  const eyes = group('part:eyes', [0, 0.125, 0])
  for (const s of [-1, 1]) {
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.1, 0, 0.212]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.112, 0.014, 0.242]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.245)
  headAnchor.position.set(0, 0.095, 0.01)
  const hat = anchor('hat', 0.32)
  hat.position.set(0, 0.34, 0.01)
  const face = anchor('face', 0.28)
  face.position.set(0, 0.125, 0.226)
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- arms: pivot at the shoulders, resting on the tummy -----------------------------
  for (const s of [-1, 1]) {
    const arm = group(s > 0 ? 'part:armL' : 'part:armR', [s * 0.235, 0.46, 0.13])
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

  // ---- tail: a flat paddle on the floor, out behind and round to +x --------------------
  const tail = group('part:tail', [0.08, 0.045, -0.1])
  tail.add(mesh(sphere(0.14, 'M', q), m.body, [0.188, 0, -0.093], [0, 2.03, 0], [0.9, 0.3, 1.5]))
  root.add(tail)

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.65))
  return root
}

export const platypus: CreatureModel = { id: 'platypus', build: buildPlatypus }
