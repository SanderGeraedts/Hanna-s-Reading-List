/**
 * Book dragon (T-0027 Design §8.17): a sage plush dragon whose wings are an open book.
 *
 * Primitives (33): body, tummy, 2 plate lines, 2 feet, 3 back spikes; head,
 * snout, 2 nostrils, 2 horns, 2 cheek fins, 2 blush; 2 eyes + 2 glints;
 * 2 arms; tail: 2 segments + spade; wings: spine, 2 cover boards, 2 page blocks.
 * Tagged `detail` (dropped on low): the plate lines, the nostrils.
 * Tagged `extra`: horns, back spikes, tail spade, every wing mesh. Tagged `foot`: the feet.
 * Tagged `satin`: horns (head) and back spikes (body).
 * Triangles: about 2,600 on high, 1,230 on low; 11 draw calls after the merge
 * (body, body satin, head, head nose, head blush, head satin, eyes, arm L, arm R, tail, wings).
 */
import * as THREE from 'three'
import { anchor, capsule, cone, creatureMaterials, group, mesh, orientBetween, sphere } from '../model'
import type { CreatureModel, CreatureParams } from '../model'

export function buildBookDragon(p: CreatureParams): THREE.Group {
  const q = p.quality
  const m = creatureMaterials(p)
  const root = new THREE.Group()
  root.name = 'book-dragon'

  // ---- body: pivot at the body centre (0, 0.31, 0) -------------------------------------
  const body = group('part:body', [0, 0.31, 0])
  body.add(mesh(sphere(0.29, 'L', q), m.body, [0, 0, 0], [0, 0, 0], [1, 1.08, 0.88]))
  body.add(mesh(sphere(0.19, 'M', q), m.belly, [0, -0.02, 0.18], [0, 0, 0], [0.95, 1.15, 0.55]))
  // two grooves across the tummy make three cream belly plates
  for (const y of [0.055, -0.075]) {
    const line = mesh(sphere(0.05, 'XS', q), m.body, [0, y, 0.27], [0, 0, 0], [2, 0.18, 0.3])
    line.userData.detail = true
    body.add(line)
  }
  for (const s of [-1, 1]) {
    const foot = mesh(sphere(0.11, 'M', q), m.body, [s * 0.17, -0.235, 0.2], [0, 0, 0], [1, 0.7, 1.35])
    foot.userData.stageRole = 'foot'
    body.add(foot)
  }
  // three gold spikes down the lower back, under the book
  for (const [y, z, tilt] of [
    [0.1, -0.262, 0.75],
    [-0.03, -0.275, 0.5],
    [-0.16, -0.24, 0.2],
  ]) {
    const spike = mesh(cone(0.042, 0.09, q), m.accent, [0, y, z], [-Math.PI / 2 + tilt, 0, 0], [0.8, 1, 1])
    spike.userData.stageRole = 'extra'
    spike.userData.satin = true
    body.add(spike)
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
  // a short round dragon snout with two nostrils
  head.add(mesh(sphere(0.1, 'M', q), m.body, [0, 0.04, 0.22], [0, 0, 0], [1.1, 0.75, 0.85]))
  for (const s of [-1, 1]) {
    const nostril = mesh(sphere(0.013, 'XS', q), m.nose, [s * 0.035, 0.07, 0.293])
    nostril.userData.detail = true
    head.add(nostril)
  }
  // two small gold horns, leaning out and back
  for (const s of [-1, 1]) {
    const horn = mesh(cone(0.04, 0.14, q), m.accent, [s * 0.14, 0.385, -0.04], [-0.25, 0, -s * 0.3])
    horn.userData.stageRole = 'extra'
    horn.userData.satin = true
    head.add(horn)
  }
  // little cheek fins where ears would be
  for (const s of [-1, 1]) {
    head.add(mesh(cone(0.055, 0.11, q, 4), m.body, [s * 0.29, 0.14, -0.04], [0, 0, -s * 1.15], [1, 1, 0.5]))
  }
  for (const s of [-1, 1]) {
    head.add(mesh(sphere(0.05, 'XS', q), m.blush, [s * 0.17, 0.06, 0.215], [0, s * 0.6, 0], [1, 0.7, 0.3]))
  }
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

  // ---- tail: thick, round to the +x side, curling up, with a little gold spade ---------
  const tail = group('part:tail', [0.1, 0.125, -0.22])
  const base = group('tail-base')
  const baseLength = orientBetween(base, [0, 0, 0], [0.24, -0.03, 0.1])
  base.add(mesh(capsule(0.06, baseLength, q), m.body))
  tail.add(base)
  const up = group('tail-up')
  const upLength = orientBetween(up, [0.24, -0.03, 0.1], [0.3, 0.2, 0.2])
  up.add(mesh(capsule(0.042, upLength, q), m.body))
  const spade = mesh(cone(0.07, 0.11, q), m.accent, [0, upLength / 2 + 0.07, 0], [0, 0.5, 0], [1, 1, 0.4])
  spade.userData.stageRole = 'extra'
  up.add(spade)
  tail.add(up)
  root.add(tail)

  // ---- wings: an open book on its back, pages to the front, opened in a V --------------
  const wings = group('part:wings', [0, 0.47, -0.25])
  const bookMeshes: THREE.Mesh[] = [mesh(new THREE.BoxGeometry(0.06, 0.56, 0.045), m.accent2, [0, 0.3, -0.01])]
  for (const s of [-1, 1]) {
    const board = group('cover', [s * 0.02, 0.02, 0], [0, -s * 0.3, -s * 0.1])
    const cover = mesh(new THREE.BoxGeometry(0.42, 0.56, 0.022), m.accent2, [s * 0.21, 0.28, 0])
    const pages = mesh(new THREE.BoxGeometry(0.385, 0.5, 0.04), m.belly, [s * 0.2, 0.28, 0.03])
    board.add(cover, pages)
    bookMeshes.push(cover, pages)
    wings.add(board)
  }
  wings.add(bookMeshes[0])
  for (const b of bookMeshes) b.userData.stageRole = 'extra'
  root.add(wings)

  // ---- seat: on the floor under the hips ----------------------------------------------
  root.add(anchor('seat', 0.58))
  return root
}

export const bookDragon: CreatureModel = { id: 'book-dragon', build: buildBookDragon }
