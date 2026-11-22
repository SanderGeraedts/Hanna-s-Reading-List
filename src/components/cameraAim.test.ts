import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { SHELF } from '#/lib/shelfLayout'
import { FOV, aimCamera, cameraZ, frameCase, newAim } from './cameraAim'

// a phone held upright, the case from T-0025 section 1, zoomed in all the way
const W = 390
const H = 844
const CASE_W = 0.63
const CASE_H = 1.6
const ZOOM = 3
const SPINES_Z = SHELF.depth / 2

function setup() {
  const aspect = W / H
  const frame = frameCase(CASE_W, CASE_H, aspect, true, ZOOM)
  const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.05, 60)
  const y = 0.8
  camera.position.set(0, y, cameraZ(frame.toCase))
  camera.lookAt(0, y, 0)
  camera.updateMatrixWorld()
  return { frame, camera, y }
}

/** runs the frame loop until the camera has settled */
function settle(camera: THREE.PerspectiveCamera, target: { x: number; y: number; z: number }, parallax = { x: 0, y: 0 }) {
  const aim = newAim()
  for (let i = 0; i < 600; i++) aimCamera(camera, target, aim, parallax, 1 / 60)
  camera.updateMatrixWorld()
  return aim
}

const ndcX = (camera: THREE.Camera, x: number, y: number) => new THREE.Vector3(x, y, SPINES_Z).project(camera).x

describe('aimCamera', () => {
  it('frames the phone as worked out in T-0025: xMax ≈ 0.251 m at zoom 3', () => {
    expect(setup().frame.xMax).toBeCloseTo(0.251, 2)
  })

  it('panned to xMax shows the right end of the case and not the left', () => {
    const { frame, camera, y } = setup()
    settle(camera, { x: frame.xMax, y, z: cameraZ(frame.toCase) })
    expect(ndcX(camera, CASE_W / 2, y)).toBeLessThanOrEqual(1)
    expect(ndcX(camera, -CASE_W / 2, y)).toBeLessThan(-1)
  })

  it('panned to -xMax shows the left end of the case and not the right', () => {
    const { frame, camera, y } = setup()
    settle(camera, { x: -frame.xMax, y, z: cameraZ(frame.toCase) })
    expect(ndcX(camera, -CASE_W / 2, y)).toBeGreaterThanOrEqual(-1)
    expect(ndcX(camera, CASE_W / 2, y)).toBeGreaterThan(1)
  })

  it('with the pan at 0, the middle of the case is in the middle of the screen', () => {
    const { frame, camera, y } = setup()
    settle(camera, { x: 0, y, z: cameraZ(frame.toCase) })
    expect(ndcX(camera, 0, y)).toBeCloseTo(0, 5)
  })

  it('with a parallax offset the camera moves but the aim stays on the pan', () => {
    const { frame, camera, y } = setup()
    const x = frame.xMax / 2
    const aim = settle(camera, { x, y, z: cameraZ(frame.toCase) }, { x: 0.06, y: 0 })
    expect(camera.position.x).toBeCloseTo(x + 0.06, 4)
    expect(aim.lookX).toBeCloseTo(x, 4)
    // the camera looks at the pan: the point straight ahead on the case is at x, not where the camera is
    const dir = camera.getWorldDirection(new THREE.Vector3())
    const t = (0 - camera.position.z) / dir.z
    expect(camera.position.x + dir.x * t).toBeCloseTo(x, 4)
  })
})
