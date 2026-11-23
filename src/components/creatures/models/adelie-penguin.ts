/**
 * Adélie penguin (T-0027 Design §8.5): the small round penguin.
 *
 * Primitives (17): body, white front, 2 pink feet; head (all dark), 2 white
 * eye rings, short beak, 2 blush; 2 eyes + 2 glints; 2 flippers; stub tail.
 * Nothing tagged `detail`: the eye rings are what make it an Adélie, so they
 * stay on low. Tagged `foot`: the feet. No `extra` meshes, no `satin`.
 * Triangles: 2,296 on high, 1,036 on low; 8 draw calls after the merge
 * (body, head, head beak, head blush, eyes, arm L, arm R, tail).
 * No ears, so the head itself reaches 0.96 to keep the family height.
 */
import * as THREE from 'three'
import { anchor, capsule, creatureMaterials, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildAdeliePenguin(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'adelie-penguin'

  // ---- body: a round egg [1, 1.12, 0.9], pivot at its centre ---------------------------
  const body = group('part:body', [0, 0.336, 0])
  body.add(mesh(sphere(0.3, 'L', q), m.body, [0, 0, 0], [0, 0, 0], [1, 1.12, 0.9]))
  // white front from the chin down
  body.add(mesh(sphere(0.24, 'L', q), m.belly, [0, -0.02, 0.12], [0, 0, 0], [0.95, 1.15, 0.77]))
  // flat pink feet
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.11, 'M', q), m.accent2, [s * 0.15, -0.286, 0.17], [0, s * 0.25, 0], [1.1, 0.45, 1.4])
    foot.userData.stageRole = 'foot'
    body.add(foot)
  }
  const neck = anchor('neck', 0.2)
  neck.position.set(0, 0.244, 0)
  body.add(neck)
  const back = anchor('back', 0.5)
  back.position.set(0, 0.03, -0.27)
  back.rotation.y = Math.PI
  body.add(back)
  root.add(body)

  // ---- head: all dark, sunk a little into the body; pivot (0, 0.56, 0.02) --------------
  const head = group('part:head', [0, 0.56, 0.02])
  head.add(mesh(sphere(0.265, 'L', q), m.body, [0, 0.135, 0.01], [0, 0, 0], [1.05, 1, 0.97]))
  // the white ring around each eye: a flat disc on the face, the eye sits in its middle
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.062, 'S', q), m.accent, [s * 0.108, 0.145, 0.24], [0, s * 0.4, 0], [1, 1, 0.3]))
  }
  // short rounded dark beak
  head.add(mesh(sphere(0.045, 'S', q), m.nose, [0, 0.07, 0.275], [0, 0, 0], [1.1, 0.75, 1.6]))
  // blush
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.19, 0.055, 0.183], [0, s * 0.75, 0], [1, 0.7, 0.3]))
  }
  // eyes: the family's eyes, slightly sunk into the rings
  const eyes = group('part:eyes', [0, 0.145, 0])
  for (const s of [-1, 1]) {
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.105, 0, 0.236]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.117, 0.014, 0.266]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.265)
  headAnchor.position.set(0, 0.135, 0.01)
  const hat = anchor('hat', 0.3)
  hat.position.set(0, 0.4, 0.01)
  const face = anchor('face', 0.29)
  face.position.set(0, 0.145, 0.25)
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- flippers: pivot at the shoulders, down along the sides, 15° out -----------------
  for (const s of [-1, 1]) {
    const arm = group(s > 0 ? 'part:armL' : 'part:armR', [s * 0.285, 0.5, 0])
    const limb = group('limb', [0, 0, 0], [0, 0, s * 0.26])
    limb.add(mesh(capsule(0.06, 0.2, q), m.body, [0, -0.15, 0], [0, 0, 0], [0.5, 1, 1.15]))
    if (s < 0) {
      const paw = anchor('paw', 0.06)
      paw.position.set(0, -0.31, 0)
      limb.add(paw)
    }
    arm.add(limb)
    root.add(arm)
  }

  // ---- tail: a short stiff stub on the floor behind -----------------------------------
  const tail = group('part:tail', [0, 0.09, -0.24])
  tail.add(mesh(sphere(0.07, 'S', q), m.body, [0, -0.02, -0.04], [0.3, 0, 0], [0.9, 0.5, 1.4]))
  root.add(tail)

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.6))
  return root
}

export const adeliePenguin: CreatureModel = { id: 'adelie-penguin', build: buildAdeliePenguin }
