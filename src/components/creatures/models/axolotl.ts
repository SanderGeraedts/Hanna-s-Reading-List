/**
 * Axolotl (T-0027 Design §8.16).
 *
 * Primitives (22): body, tummy, 2 feet; wide head, 6 gill fronds (3 a side,
 * fanning out and up), 2 blush; 2 eyes + 2 glints; 2 arms; tail: core and a
 * soft upright fin, lying behind and out to +x.
 * Tagged `extra`: the gill fronds. Tagged `foot`: the feet. No `detail`, no
 * `satin`. No ears and no nose (the nose slot is unused).
 * Triangles: 2,524 on high, 1,208 on low; 7 draw calls after the merge
 * (body, head, head blush, eyes, arm L, arm R, tail).
 */
import * as THREE from 'three'
import { anchor, capsule, creatureMaterials, front, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

type Vec3 = [number, number, number]

export function buildAxolotl(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'axolotl'

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

  // ---- head: wide and round, three gill fronds a side ----------------------------------
  const head = group('part:head', [0, 0.56, 0.02])
  const hc: Vec3 = [0, 0.1, 0.01]
  const hr: Vec3 = [0.27 * 1.2, 0.27 * 0.97, 0.27 * 0.95]
  head.add(mesh(sphere(0.27, 'L', q), m.body, hc, [0, 0, 0], [1.2, 0.97, 0.95]))
  const fronds: [number, number][] = [
    [0.26, 0.115], // [angle from straight up, distance of the frond's centre from the root]
    [0.87, 0.125],
    [1.48, 0.11],
  ]
  for (const s of [-1, 1]) {
    const gills = group('gills', [s * 0.25, 0.19, -0.04], [-0.12, 0, 0])
    for (const [angle, d] of fronds) {
      const frond = mesh(
        sphere(0.042, 'S', q),
        m.accent,
        [s * Math.sin(angle) * d, Math.cos(angle) * d, 0],
        [0, 0, -s * angle],
        [1, (d + 0.005) / 0.042, 0.85],
      )
      frond.userData.stageRole = 'extra'
      gills.add(frond)
    }
    head.add(gills)
  }
  for (const s of [-1, 1]) {
    const z = front(hc, hr, s * 0.2, 0.06)
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.2, 0.06, z + 0.005], [0, s * 0.65, 0], [1, 0.7, 0.3]))
  }
  // eyes: same on all 20, a touch wider on the wide head
  const eyeY = 0.12
  const eyes = group('part:eyes', [0, eyeY, 0])
  for (const s of [-1, 1]) {
    const z = front(hc, hr, s * 0.115, eyeY) - 0.013
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.115, 0, z]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.127, 0.014, z + 0.03]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.27)
  headAnchor.position.set(...hc)
  const hat = anchor('hat', 0.4)
  hat.position.set(0, hc[1] + hr[1], 0.01)
  const face = anchor('face', 0.31)
  face.position.set(0, eyeY, front(hc, hr, 0, eyeY))
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- arms: resting on the tummy -----------------------------------------------------
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

  // ---- tail: on the floor behind, out to +x, with a soft upright fin -------------------
  const tail = group('part:tail', [0.1, 0.09, -0.18])
  const sweep = group('tail-sweep', [0.12, 0, -0.06], [0, 2.18, 0])
  sweep.add(mesh(sphere(0.09, 'M', q), m.body, [0, 0, 0], [0, 0, 0], [0.75, 0.8, 2.3]))
  sweep.add(mesh(sphere(0.09, 'M', q), m.belly, [0, 0.05, 0.02], [0, 0, 0], [0.22, 1.5, 2.4]))
  tail.add(sweep)
  root.add(tail)

  // ---- seat ---------------------------------------------------------------------------
  root.add(anchor('seat', 0.58))
  return root
}

export const axolotl: CreatureModel = { id: 'axolotl', build: buildAxolotl }
