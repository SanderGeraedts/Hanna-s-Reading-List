import * as THREE from 'three'
import { SPECIES, TIERS } from '#/lib/creatures/species'
import { SPARKLE_SPOTS, drawStar, makeEgg } from './eggModel'
import { creatureFor, poseStill, rigOf } from './pose'
import { STAGES, STILL_SIZE, creatureStill, eggStill } from './stillPaths'

export { stillNames } from './stillPaths'

/**
 * The still pictures (T-0030 Design §1): every creature at every stage, normal
 * and shiny, and the six eggs, rendered from the real models with T-0029's
 * still framing (¾ turned, neutral pose, the block's lights) into transparent
 * 192 × 192 WebP images. Only the dev script `scripts/render-creature-stills.mjs`
 * runs this (in a browser); the app shows the files from `public/creatures/`.
 */

const FOV = 24
const TURN = -0.55
/** rendered at twice the size, then scaled down, for smooth edges */
const RENDER = STILL_SIZE * 2

export function stage3d(): { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setSize(RENDER, RENDER, false)
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight('#ffe8cc', '#4a2f1e', 1.3))
  scene.add(new THREE.AmbientLight('#ffdcb4', 0.28))
  const key = new THREE.DirectionalLight('#ffdcae', 2.4)
  key.position.set(-3, 4, 5)
  scene.add(key)
  const back = new THREE.DirectionalLight('#fff3e0', 0.5)
  back.position.set(0, 3, -4)
  scene.add(back)
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 20)
  camera.position.set(0, 0.55, 3.2)
  camera.lookAt(0, 0.5, 0)
  return { renderer, scene, camera }
}

export function toWebp(
  gl: HTMLCanvasElement,
  extra?: (g: CanvasRenderingContext2D) => void,
  under?: (g: CanvasRenderingContext2D) => void,
  size: { w: number; h: number } = { w: STILL_SIZE, h: STILL_SIZE },
): string {
  const c = document.createElement('canvas')
  c.width = size.w
  c.height = size.h
  const g = c.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  under?.(g)
  g.drawImage(gl, 0, 0, size.w, size.h)
  extra?.(g)
  return c.toDataURL('image/webp', 0.9)
}

/** The 8 sparkle stars drawn in at 80 % (Design §4), around a creature filling the tile. */
function sparkle(g: CanvasRenderingContext2D) {
  const cx = STILL_SIZE / 2
  for (const s of SPARKLE_SPOTS) {
    // a ring seen from the front: x from the angle, y from the height (1 = top of the tile)
    const x = cx + Math.cos(s.angle) * STILL_SIZE * 0.4
    const y = STILL_SIZE * (1 - s.y * 0.82) + Math.sin(s.angle) * STILL_SIZE * 0.05
    drawStar(g, x, y, s.size * STILL_SIZE * 0.6, '#f4d68c', 0.8)
  }
}

/** The legendary egg's soft gold glow behind it. */
function halo(g: CanvasRenderingContext2D) {
  const grad = g.createRadialGradient(STILL_SIZE / 2, STILL_SIZE * 0.52, 0, STILL_SIZE / 2, STILL_SIZE * 0.52, STILL_SIZE * 0.48)
  grad.addColorStop(0, 'rgba(244,214,140,0.7)')
  grad.addColorStop(0.5, 'rgba(244,214,140,0.25)')
  grad.addColorStop(1, 'rgba(244,214,140,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, STILL_SIZE, STILL_SIZE)
}

/** Renders every still; answers file name → data URL (image/webp). */
export function renderAllStills(): Record<string, string> {
  const { renderer, scene, camera } = stage3d()
  const out: Record<string, string> = {}
  const holder = new THREE.Group()
  scene.add(holder)
  for (const s of SPECIES)
    for (const stage of STAGES)
      for (const shiny of [false, true]) {
        holder.clear()
        const rig = rigOf(creatureFor(s.id, stage, shiny, 'high'))
        poseStill(rig, null)
        // about 1 unit tall whatever the stage, so every stage fills the tile (as the block's still)
        const g = new THREE.Group()
        g.scale.setScalar(1.0 / rig.height)
        g.position.set(0, -0.05, 0)
        g.rotation.set(0.12, TURN, 0)
        g.add(rig.root)
        holder.add(g)
        renderer.render(scene, camera)
        out[creatureStill(s.id, stage, shiny).slice('/creatures/'.length)] = toWebp(renderer.domElement, shiny ? sparkle : undefined)
      }
  for (const t of TIERS) {
    holder.clear()
    const egg = makeEgg(t)
    const g = new THREE.Group()
    g.scale.setScalar(1.55)
    g.position.set(0, 0.1, 0)
    egg.root.rotation.z = (6 * Math.PI) / 180
    g.add(egg.root)
    holder.add(g)
    renderer.render(scene, camera)
    out[eggStill(t).slice('/creatures/'.length)] = toWebp(renderer.domElement, undefined, t === 'legendary' ? halo : undefined)
  }
  renderer.dispose()
  return out
}
