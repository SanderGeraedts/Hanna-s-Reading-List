/**
 * Polar bear (T-0027 Design §8.11).
 *
 * Primitives (21): body, tummy, 2 feet; head, 2 ears + 2 inner ears, muzzle,
 * nose, 2 blush; 2 eyes + 2 glints; 2 arms; tail ball.
 * Tagged `detail` (dropped on low): inner ears.
 * Tagged `foot`: the feet. No `extra` meshes, no `satin`.
 * Triangles: 2,416 on high, 1,144 on low; 8 draw calls after the merge
 * (body, head, head nose, head blush, eyes, arm L, arm R, tail).
 */
import * as THREE from 'three'
import { anchor, capsule, creatureMaterials, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildPolarBear(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'polar-bear'

  // ---- body: pivot at the body centre (0, 0.31, 0), a little heavier than the cat ------
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0, 0], [0, 0, 0], [1.08, 1.08, 0.9]))
  body.add(mesh(sphere(0.19, 'M', q), m.belly, [0, -0.02, 0.185], [0, 0, 0], [1, 1.15, 0.55]))
  // bigger, flatter feet
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.125, 'M', q), m.body, [s * 0.185, -0.235, 0.2], [0, 0, 0], [1.05, 0.6, 1.4])
    foot.userData.stageRole = 'foot'
    body.add(foot)
  }
  const neck = anchor('neck', 0.19)
  neck.position.set(0, 0.25, 0)
  body.add(neck)
  const back = anchor('back', 0.5)
  back.position.set(0, 0.05, -0.261)
  back.rotation.y = Math.PI
  body.add(back)
  root.add(body)

  // ---- head: pivot where head meets body (0, 0.56, 0.02) -------------------------------
  const head = group('part:head', [0, 0.56, 0.02])
  head.add(mesh(sphere(0.27, 'L', q), m.body, [0, 0.1, 0.01], [0, 0, 0], [1.08, 0.98, 0.95]))
  // small round ears, set wide
  for (const s of [-1, 1]) {
    const ear = group('ear', [s * 0.19, 0.335, -0.01])
    ear.add(mesh(sphere(0.068, 'M', q), m.body, [0, 0, 0], [0, 0, 0], [1, 1, 0.6]))
    const inner = mesh(sphere(0.042, 'XS', q), m.accent2, [0, -0.008, 0.026], [0, 0, 0], [1, 1, 0.45])
    inner.userData.detail = true
    ear.add(inner)
    head.add(ear)
  }
  // the longer rounded muzzle (sticks out 0.12) in a warmer cream, black nose on its tip
  head.add(mesh(sphere(0.11, 'M', q), m.accent, [0, 0.045, 0.262], [0, 0, 0], [1.05, 0.73, 1.1]))
  head.add(mesh(sphere(0.038, 'S', q), m.nose, [0, 0.078, 0.362], [0, 0, 0], [1.2, 0.8, 0.8]))
  // blush
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.175, 0.06, 0.212], [0, s * 0.62, 0], [1, 0.7, 0.3]))
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

  // ---- arms: pivot at the shoulders, resting on the tummy -----------------------------
  for (const s of [-1, 1]) {
    const arm = group(s > 0 ? 'part:armL' : 'part:armR', [s * 0.225, 0.42, 0.13])
    const limb = group('limb', [-s * 0.01, -0.06, 0.03], [-0.9, 0, s * 0.75])
    limb.add(mesh(capsule(0.08, 0.18, q), m.body))
    if (s < 0) {
      const paw = anchor('paw', 0.08)
      paw.position.set(0, -0.17, 0)
      limb.add(paw)
    }
    arm.add(limb)
    root.add(arm)
  }

  // ---- tail: a small ball low on the back ----------------------------------------------
  const tail = group('part:tail', [0, 0.11, -0.255])
  tail.add(mesh(sphere(0.055, 'S', q), m.body, [0, 0, -0.01]))
  root.add(tail)

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.63))
  return root
}

export const polarBear: CreatureModel = { id: 'polar-bear', build: buildPolarBear }
