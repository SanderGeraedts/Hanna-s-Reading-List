import * as THREE from 'three'
import { COSY, SHOP_ITEMS } from '#/lib/creatures/shop'
import type { HabitatId, OutfitSlot, RoomDecorId } from '#/lib/creatures/shop'
import { HABITAT_STILL, STILL_SIZE, shopStill } from './stillPaths'
import { stage3d, toWebp } from './stills'
import { buildDefaultBed, buildDefaultRug, buildDenItem, buildFood, buildRoom, buildRoomDecor, denCamera, dressCreature, outfitModel } from './shopModels'
import { creatureFor, poseStill, rigOf } from './pose'

/**
 * The shop's still pictures (T-0031 Design §10), rendered from the same models
 * the den draws, with T-0030's still framing and lights: each item ¾ turned,
 * alone, in a transparent 192 × 192 WebP; each habitat (and the Cosy den) as
 * the empty den, 320 × 200, opaque. Eggs reuse T-0030's egg pictures. Only the
 * dev script `pnpm run render:creatures -- --shop` runs this.
 */

const TURN = -0.55

/** The file names this renders (`shop/<id>.webp`): every item but the eggs, and the Cosy den. */
export function shopStillNames(): string[] {
  return [...SHOP_ITEMS.filter((i) => i.category !== 'eggs').map((i) => i.id), COSY.id].map((id) => shopStill(id).slice('/creatures/'.length))
}

/** Scales and centres a model so its largest side is `size` units, its middle at the camera's aim. */
function fit(o: THREE.Object3D, size = 1.0): THREE.Group {
  const g = new THREE.Group()
  g.add(o)
  o.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(o, true)
  const dims = box.getSize(new THREE.Vector3())
  const centre = box.getCenter(new THREE.Vector3())
  const k = size / Math.max(dims.x, dims.y, dims.z)
  o.position.sub(centre)
  const out = new THREE.Group()
  out.add(g)
  g.scale.setScalar(k)
  out.position.set(0, 0.5, 0)
  return out
}

function itemModel(id: string, category: string, slot?: string): { obj: THREE.Object3D; turn: number; tilt: number; size: number } {
  if (category === 'food') return { obj: buildFood(id, 'high'), turn: TURN, tilt: 0.45, size: 0.95 }
  if (category === 'outfits') {
    const m = outfitModel(id, 'high')
    // back pieces face +z out of the back (the anchor is turned π), so every piece shows its outside
    const back = (slot as OutfitSlot) === 'back'
    return { obj: m, turn: back ? 0.5 : TURN * 0.6, tilt: slot === 'neck' ? 0.5 : 0.18, size: 0.95 }
  }
  if (category === 'room') return { obj: buildRoomDecor(id as RoomDecorId), turn: TURN * 0.5, tilt: 0.15, size: 0.95 }
  const g = buildDenItem(id, 'high', { sky: 'day', weather: 'sun' })
  // the lamp's wall glow belongs to the den, not the picture
  g.children.filter((c) => (c as THREE.Sprite).isSprite).forEach((c) => c.removeFromParent())
  const flat = id === 'star-rug'
  return { obj: g, turn: id === 'weather-window' || id === 'fairy-lights' ? -0.25 : TURN, tilt: flat ? 0.9 : 0.18, size: id === 'fairy-lights' ? 1.1 : 0.95 }
}

/** The empty den in a habitat, as the den's camera sees it (16:10). */
function habitatStill(h: HabitatId): string {
  const W = HABITAT_STILL.w * 2
  const H = HABITAT_STILL.h * 2
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(W, H, false)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight('#ffe8cc', '#4a2f1e', 1.3))
  scene.add(new THREE.AmbientLight('#ffdcb4', 0.55))
  const key = new THREE.DirectionalLight('#ffdcae', 2.2)
  key.position.set(-2.5, 4, 3)
  scene.add(key)
  const back = new THREE.DirectionalLight('#fff3e0', 0.5)
  back.position.set(0, 3, -4)
  scene.add(back)
  scene.add(buildRoom(h, 'high'), buildDefaultRug('high'), buildDefaultBed('high'))
  renderer.render(scene, denCamera(W / H))
  const out = toWebp(renderer.domElement, undefined, undefined, HABITAT_STILL)
  renderer.dispose()
  return out
}

/** Renders every shop picture; answers file name → data URL (image/webp). */
export function renderShopStills(): Record<string, string> {
  const { renderer, scene, camera } = stage3d()
  const out: Record<string, string> = {}
  const holder = new THREE.Group()
  scene.add(holder)
  for (const i of SHOP_ITEMS) {
    if (i.category === 'eggs') continue
    const name = shopStill(i.id).slice('/creatures/'.length)
    if (i.category === 'habitats') {
      out[name] = habitatStill(i.id as HabitatId)
      continue
    }
    holder.clear()
    const { obj, turn, tilt, size } = itemModel(i.id, i.category, i.slot)
    obj.rotation.set(tilt, turn, 0)
    holder.add(fit(obj, size))
    renderer.render(scene, camera)
    out[name] = toWebp(renderer.domElement)
  }
  out[shopStill(COSY.id).slice('/creatures/'.length)] = habitatStill('cosy')
  renderer.dispose()
  return out
}

export { STILL_SIZE }

/**
 * The contact sheet of Design §15.7 (dev only, for the UX review): each of the 12 outfits on the
 * house cat, the Adélie penguin, the koala, the book dragon and the starlight unicorn, grown-up,
 * ¾ turned, on one transparent PNG (a row per creature, a column per outfit).
 */
export function renderOutfitSheet(tile = 200): { url: string; rows: string[]; cols: string[] } {
  const rows = ['cat', 'adelie-penguin', 'koala', 'book-dragon', 'starlight-unicorn'] as const
  const cols = SHOP_ITEMS.filter((i) => i.category === 'outfits')
  const { renderer, scene, camera } = stage3d()
  const sheet = document.createElement('canvas')
  sheet.width = tile * cols.length
  sheet.height = tile * rows.length
  const g2 = sheet.getContext('2d')!
  const holder = new THREE.Group()
  scene.add(holder)
  rows.forEach((species, r) =>
    cols.forEach((item, c) => {
      holder.clear()
      const rig = rigOf(creatureFor(species, 'grown', false, 'high'))
      poseStill(rig, null)
      dressCreature(rig.root, { [item.slot as OutfitSlot]: item.id }, 'high')
      const g = new THREE.Group()
      g.scale.setScalar(0.92 / rig.height)
      g.position.set(0, 0.0, 0)
      // back pieces are seen from behind, the rest ¾ from the front
      g.rotation.set(0.12, item.slot === 'back' ? Math.PI - 0.7 : TURN, 0)
      g.add(rig.root)
      holder.add(g)
      renderer.render(scene, camera)
      g2.drawImage(renderer.domElement, c * tile, r * tile, tile, tile)
    }),
  )
  renderer.dispose()
  return { url: sheet.toDataURL('image/png'), rows: [...rows], cols: cols.map((i) => i.name) }
}
