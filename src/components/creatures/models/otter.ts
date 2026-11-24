/**
 * Eurasian otter (T-0027 Design §8.7): the sleek one.
 *
 * Primitives (25): body, chest patch, 2 feet; head, 2 ears + 2 inner ears,
 * muzzle, nose, 2 blush; 2 eyes + 2 glints; 2 arms; tail: 2 tapering
 * segments, joint ball, tip ball.
 * Tagged `detail` (dropped on low): inner ears.
 * Tagged `foot`: the feet. No `extra` meshes, no `satin`.
 * Triangles: 2,532 on high, 1,200 on low; 8 draw calls after the merge
 * (body, head, head nose, head blush, eyes, arm L, arm R, tail).
 *
 * Its length shows in a taller body under a smaller head, so the head pivot
 * and the eyes sit 0.05 higher than the cat's; the ears are low on the sides,
 * so the top of the head is the top of the model.
 */
import * as THREE from 'three'
import { anchor, capsule, creatureMaterials, cylinder, group, mesh, orientBetween, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildOtter(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'otter'

  // ---- body: pivot at the body centre (0, 0.31, 0); a longer body than the cat's -------
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0.03, 0], [0, 0, 0], [1, 1.17, 0.88]))
  // long cream chest and tummy
  body.add(mesh(sphere(0.19, 'M', q), m.belly, [0, 0.03, 0.18], [0, 0, 0], [0.95, 1.4, 0.55]))
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.11, 'M', q), m.accent, [s * 0.17, -0.235, 0.2], [0, 0, 0], [1, 0.7, 1.35])
    foot.userData.stageRole = 'foot'
    body.add(foot)
  }
  const neck = anchor('neck', 0.17)
  neck.position.set(0, 0.3, 0)
  body.add(neck)
  const back = anchor('back', 0.48)
  back.position.set(0, 0.08, -0.255)
  back.rotation.y = Math.PI
  body.add(back)
  root.add(body)

  // ---- head: smaller and rounded, pivot where head meets body (0, 0.61, 0.02) ----------
  const head = group('part:head', [0, 0.61, 0.02])
  head.add(mesh(sphere(0.255, 'L', q), m.body, [0, 0.1, 0.01], [0, 0, 0], [1.08, 0.97, 0.95]))
  // tiny round ears low on the sides
  for (const s of [-1, 1]) {
    const ear = group('ear', [s * 0.25, 0.185, -0.01], [0, s * 0.3, 0])
    ear.add(mesh(sphere(0.052, 'S', q), m.body, [0, 0, 0], [0, 0, 0], [1, 1, 0.6]))
    const inner = mesh(sphere(0.03, 'XS', q), m.accent, [0, 0, 0.022], [0, 0, 0], [1, 1, 0.45])
    inner.userData.detail = true
    ear.add(inner)
    head.add(ear)
  }
  // wide cream muzzle with a round dark nose on top
  head.add(mesh(sphere(0.1, 'M', q), m.belly, [0, 0.04, 0.215], [0, 0, 0], [1.25, 0.7, 0.8]))
  head.add(mesh(sphere(0.038, 'S', q), m.nose, [0, 0.072, 0.283], [0, 0, 0], [1.2, 0.85, 0.8]))
  // blush
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.18, 0.065, 0.196], [0, s * 0.68, 0], [1, 0.7, 0.3]))
  }
  // eyes: same on all 20, slightly sunk into the smaller head
  const eyes = group('part:eyes', [0, 0.12, 0])
  for (const s of [-1, 1]) {
    eyes.add(mesh(sphere(0.04, 'S', q), m.eye, [s * 0.105, 0, 0.222]))
    eyes.add(mesh(sphere(0.012, 'XS', q), m.glint, [s * 0.117, 0.014, 0.252]))
  }
  head.add(eyes)
  const headAnchor = anchor('head', 0.255)
  headAnchor.position.set(0, 0.1, 0.01)
  const hat = anchor('hat', 0.3)
  hat.position.set(0, 0.347, 0.01)
  const face = anchor('face', 0.29)
  face.position.set(0, 0.12, 0.236)
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- arms: pivot at the shoulders, paws held together in front of the chest ----------
  for (const s of [-1, 1]) {
    const arm = group(s > 0 ? 'part:armL' : 'part:armR', [s * 0.2, 0.47, 0.12])
    const limb = group('limb')
    const length = orientBetween(limb, [0, 0, 0], [-s * 0.15, -0.05, 0.18])
    limb.add(mesh(capsule(0.068, length - 0.068, q), m.body))
    if (s < 0) {
      const paw = anchor('paw', 0.068)
      paw.position.set(0, length / 2 + 0.03, 0)
      limb.add(paw)
    }
    arm.add(limb)
    root.add(arm)
  }

  // ---- tail: thick at the base, tapering, lying on the floor and curving to +x ---------
  const tail = group('part:tail', [0.06, 0.1, -0.22])
  const joints: [number, number, number][] = [
    [0, 0, 0],
    [0.22, -0.03, -0.02],
    [0.38, -0.045, 0.15],
  ]
  const radii = [0.085, 0.07, 0.045]
  for (const i of [0, 1]) {
    // laid down with plain yaw and tilt (no roll), so the segment keeps a tight bounding box
    const [ax, ay, az] = joints[i]
    const [bx, by, bz] = joints[i + 1]
    const flat = Math.hypot(bx - ax, bz - az)
    const length = Math.hypot(flat, by - ay)
    tail.add(
      mesh(
        cylinder(radii[i + 1], radii[i], length, q),
        m.body,
        [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2],
        [0, Math.atan2(az - bz, bx - ax), -Math.PI / 2 + Math.atan2(by - ay, flat)],
      ),
    )
  }
  tail.add(mesh(sphere(radii[1], 'M', q), m.body, joints[1]))
  tail.add(mesh(sphere(radii[2], 'S', q), m.accent, joints[2]))
  root.add(tail)

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.58))
  return root
}

export const otter: CreatureModel = { id: 'otter', build: buildOtter }
