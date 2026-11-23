/**
 * Eurasian red squirrel (T-0027 Design §8.4).
 *
 * Primitives (26): body, tummy, 2 feet; head, 2 pointed ears + 2 inner ears +
 * 2 tall ear tufts, small snout, nose, 2 blush; 2 eyes + 2 glints; 2 arms;
 * tail: 3 stacked stretched spheres in an S, standing up taller than the head.
 * Tagged `detail` (dropped on low): the inner ears.
 * Tagged `extra`: the ear tufts. Tagged `foot`: the feet. No `satin`.
 * Triangles: 2,392 on high, 1,176 on low; 8 draw calls after the merge
 * (body, head, head nose, head blush, eyes, arm L, arm R, tail).
 */
import * as THREE from 'three'
import { anchor, capsule, cone, creatureMaterials, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildRedSquirrel(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'red-squirrel'

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
  // pointed ears with a tall darker tuft on each
  for (const s of [-1, 1]) {
    const ear = group('ear', [s * 0.16, 0.33, -0.02], [0, 0, -s * 0.25])
    ear.add(mesh(cone(0.075, 0.16, q, 4), m.body, [0, 0, 0], [0, Math.PI / 4, 0]))
    const inner = mesh(cone(0.045, 0.1, q, 4), m.belly, [0, -0.02, 0.026], [0, Math.PI / 4, 0], [1, 1, 0.6])
    inner.userData.detail = true
    ear.add(inner)
    const tuft = mesh(cone(0.038, 0.15, q, 4), m.accent, [0, 0.13, 0], [0, Math.PI / 4, 0])
    tuft.userData.stageRole = 'extra'
    ear.add(tuft)
    head.add(ear)
  }
  // small cream snout with a round nose
  head.add(mesh(sphere(0.07, 'S', q), m.belly, [0, 0.055, 0.245], [0, 0, 0], [1.2, 0.85, 0.8]))
  head.add(mesh(sphere(0.026, 'S', q), m.nose, [0, 0.07, 0.3]))
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
  const hat = anchor('hat', 0.2)
  hat.position.set(0, 0.365, 0.01)
  const face = anchor('face', 0.29)
  face.position.set(0, 0.12, 0.25)
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- arms: pivot at the shoulders, resting on the tummy -----------------------------
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

  // ---- tail: a huge S standing up behind, leaning out to +x, its darker tip curling ----
  // ---- forward above the head (the tallest point, about 1.13) --------------------------
  const tail = group('part:tail', [0.08, 0.12, -0.2])
  tail.add(mesh(sphere(0.15, 'M', q), m.body, [0.05, 0.18, -0.07], [0, 0, -0.15], [0.95, 1.5, 0.85]))
  tail.add(mesh(sphere(0.15, 'M', q), m.body, [0.18, 0.56, -0.07], [0, 0, -0.35], [0.95, 1.55, 0.85]))
  tail.add(mesh(sphere(0.12, 'M', q), m.accent, [0.29, 0.87, 0], [0, 0, 0], [1, 1.1, 1]))
  root.add(tail)

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.58))
  return root
}

export const redSquirrel: CreatureModel = { id: 'red-squirrel', build: buildRedSquirrel }
