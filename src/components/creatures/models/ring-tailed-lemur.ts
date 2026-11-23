/**
 * Ring-tailed lemur (T-0027 Design §8.14): the tallest silhouette, by its tail.
 *
 * Primitives (29): body, tummy, 2 feet; head, white face, 2 black eye patches,
 * pointed snout, nose, 2 ears + 2 inner ears, 2 blush; 2 eyes + 2 glints;
 * 2 arms; tail: 7 stretched beads, black and white in turn, rising beside it
 * (+x) in a question-mark curve above the head.
 * Tagged `detail` (dropped on low): inner ears. Tagged `foot`: the feet.
 * No `extra`, no `satin`.
 * Triangles: 2,960 on high, 1,360 on low; 8 draw calls after the merge
 * (body, head, head nose, head blush, eyes, arm L, arm R, tail).
 */
import * as THREE from 'three'
import { anchor, capsule, cone, creatureMaterials, front, group, mesh, orientBetween, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

type Vec3 = [number, number, number]

export function buildRingTailedLemur(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'ring-tailed-lemur'

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

  // ---- head: grey crown, white face pushed a little out of it ---------------------------
  const head = group('part:head', [0, 0.56, 0.02])
  head.add(mesh(sphere(0.27, 'L', q), m.body, [0, 0.1, 0.01], [0, 0, 0], [1.08, 0.98, 0.95]))
  const wc: Vec3 = [0, 0.085, 0.07]
  const wr: Vec3 = [0.235, 0.235 * 0.92, 0.235 * 0.9]
  head.add(mesh(sphere(0.235, 'M', q), m.belly, wc, [0, 0, 0], [1, 0.92, 0.9]))
  // rounded ears, white inside
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.085, 'S', q), m.body, [s * 0.215, 0.3, 0], [0, 0, 0], [1, 1, 0.45]))
    const inner = mesh(sphere(0.05, 'XS', q), m.belly, [s * 0.215, 0.295, 0.028], [0, 0, 0], [1, 1, 0.4])
    inner.userData.detail = true
    head.add(inner)
  }
  // black eye patches (the eyes sit on them), tilted down toward the snout
  const eyeY = 0.12
  const eyeZ = front(wc, wr, 0.105, eyeY)
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.064, 'S', q), m.accent, [s * 0.105, eyeY - 0.005, eyeZ - 0.004], [0, s * 0.4, s * 0.3], [0.95, 1.2, 0.3]))
  }
  // pointed white snout with a black tip
  head.add(mesh(cone(0.1, 0.16, q), m.belly, [0, 0.045, 0.3], [Math.PI / 2, 0, 0]))
  head.add(mesh(sphere(0.04, 'S', q), m.nose, [0, 0.05, 0.366], [0, 0, 0], [1.1, 0.85, 0.9]))
  for (const s of [-1, 1]) {
    const z = front(wc, wr, s * 0.18, 0.035)
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.18, 0.035, z + 0.006], [0, s * 0.7, 0], [1, 0.7, 0.3]))
  }
  // eyes: same on all 20
  const eyes = group('part:eyes', [0, eyeY, 0])
  for (const s of [-1, 1]) {
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.105, 0, eyeZ + 0.006]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.117, 0.014, eyeZ + 0.036]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.27)
  headAnchor.position.set(0, 0.1, 0.01)
  const hat = anchor('hat', 0.26)
  hat.position.set(0, 0.365, 0.01)
  const face = anchor('face', 0.29)
  face.position.set(0, eyeY, eyeZ + 0.02)
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

  // ---- tail: out to +x, straight up past the head, hooking back in at the top ----------
  const pivot: Vec3 = [0.1, 0.08, -0.22]
  const tail = group('part:tail', pivot)
  const path: Vec3[] = [
    [0.1, 0.07, -0.22],
    [0.3, 0.09, -0.24],
    [0.41, 0.26, -0.22],
    [0.43, 0.48, -0.2],
    [0.42, 0.7, -0.18],
    [0.38, 0.91, -0.16],
    [0.29, 1.075, -0.14],
    [0.16, 1.0, -0.13],
  ]
  const r = 0.056
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i].map((v, k) => v - pivot[k]) as Vec3
    const b = path[i + 1].map((v, k) => v - pivot[k]) as Vec3
    const bead = mesh(sphere(r, 'S', q), i % 2 === 0 ? m.accent : m.accent2)
    const length = orientBetween(bead, a, b)
    bead.scale.set(1, (length / 2 + 0.022) / r, 1)
    tail.add(bead)
  }
  root.add(tail)

  // ---- seat ---------------------------------------------------------------------------
  root.add(anchor('seat', 0.58))
  return root
}

export const ringTailedLemur: CreatureModel = { id: 'ring-tailed-lemur', build: buildRingTailedLemur }
