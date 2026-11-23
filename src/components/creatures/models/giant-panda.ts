/**
 * Giant panda (T-0027 Design §8.10).
 *
 * Primitives (20): body, tummy, shoulder band, 2 feet; head, 2 ears, 2 eye
 * patches, nose, 2 blush; 2 eyes + 2 glints; 2 arms; tail ball.
 * Tagged `detail`: nothing (every marking carries the panda).
 * Tagged `foot`: the feet. No `extra` meshes, no `satin`.
 * Triangles: 2,716 on high, 1,276 on low; 8 draw calls after the merge
 * (body, head, head nose, head blush, eyes, arm L, arm R, tail).
 */
import * as THREE from 'three'
import { anchor, capsule, creatureMaterials, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildGiantPanda(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'giant-panda'

  // ---- body: pivot at the body centre (0, 0.31, 0) -------------------------------------
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0, 0], [0, 0, 0], [1, 1.08, 0.88]))
  body.add(mesh(sphere(0.19, 'M', q), m.belly, [0, -0.03, 0.18], [0, 0, 0], [0.95, 1.05, 0.55]))
  // the black band over the shoulders: a flat ellipsoid just wider than the body there
  body.add(mesh(sphere(0.29, 'L', q), m.accent, [0, 0.15, 0], [0, 0, 0], [0.94, 0.42, 0.84]))
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.11, 'M', q), m.accent, [s * 0.17, -0.235, 0.2], [0, 0, 0], [1, 0.7, 1.35])
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
  // black round ears
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.088, 'M', q), m.accent, [s * 0.19, 0.33, -0.01], [0, 0, 0], [1, 1, 0.6]))
  }
  // black teardrop eye patches, tilted down and out; the eyes sit on them
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.06, 'S', q), m.accent, [s * 0.109, 0.107, 0.24], [0, s * 0.42, s * 0.5], [0.85, 1.2, 0.4]))
  }
  // small round nose
  head.add(mesh(sphere(0.032, 'S', q), m.nose, [0, 0.07, 0.262], [0, 0, 0], [1.2, 0.8, 0.7]))
  // blush, a touch lower and further out so it clears the patches
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.183, 0.045, 0.203], [0, s * 0.68, 0], [1, 0.7, 0.3]))
  }
  // eyes: same on all 20, pushed out a little so they sit on top of the patches
  const eyes = group('part:eyes', [0, 0.12, 0])
  for (const s of [-1, 1]) {
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.105, 0, 0.248]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.117, 0.014, 0.278]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.27)
  headAnchor.position.set(0, 0.1, 0.01)
  const hat = anchor('hat', 0.2)
  hat.position.set(0, 0.365, 0.01)
  const face = anchor('face', 0.29)
  face.position.set(0, 0.12, 0.26)
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- arms: black, pivot at the shoulders, resting on the tummy -----------------------
  for (const s of [-1, 1]) {
    const arm = group(s > 0 ? 'part:armL' : 'part:armR', [s * 0.21, 0.42, 0.13])
    const limb = group('limb', [-s * 0.01, -0.06, 0.03], [-0.9, 0, s * 0.75])
    limb.add(mesh(capsule(0.075, 0.18, q), m.accent))
    if (s < 0) {
      const paw = anchor('paw', 0.075)
      paw.position.set(0, -0.165, 0)
      limb.add(paw)
    }
    arm.add(limb)
    root.add(arm)
  }

  // ---- tail: a tiny white ball low on the back -----------------------------------------
  const tail = group('part:tail', [0, 0.11, -0.25])
  tail.add(mesh(sphere(0.055, 'S', q), m.body, [0, 0, -0.01]))
  root.add(tail)

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.58))
  return root
}

export const giantPanda: CreatureModel = { id: 'giant-panda', build: buildGiantPanda }
