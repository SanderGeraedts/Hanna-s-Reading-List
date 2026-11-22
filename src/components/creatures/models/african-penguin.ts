/**
 * African penguin (T-0027 Design §8.15): the middle-sized, slimmer penguin.
 *
 * Primitives (22): body, white front, horseshoe chest band, 3 chest spots,
 * 2 feet; head, white face stripe (one band arching over the eyes and down the
 * cheeks to the chest), 2 pink patches above the eyes, beak, 2 blush;
 * 2 eyes + 2 glints; 2 flippers; tail stub.
 * Tagged `detail` (dropped on low): chest spots. Tagged `foot`: the feet.
 * No `extra`, no `satin`.
 * Triangles: 2,608 on high, 1,156 on low; 8 draw calls after the merge
 * (body, head, head beak, head blush, eyes, flipper L, flipper R, tail).
 */
import * as THREE from 'three'
import { anchor, capsule, cone, creatureMaterials, front, group, mesh, sphere, torus } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

type Vec3 = [number, number, number]

export function buildAfricanPenguin(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'african-penguin'

  // ---- body: slim egg, dark back; white front with the black horseshoe band ------------
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0.009, 0], [0, 0, 0], [0.94, 1.1, 0.88]))
  const bc: Vec3 = [0, 0.005, 0.15]
  const br: Vec3 = [0.23 * 0.93, 0.23 * 1.22, 0.23 * 0.54]
  body.add(mesh(sphere(0.23, 'L', q), m.belly, bc, [0, 0, 0], [0.93, 1.22, 0.54]))
  // the band: an upside-down U across the chest and down both flanks
  body.add(
    mesh(torus(0.155, 0.017, q, Math.PI * 1.2), m.accent, [0, -0.01, 0.234], [0, 0, -Math.PI * 0.1], [1, 1, 1.6]),
  )
  for (const [x, y] of [
    [-0.07, -0.11],
    [0.08, -0.13],
    [0.01, -0.16],
  ]) {
    const spot = mesh(sphere(0.015, 'XS', q), m.accent, [x, y, front(bc, br, x, y)], [0, 0, 0], [1, 1, 0.5])
    spot.userData.detail = true
    body.add(spot)
  }
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.11, 'M', q), m.body, [s * 0.15, -0.24, 0.2], [0, 0, 0], [1, 0.6, 1.35])
    foot.userData.stageRole = 'foot'
    body.add(foot)
  }
  const neck = anchor('neck', 0.17)
  neck.position.set(0, 0.24, 0)
  body.add(neck)
  const back = anchor('back', 0.46)
  back.position.set(0, 0.05, -0.257)
  back.rotation.y = Math.PI
  body.add(back)
  root.add(body)

  // ---- head: dark, with the white stripes (pivot 0, 0.56, 0.02) -------------------------
  const head = group('part:head', [0, 0.56, 0.02])
  const hc: Vec3 = [0, 0.17, 0]
  const hr: Vec3 = [0.25 * 1.06, 0.25 * 0.98, 0.25 * 0.95]
  head.add(mesh(sphere(0.25, 'L', q), m.body, hc, [0, 0, 0], [1.06, 0.98, 0.95]))
  const eyeY = 0.19
  // the white stripe: a band arching over both eyes and down the cheeks to the chest,
  // open at the chin; it lies on the head like a circle of latitude round the face
  const stripe = group('stripe', [0, 0.15, 0.183], [0.1, 0, 0])
  stripe.scale.set(1, 0.92, 1)
  stripe.add(mesh(torus(0.165, 0.025, q, Math.PI * 1.4), m.belly, [0, 0, 0], [0, 0, -Math.PI * 0.2]))
  head.add(stripe)
  // pink patch above each eye
  for (const s of [-1, 1]) {
    const z = front(hc, hr, s * 0.085, 0.25)
    head.add(mesh(sphere(0.028, 'XS', q), m.accent2, [s * 0.085, 0.25, z], [-0.3, s * 0.3, s * 0.15], [1.3, 0.6, 0.4]))
  }
  // short stout beak
  head.add(mesh(cone(0.045, 0.12, q), m.nose, [0, 0.145, 0.275], [Math.PI / 2 + 0.1, 0, 0]))
  for (const s of [-1, 1]) {
    const z = front(hc, hr, s * 0.14, 0.1)
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.14, 0.1, z + 0.006], [0, s * 0.75, 0], [1, 0.7, 0.3]))
  }
  // eyes: same on all 20
  const eyes = group('part:eyes', [0, eyeY, 0])
  for (const s of [-1, 1]) {
    const z = front(hc, hr, s * 0.1, eyeY) - 0.012
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.1, 0, z]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.112, 0.014, z + 0.03]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.25)
  headAnchor.position.set(...hc)
  const hat = anchor('hat', 0.3)
  hat.position.set(0, hc[1] + hr[1], 0)
  const face = anchor('face', 0.28)
  face.position.set(0, eyeY, front(hc, hr, 0, eyeY))
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- flippers: down along the sides, 15 degrees out ----------------------------------
  for (const s of [-1, 1]) {
    const arm = group(s > 0 ? 'part:armL' : 'part:armR', [s * 0.24, 0.47, 0])
    const limb = group('limb', [0, 0, 0], [0, 0, s * 0.26])
    limb.add(mesh(capsule(0.065, 0.17, q), m.body, [0, -0.13, 0], [0, 0, 0], [0.42, 1, 0.95]))
    if (s < 0) {
      const paw = anchor('paw', 0.05)
      paw.position.set(0, -0.27, 0)
      limb.add(paw)
    }
    arm.add(limb)
    root.add(arm)
  }

  // ---- tail: a short stub on the floor behind ------------------------------------------
  const tail = group('part:tail', [0, 0.06, -0.21])
  tail.add(mesh(sphere(0.065, 'M', q), m.body, [0, -0.02, -0.03], [0, 0, 0], [1, 0.5, 1.3]))
  root.add(tail)

  // ---- seat ---------------------------------------------------------------------------
  root.add(anchor('seat', 0.54))
  return root
}

export const africanPenguin: CreatureModel = { id: 'african-penguin', build: buildAfricanPenguin }
