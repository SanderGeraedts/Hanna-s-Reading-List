/**
 * Red panda (T-0027 Design §8.12).
 *
 * Primitives (31): body, tummy, 2 feet; head, muzzle, 2 cheek patches, 2 brow
 * spots, 2 tear marks, 2 ears + 2 inner ears, nose, 2 blush; 2 eyes + 2 glints;
 * 2 arms; tail: 5 overlapping balls (rings in body / accent2, dark tip).
 * Tagged `detail` (dropped on low): brow spots, inner ears.
 * Tagged `foot`: the feet. No `extra` meshes, no `satin`.
 * Triangles: 2,932 on high, 1,444 on low; 8 draw calls after the merge
 * (body, head, head nose, head blush, eyes, arm L, arm R, tail).
 */
import * as THREE from 'three'
import { anchor, capsule, cone, creatureMaterials, front, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

type Vec3 = [number, number, number]

export function buildRedPanda(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'red-panda'

  // ---- body: pivot at the body centre (0, 0.31, 0); dark tummy and legs ----------------
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0, 0], [0, 0, 0], [1, 1.08, 0.88]))
  body.add(mesh(sphere(0.19, 'M', q), m.accent2, [0, -0.02, 0.18], [0, 0, 0], [0.95, 1.15, 0.55]))
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
  const hc: Vec3 = [0, 0.1, 0.01]
  const hr: Vec3 = [0.27 * 1.08, 0.27 * 0.98, 0.27 * 0.95]
  head.add(mesh(sphere(0.27, 'L', q), m.body, hc, [0, 0, 0], [1.08, 0.98, 0.95]))
  // big pointed ears set wide: cream outside (the rim), russet inside
  for (const s of [-1, 1]) {
    const ear = group('ear', [s * 0.21, 0.31, -0.01], [0, 0, -s * 0.55])
    ear.add(mesh(cone(0.11, 0.24, q, 4), m.belly, [0, 0, 0], [0, Math.PI / 4, 0]))
    const inner = mesh(cone(0.065, 0.14, q, 4), m.accent2, [0, -0.035, 0.036], [0, Math.PI / 4, 0], [1, 1, 0.6])
    inner.userData.detail = true
    ear.add(inner)
    head.add(ear)
  }
  // the cream face mask: muzzle, cheek patches, brow spots
  head.add(mesh(sphere(0.1, 'M', q), m.belly, [0, 0.04, 0.2], [0, 0, 0], [1.25, 0.85, 0.8]))
  for (const s of [-1, 1]) {
    const cz = front(hc, hr, s * 0.185, 0.05)
    head.add(mesh(sphere(0.07, 'XS', q), m.belly, [s * 0.185, 0.05, cz - 0.006], [0, s * 0.7, 0], [1, 0.9, 0.3]))
    const brow = mesh(
      sphere(0.035, 'XS', q),
      m.belly,
      [s * 0.105, 0.205, front(hc, hr, s * 0.105, 0.205) - 0.003],
      [-0.4, s * 0.3, 0],
      [1.1, 0.7, 0.3],
    )
    brow.userData.detail = true
    head.add(brow)
    // dark tear mark from the eye down to the cheek
    head.add(
      mesh(
        sphere(0.03, 'XS', q),
        m.accent,
        [s * 0.137, 0.045, front(hc, hr, s * 0.137, 0.045) + 0.004],
        [0, s * 0.45, s * 0.36],
        [0.6, 1.9, 0.4],
      ),
    )
  }
  head.add(mesh(sphere(0.032, 'S', q), m.nose, [0, 0.075, 0.283], [0, 0, 0], [1.2, 0.8, 0.8]))
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.185, 0.045, 0.214], [0, s * 0.7, 0], [1, 0.7, 0.3]))
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
  const hat = anchor('hat', 0.24)
  hat.position.set(0, 0.365, 0.01)
  const face = anchor('face', 0.29)
  face.position.set(0, 0.12, 0.25)
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- arms: dark, resting on the tummy ----------------------------------------------
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

  // ---- tail: long and fat, on the floor round to the +x side, ringed, dark tip ---------
  const pivot: Vec3 = [0.08, 0.11, -0.22]
  const tail = group('part:tail', pivot)
  const balls: [Vec3, number, THREE.Material][] = [
    [[0.15, 0.11, -0.265], 0.105, m.body],
    [[0.28, 0.11, -0.255], 0.105, m.accent2],
    [[0.41, 0.11, -0.175], 0.105, m.body],
    [[0.485, 0.115, -0.06], 0.1, m.accent2],
    [[0.5, 0.125, 0.06], 0.085, m.accent],
  ]
  for (const [at, r, material] of balls) {
    tail.add(mesh(sphere(r, 'M', q), material, [at[0] - pivot[0], at[1] - pivot[1], at[2] - pivot[2]]))
  }
  root.add(tail)

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.58))
  return root
}

export const redPanda: CreatureModel = { id: 'red-panda', build: buildRedPanda }
