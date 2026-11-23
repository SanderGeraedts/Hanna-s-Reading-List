/**
 * Emperor penguin (T-0027 Design §8.13): the tall penguin.
 *
 * Primitives (20): pear body, white front, pale-yellow chest wash, 2 feet;
 * head, 2 golden ear patches, beak, beak stripe, 2 blush; 2 eyes + 2 glints;
 * 2 flippers; tail stub.
 * Tagged `foot`: the feet. No `detail`, no `extra`, no `satin`.
 * Triangles: 2,476 on high, 1,160 on low; 8 draw calls after the merge
 * (body, head, head beak, head blush, eyes, flipper L, flipper R, tail).
 * Taller than the family's usual head top (1.07): it is the tall one of the
 * three penguins; the head is smaller and sits higher, so its part pivots
 * (head, flippers) are higher than §5's.
 */
import * as THREE from 'three'
import { anchor, capsule, cone, creatureMaterials, front, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

type Vec3 = [number, number, number]

export function buildEmperorPenguin(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'emperor-penguin'

  // ---- body: tall pear, dark back, white front from the chin down ----------------------
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0.032, 0], [0, 0, 0], [0.95, 1.18, 0.9]))
  const bc: Vec3 = [0, 0.04, 0.15]
  const br: Vec3 = [0.24 * 0.9, 0.24 * 1.3, 0.24 * 0.52]
  body.add(mesh(sphere(0.24, 'L', q), m.belly, bc, [0, 0, 0], [0.9, 1.3, 0.52]))
  // pale-yellow wash on the upper chest, up to the ear patches
  body.add(mesh(sphere(0.15, 'M', q), m.accent2, [0, 0.21, front(bc, br, 0, 0.21) - 0.03], [-0.255, 0, 0], [1, 0.67, 0.33]))
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.11, 'M', q), m.body, [s * 0.15, -0.245, 0.2], [0, 0, 0], [1, 0.58, 1.35])
    foot.userData.stageRole = 'foot'
    body.add(foot)
  }
  const neck = anchor('neck', 0.15)
  neck.position.set(0, 0.35, 0)
  body.add(neck)
  const back = anchor('back', 0.46)
  back.position.set(0, 0.05, -0.262)
  back.rotation.y = Math.PI
  body.add(back)
  root.add(body)

  // ---- head: smaller, dark, high on the body (pivot 0, 0.66, 0.02) ----------------------
  const head = group('part:head', [0, 0.66, 0.02])
  const hc: Vec3 = [0, 0.185, 0]
  const hr: Vec3 = [0.235 * 1.05, 0.235 * 0.98, 0.235 * 0.95]
  head.add(mesh(sphere(0.235, 'L', q), m.body, hc, [0, 0, 0], [1.05, 0.98, 0.95]))
  // golden ear patches behind and below the eyes, running down into the neck
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.115, 'S', q), m.accent, [s * 0.13, 0.1, 0.03], [0, 0, 0], [1, 1.05, 1]))
  }
  // long slim beak, tilted a little down, with the orange stripe along its lower edge
  head.add(mesh(cone(0.04, 0.17, q), m.nose, [0, 0.15, 0.27], [Math.PI / 2 + 0.16, 0, 0]))
  head.add(mesh(sphere(0.018, 'XS', q), m.accent, [0, 0.133, 0.255], [0.16, 0, 0], [1.75, 0.7, 3.2]))
  for (const s of [-1, 1]) {
    const z = front(hc, hr, s * 0.15, 0.14)
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.15, 0.14, z + 0.004], [0, s * 0.7, 0], [1, 0.7, 0.3]))
  }
  // eyes: same on all 20, a little closer on the smaller head
  const eyeY = 0.205
  const eyes = group('part:eyes', [0, eyeY, 0])
  for (const s of [-1, 1]) {
    const z = front(hc, hr, s * 0.1, eyeY) - 0.012
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.1, 0, z]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.112, 0.014, z + 0.03]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.235)
  headAnchor.position.set(...hc)
  const hat = anchor('hat', 0.3)
  hat.position.set(0, hc[1] + hr[1], 0)
  const face = anchor('face', 0.28)
  face.position.set(0, eyeY, front(hc, hr, 0, eyeY))
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- flippers: down along the sides, 15 degrees out ----------------------------------
  for (const s of [-1, 1]) {
    const arm = group(s > 0 ? 'part:armL' : 'part:armR', [s * 0.245, 0.51, 0])
    const limb = group('limb', [0, 0, 0], [0, 0, s * 0.26])
    limb.add(mesh(capsule(0.07, 0.2, q), m.body, [0, -0.15, 0], [0, 0, 0], [0.42, 1, 0.95]))
    if (s < 0) {
      const paw = anchor('paw', 0.05)
      paw.position.set(0, -0.31, 0)
      limb.add(paw)
    }
    arm.add(limb)
    root.add(arm)
  }

  // ---- tail: a short stub on the floor behind ------------------------------------------
  const tail = group('part:tail', [0, 0.06, -0.22])
  tail.add(mesh(sphere(0.07, 'M', q), m.body, [0, -0.02, -0.03], [0, 0, 0], [1, 0.5, 1.3]))
  root.add(tail)

  // ---- seat ---------------------------------------------------------------------------
  root.add(anchor('seat', 0.55))
  return root
}

export const emperorPenguin: CreatureModel = { id: 'emperor-penguin', build: buildEmperorPenguin }
