/**
 * Capybara (T-0027 Design §8.3): the calm one.
 *
 * Primitives (20): wide barrel body, tummy, 2 feet; boxy head, long blunt
 * snout, darker snout top, nose, 2 tiny round ears + 2 inner ears, 2 blush;
 * 2 eyes + 2 glints; 2 arms. No tail.
 * Tagged `detail` (dropped on low): the inner ears.
 * Tagged `foot`: the feet. No `extra` meshes, no `satin`.
 * Triangles: 2,296 on high, 1,056 on low; 7 draw calls after the merge
 * (body, head, head nose, head blush, eyes, arm L, arm R).
 */
import * as THREE from 'three'
import { anchor, capsule, creatureMaterials, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildCapybara(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'capybara'

  // ---- body: a wide barrel (x 1.15), pivot at the body centre (0, 0.31, 0) -------------
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0, 0], [0, 0, 0], [1.15, 1.08, 0.88]))
  body.add(mesh(sphere(0.19, 'M', q), m.belly, [0, -0.02, 0.18], [0, 0, 0], [1.1, 1.15, 0.55]))
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.11, 'M', q), m.body, [s * 0.19, -0.235, 0.2], [0, 0, 0], [1, 0.7, 1.35])
    foot.userData.stageRole = 'foot'
    body.add(foot)
  }
  const neck = anchor('neck', 0.2)
  neck.position.set(0, 0.25, 0)
  body.add(neck)
  const back = anchor('back', 0.55)
  back.position.set(0, 0.05, -0.255)
  back.rotation.y = Math.PI
  body.add(back)
  root.add(body)

  // ---- head: boxy, long front to back; pivot where head meets body (0, 0.56, 0.02) -----
  const head = group('part:head', [0, 0.56, 0.02])
  head.add(mesh(sphere(0.26, 'L', q), m.body, [0, 0.12, 0.03], [0, 0, 0], [1.1, 0.95, 1.2]))
  // long flat blunt snout with a darker top
  head.add(mesh(sphere(0.15, 'M', q), m.body, [0, 0.02, 0.32], [0, 0, 0], [1.1, 0.85, 1.25]))
  head.add(mesh(sphere(0.1, 'S', q), m.accent, [0, 0.115, 0.34], [0, 0, 0], [1.0, 0.3, 1.5]))
  // broad nose on the blunt front
  head.add(mesh(sphere(0.035, 'S', q), m.nose, [0, 0.06, 0.5], [0, 0, 0], [1.5, 0.9, 0.5]))
  // tiny round ears high on the head
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.055, 'S', q), m.body, [s * 0.17, 0.35, -0.07], [0, 0, 0], [1, 1, 0.6]))
    const inner = mesh(sphere(0.03, 'XS', q), m.accent, [s * 0.17, 0.352, -0.04], [0, 0, 0], [1, 1, 0.5])
    inner.userData.detail = true
    head.add(inner)
  }
  // blush, on the sides of the long head
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.2, 0.05, 0.228], [0, s * 0.8, 0], [1, 0.7, 0.3]))
  }
  // eyes: the family's eyes, 0.02 higher than usual (y 0.70), above the snout
  const eyes = group('part:eyes', [0, 0.14, 0])
  for (const s of [-1, 1]) {
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.105, 0, 0.307]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.117, 0.014, 0.337]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.26)
  headAnchor.position.set(0, 0.12, 0.03)
  const hat = anchor('hat', 0.24)
  hat.position.set(0, 0.367, 0.03)
  const face = anchor('face', 0.29)
  face.position.set(0, 0.14, 0.32)
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- arms: pivot at the (wider) shoulders, resting on the tummy ----------------------
  for (const s of [-1, 1]) {
    const arm = group(s > 0 ? 'part:armL' : 'part:armR', [s * 0.235, 0.42, 0.13])
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
  root.add(anchor('seat', 0.67))
  return root
}

export const capybara: CreatureModel = { id: 'capybara', build: buildCapybara }
