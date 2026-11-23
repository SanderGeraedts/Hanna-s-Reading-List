/**
 * Koala (T-0027 Design §8.9): the shelf's koala decoration made big.
 *
 * Primitives (18): body, tummy, 2 feet; head, 2 ears + 2 inner ears, nose,
 * 2 blush; 2 eyes + 2 glints; 2 arms.
 * Tagged `detail`: nothing (the cream ear insides are part of the look).
 * Tagged `foot`: the feet. No `extra` meshes, no `satin`, no tail.
 * Triangles: 2,344 on high, 1,144 on low; 7 draw calls after the merge
 * (body, head, head nose, head blush, eyes, arm L, arm R).
 */
import * as THREE from 'three'
import { anchor, capsule, creatureMaterials, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildKoala(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'koala'

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
  // huge round fluffy ears on the upper sides, cream inside
  for (const s of [-1, 1]) {
    const ear = group('ear', [s * 0.24, 0.275, -0.005], [0, s * 0.15, 0])
    ear.add(mesh(sphere(0.135, 'M', q), m.body, [0, 0, 0], [0, 0, 0], [1, 1, 0.5]))
    ear.add(mesh(sphere(0.092, 'S', q), m.accent, [0, -0.006, 0.045], [0, 0, 0], [1, 1, 0.4]))
    head.add(ear)
  }
  // the big dark oval nose between and below the eyes
  head.add(mesh(sphere(0.085, 'M', q), m.nose, [0, 0.058, 0.243], [0, 0, 0], [0.8, 1.2, 0.7]))
  // blush
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.17, 0.06, 0.215], [0, s * 0.6, 0], [1, 0.7, 0.3]))
  }
  // eyes: same on all 20
  const eyes = group('part:eyes', [0, 0.12, 0])
  for (const s of [-1, 1]) {
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.105, 0, 0.236]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.117, 0.014, 0.266]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.27)
  headAnchor.position.set(0, 0.1, 0.01)
  const hat = anchor('hat', 0.26)
  hat.position.set(0, 0.365, 0.01)
  const face = anchor('face', 0.29)
  face.position.set(0, 0.12, 0.25)
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- arms: pivot at the shoulders, hugging the tummy --------------------------------
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

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.58))
  return root
}

export const koala: CreatureModel = { id: 'koala', build: buildKoala }
