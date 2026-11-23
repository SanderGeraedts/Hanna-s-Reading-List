/**
 * Red fox (T-0027 Design §8.2).
 *
 * Primitives (27): body, chest, 2 feet (dark socks); head, 2 ears (dark back
 * cone + orange front cone + cream inner each), 2 cheek tufts, snout cone,
 * nose, 2 blush; 2 eyes + 2 glints; 2 arms + 2 dark paw socks; tail: brush and
 * cream tip.
 * Tagged `detail` (dropped on low): the cream inner ears.
 * Tagged `foot`: the feet. No `extra` meshes, no `satin`.
 * Triangles: 2,516 on high, 1,220 on low; 8 draw calls after the merge
 * (body, head, head nose, head blush, eyes, arm L, arm R, tail).
 */
import * as THREE from 'three'
import { anchor, capsule, cone, creatureMaterials, group, mesh, orientBetween, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildRedFox(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'red-fox'

  // ---- body: pivot at the body centre (0, 0.31, 0) -------------------------------------
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0, 0], [0, 0, 0], [1, 1.08, 0.88]))
  // cream chest, a little taller than the family tummy
  body.add(mesh(sphere(0.2, 'M', q), m.belly, [0, 0, 0.175], [0, 0, 0], [0.95, 1.2, 0.55]))
  // dark socks: the whole foot
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
  // big triangular ears: a dark cone behind, an orange one in front (so the dark shows as
  // the back and the tip), cream inside
  for (const s of [-1, 1]) {
    const ear = group('ear', [s * 0.17, 0.33, -0.02], [0, 0, -s * 0.35])
    ear.add(mesh(cone(0.115, 0.27, q, 4), m.accent, [0, 0, -0.012], [0, Math.PI / 4, 0]))
    ear.add(mesh(cone(0.1, 0.23, q, 4), m.body, [0, -0.02, 0.015], [0, Math.PI / 4, 0]))
    const inner = mesh(cone(0.06, 0.14, q, 4), m.belly, [0, -0.045, 0.05], [0, Math.PI / 4, 0], [1, 1, 0.6])
    inner.userData.detail = true
    ear.add(inner)
    head.add(ear)
  }
  // cream cheek tufts pointing out and down
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.07, 'S', q), m.belly, [s * 0.255, 0, 0.1], [0, 0, -s * 0.5], [1.3, 0.7, 0.8]))
  }
  // pointed cream snout, 0.14 out of the face, rounded off by the nose
  head.add(mesh(cone(0.085, 0.17, q), m.belly, [0, 0.04, 0.315], [Math.PI / 2, 0, 0], [1.1, 1, 0.85]))
  head.add(mesh(sphere(0.032, 'S', q), m.nose, [0, 0.045, 0.392]))
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
  const hat = anchor('hat', 0.18)
  hat.position.set(0, 0.365, 0.01)
  const face = anchor('face', 0.29)
  face.position.set(0, 0.12, 0.25)
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- arms: pivot at the shoulders, resting on the chest, dark paws -------------------
  for (const s of [-1, 1]) {
    const arm = group(s > 0 ? 'part:armL' : 'part:armR', [s * 0.21, 0.42, 0.13])
    const limb = group('limb', [-s * 0.01, -0.06, 0.03], [-0.9, 0, s * 0.75])
    limb.add(mesh(capsule(0.075, 0.18, q), m.body))
    limb.add(mesh(sphere(0.079, 'S', q), m.accent, [0, -0.125, 0], [0, 0, 0], [1, 0.9, 1]))
    if (s < 0) {
      const paw = anchor('paw', 0.079)
      paw.position.set(0, -0.195, 0)
      limb.add(paw)
    }
    arm.add(limb)
    root.add(arm)
  }

  // ---- tail: a very big brush from the lower back sweeping round to the front at +x ----
  const tail = group('part:tail', [0.1, 0.165, -0.2])
  const brush = group('tail-brush')
  orientBetween(brush, [0, 0, 0], [0.28, 0.16, 0.26])
  brush.add(mesh(sphere(0.135, 'M', q), m.body, [0, 0, 0], [0, 0, 0], [1, 1.5, 1]))
  brush.add(mesh(sphere(0.1, 'M', q), m.belly, [0, 0.17, 0], [0, 0, 0], [1, 1.3, 1]))
  tail.add(brush)
  root.add(tail)

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.58))
  return root
}

export const redFox: CreatureModel = { id: 'red-fox', build: buildRedFox }
