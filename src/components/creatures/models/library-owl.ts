/**
 * Library owl (T-0027 Design §8.18): a round owl, head and body almost in one.
 *
 * Primitives (27): body, chest patch, 2 feet, 3 chevrons of 2 strokes; head,
 * 2 facial-disc lobes (a heart), beak, 2 ear tufts, 2 blush; 2 eyes + 2 glints;
 * 2 folded wings + 2 dark wing tips.
 * Tagged `detail` (dropped on low): the lowest chevron.
 * Tagged `extra`: the ear tufts. Tagged `foot`: the feet.
 * Tagged `satin`: the gold chest chevrons (body only).
 * Triangles: about 2,440 on high, 1,190 on low; 8 draw calls after the merge
 * (body, body satin, head, head beak, head blush, eyes, arm L, arm R). No tail.
 */
import * as THREE from 'three'
import { anchor, cone, creatureMaterials, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildLibraryOwl(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'library-owl'

  // ---- body: pivot at the body centre (0, 0.31, 0), a little rounder than the cat's ----
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0, 0], [0, 0, 0], [1.05, 1.08, 0.9]))
  body.add(mesh(sphere(0.2, 'M', q), m.belly, [0, -0.01, 0.17], [0, 0, 0], [1, 1.15, 0.55]))
  // small gold feet peeping out under the chest
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.09, 'M', q), m.accent2, [s * 0.12, -0.25, 0.21], [0, 0, 0], [1, 0.62, 1.3])
    foot.userData.stageRole = 'foot'
    body.add(foot)
  }
  // three gold chevrons down the chest, like the edges of pages
  for (const [i, [y, z]] of [
    [0.09, 0.268],
    [0, 0.279],
    [-0.09, 0.271],
  ].entries()) {
    for (const s of [-1, 1]) {
      const stroke = mesh(sphere(0.03, 'XS', q), m.accent2, [s * 0.036, y, z], [0, s * 0.2, s * 0.5], [1.55, 0.36, 0.3])
      stroke.userData.satin = true
      if (i === 2) stroke.userData.detail = true
      body.add(stroke)
    }
  }
  const neck = anchor('neck', 0.2)
  neck.position.set(0, 0.25, 0)
  body.add(neck)
  const back = anchor('back', 0.5)
  back.position.set(0, 0.05, -0.26)
  back.rotation.y = Math.PI
  body.add(back)
  root.add(body)

  // ---- head: pivot where head meets body; the head sits lower, merged into the body ----
  const head = group('part:head', [0, 0.56, 0.02])
  head.add(mesh(sphere(0.27, 'L', q), m.body, [0, 0.075, 0.01], [0, 0, 0], [1.08, 0.98, 0.95]))
  // heart-shaped facial disc: two lobes leaning apart at the top, meeting at the beak
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.12, 'M', q), m.belly, [s * 0.085, 0.11, 0.172], [0, s * 0.25, -s * 0.4], [0.9, 1.15, 0.75]))
  }
  // small rounded gold beak, tip down
  head.add(mesh(cone(0.034, 0.07, q), m.nose, [0, 0.062, 0.272], [Math.PI - 0.45, 0, 0], [1, 1, 0.8]))
  // two upright ear tufts
  for (const s of [-1, 1]) {
    const tuft = mesh(cone(0.065, 0.2, q), m.accent, [s * 0.175, 0.325, -0.01], [0, 0, -s * 0.38], [1, 1, 0.6])
    tuft.userData.stageRole = 'extra'
    head.add(tuft)
  }
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.175, 0.055, 0.228], [0, s * 0.6, 0], [1, 0.7, 0.3]))
  }
  // eyes: the family's, sitting on the disc
  const eyes = group('part:eyes', [0, 0.12, 0])
  for (const s of [-1, 1]) {
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.105, 0, 0.243]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.117, 0.014, 0.273]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.27)
  headAnchor.position.set(0, 0.075, 0.01)
  const hat = anchor('hat', 0.22)
  hat.position.set(0, 0.34, 0.01)
  const face = anchor('face', 0.29)
  face.position.set(0, 0.12, 0.262)
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- wings as arms: folded down along the sides, dark tips ---------------------------
  for (const s of [-1, 1]) {
    const arm = group(s > 0 ? 'part:armL' : 'part:armR', [s * 0.24, 0.44, 0.02])
    const wing = group('wing', [s * 0.035, -0.02, 0], [0.1, 0, s * 0.16])
    wing.add(mesh(sphere(0.13, 'M', q), m.body, [0, -0.13, 0], [0, 0, 0], [0.45, 1.45, 0.95]))
    wing.add(mesh(sphere(0.075, 'S', q), m.accent, [s * 0.004, -0.255, 0], [0, 0, 0], [0.52, 1, 0.9]))
    if (s < 0) {
      const paw = anchor('paw', 0.06)
      paw.position.set(0, -0.32, 0.02)
      wing.add(paw)
    }
    arm.add(wing)
    root.add(arm)
  }

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.6))
  return root
}

export const libraryOwl: CreatureModel = { id: 'library-owl', build: buildLibraryOwl }
