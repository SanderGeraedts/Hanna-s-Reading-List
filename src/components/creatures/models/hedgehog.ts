/**
 * European hedgehog (T-0027 Design §8.6).
 *
 * Primitives (40): body (spine brown), cream tummy, 2 cream feet, 9 back
 * spines; cream head, spine hood over the top and back of the head, 13 head
 * spines (7 round the rim, 3 fringe, 3 behind), pointed snout, round nose,
 * 2 small round ears, 2 blush; 2 eyes + 2 glints; 2 cream arms. No tail.
 * The spines are 5-sided cones in the darker `accent`, their bases sunk in the
 * brown dome, so they read as brown spines with darker tips.
 * Nothing tagged `detail` (the spines are the silhouette) or `extra`.
 * Tagged `foot`: the feet. No `satin`.
 * Triangles: 2,716 on high, 1,380 on low; 7 draw calls after the merge
 * (body, head, head nose, head blush, eyes, arm L, arm R).
 */
import * as THREE from 'three'
import { anchor, capsule, cone, creatureMaterials, group, mesh, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

type Vec3 = [number, number, number]

export function buildHedgehog(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'hedgehog'

  /** A short spine standing on the dome (an ellipsoid: centre, half sizes) in direction `dir`. */
  const up = new THREE.Vector3(0, 1, 0)
  function spine(centre: Vec3, half: Vec3, dir: Vec3): THREE.Mesh {
    const d = new THREE.Vector3(...dir).normalize()
    const at = new THREE.Vector3(d.x * half[0], d.y * half[1], d.z * half[2])
    const normal = new THREE.Vector3(at.x / half[0] ** 2, at.y / half[1] ** 2, at.z / half[2] ** 2).normalize()
    const s = mesh(cone(0.04, 0.09, q, 5), m.accent)
    s.position.set(...centre).add(at).addScaledVector(normal, 0.025)
    s.quaternion.setFromUnitVectors(up, normal)
    return s
  }

  // ---- body: the brown spine dome with a big cream tummy; pivot (0, 0.31, 0) -----------
  const bodyHalf: Vec3 = [0.29 * 1.05, 0.29 * 1.08, 0.29 * 0.92]
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0, 0], [0, 0, 0], [1.05, 1.08, 0.92]))
  body.add(mesh(sphere(0.21, 'M', q), m.belly, [0, -0.02, 0.17], [0, 0, 0], [1, 1.15, 0.6]))
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.11, 'M', q), m.belly, [s * 0.17, -0.235, 0.2], [0, 0, 0], [1, 0.7, 1.35])
    foot.userData.stageRole = 'foot'
    body.add(foot)
  }
  // nine spines: four out of the sides (the spiky outline from the front), five down the back
  const backSpines: Vec3[] = [
    [1, 0.3, -0.25],
    [-1, 0.3, -0.25],
    [1, -0.25, -0.3],
    [-1, -0.25, -0.3],
    [0.55, 0.45, -0.7],
    [-0.55, 0.45, -0.7],
    [0, 0.05, -1],
    [0.5, -0.4, -0.75],
    [-0.5, -0.4, -0.75],
  ]
  for (const dir of backSpines) body.add(spine([0, 0, 0], bodyHalf, dir))
  const neck = anchor('neck', 0.19)
  neck.position.set(0, 0.25, 0)
  body.add(neck)
  const back = anchor('back', 0.5)
  back.position.set(0, 0.05, -0.27)
  back.rotation.y = Math.PI
  body.add(back)
  root.add(body)

  // ---- head: cream face, brown hood behind it; pivot where head meets body -------------
  const head = group('part:head', [0, 0.56, 0.02])
  head.add(mesh(sphere(0.27, 'L', q), m.belly, [0, 0.1, 0.01], [0, 0, 0], [1.08, 0.98, 0.95]))
  const hoodCentre: Vec3 = [0, 0.13, -0.02]
  const hoodHalf: Vec3 = [0.31, 0.26, 0.27]
  head.add(mesh(sphere(0.27, 'L', q), m.body, hoodCentre, [0, 0, 0], [hoodHalf[0] / 0.27, hoodHalf[1] / 0.27, 1]))
  // thirteen spines: seven round the rim (the round spiky outline), three as a fringe over
  // the forehead, three on the back of the head
  const rim = [0, 30, -30, 58, -58, 82, -82].map((deg): Vec3 => {
    const a = (deg * Math.PI) / 180
    return [Math.sin(a), Math.cos(a), -0.15]
  })
  const headSpines: Vec3[] = [
    ...rim,
    [0, 0.75, 0.62],
    [0.5, 0.68, 0.5],
    [-0.5, 0.68, 0.5],
    [0, 0.6, -0.8],
    [0.6, 0.45, -0.65],
    [-0.6, 0.45, -0.65],
  ]
  for (const dir of headSpines) head.add(spine(hoodCentre, hoodHalf, dir))
  // pointed little snout with a round black nose
  head.add(mesh(sphere(0.08, 'M', q), m.belly, [0, 0.04, 0.25], [0, 0, 0], [1, 0.8, 1.3]))
  head.add(mesh(sphere(0.032, 'S', q), m.nose, [0, 0.05, 0.352]))
  // small round ears where the face meets the spines
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'S', q), m.belly, [s * 0.235, 0.23, 0.115], [0, s * 0.5, 0], [1, 1, 0.6]))
  }
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
  const hat = anchor('hat', 0.22)
  hat.position.set(0, 0.39, -0.02)
  const face = anchor('face', 0.29)
  face.position.set(0, 0.12, 0.25)
  head.add(headAnchor, hat, face)
  root.add(head)

  // ---- arms: cream, pivot at the shoulders, resting on the tummy -----------------------
  for (const s of [-1, 1]) {
    const arm = group(s > 0 ? 'part:armL' : 'part:armR', [s * 0.22, 0.42, 0.13])
    const limb = group('limb', [-s * 0.01, -0.06, 0.03], [-0.9, 0, s * 0.75])
    limb.add(mesh(capsule(0.075, 0.18, q), m.belly))
    if (s < 0) {
      const paw = anchor('paw', 0.075)
      paw.position.set(0, -0.165, 0)
      limb.add(paw)
    }
    arm.add(limb)
    root.add(arm)
  }

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.61))
  return root
}

export const hedgehog: CreatureModel = { id: 'hedgehog', build: buildHedgehog }
