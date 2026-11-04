import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { DIVIDER, SHELF } from '#/lib/shelfLayout'
import type { DividerSlot } from '#/lib/shelfLayout'
import { toTexture } from './textures'

/**
 * Series dividers: slim walnut shelf markers, shorter than the books, with an
 * ivory label on the front naming the series that follows (read like a spine)
 * and a small brass knob on top. Origin is the bottom-centre, front towards +z.
 */
export function SeriesDividers({ items }: { items: DividerSlot[] }) {
  return (
    <>
      {items.map((d) => (
        <PlacedDivider key={d.label} slot={d} />
      ))}
    </>
  )
}

// front flush with the books' spines
const DIVIDER_Z = SHELF.depth / 2 - DIVIDER.depth / 2 - 0.012

function PlacedDivider({ slot }: { slot: DividerSlot }) {
  const group = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const d = Math.min(dt, 0.05)
    g.position.x = THREE.MathUtils.damp(g.position.x, slot.x, 8, d)
    g.position.y = THREE.MathUtils.damp(g.position.y, slot.floorY, 8, d)
  })
  return (
    <group ref={group} position={[slot.x, slot.floorY, DIVIDER_Z]}>
      <Divider label={slot.label} />
    </group>
  )
}

const W = DIVIDER.width
const H = DIVIDER.height
const D = DIVIDER.depth
const PLINTH = 0.012 // the foot it stands on
const KNOB = 0.0085 // radius of the brass knob
const PLATE = { w: W - 0.007, h: H - PLINTH - 0.022, inset: 0.0006 }

let shared: { wood: THREE.Material; plinth: THREE.Material; brass: THREE.Material } | null = null
function sharedMaterials() {
  shared ??= {
    wood: new THREE.MeshStandardMaterial({ color: '#5b3a24', roughness: 0.55 }),
    plinth: new THREE.MeshStandardMaterial({ color: '#3f2716', roughness: 0.6 }),
    brass: new THREE.MeshStandardMaterial({ color: '#d4a64e', metalness: 1, roughness: 0.28 }),
  }
  return shared
}

function Divider({ label }: { label: string }) {
  const mats = sharedMaterials()
  const plate = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: labelTexture(label),
        roughness: 0.45,
        // a little glow so the label stays readable in the shelf's shade
        emissive: '#ffffff',
        emissiveIntensity: 0.12,
        emissiveMap: labelTexture(label),
      }),
    [label],
  )
  const bodyH = H - PLINTH
  return (
    <group>
      {/* foot: a touch wider and deeper than the board */}
      <mesh castShadow receiveShadow material={mats.plinth} position={[0, PLINTH / 2, 0]}>
        <boxGeometry args={[W + 0.008, PLINTH, D + 0.008]} />
      </mesh>
      {/* the walnut board */}
      <mesh castShadow receiveShadow material={mats.wood} position={[0, PLINTH + bodyH / 2, 0]}>
        <boxGeometry args={[W, bodyH, D]} />
      </mesh>
      {/* brass cap along the top edge */}
      <mesh castShadow material={mats.brass} position={[0, H + 0.0015, 0]}>
        <boxGeometry args={[W + 0.002, 0.003, D + 0.002]} />
      </mesh>
      {/* knob at the front of the cap */}
      <mesh castShadow material={mats.brass} position={[0, H + 0.003 + KNOB * 0.7, D / 2 - KNOB * 1.6]}>
        <sphereGeometry args={[KNOB, 20, 14]} />
      </mesh>
      {/* brass frame and ivory label on the front */}
      <mesh material={mats.brass} position={[0, PLINTH + bodyH / 2, D / 2 + PLATE.inset / 2]}>
        <boxGeometry args={[PLATE.w + 0.0025, PLATE.h + 0.0025, PLATE.inset]} />
      </mesh>
      <mesh material={plate} position={[0, PLINTH + bodyH / 2, D / 2 + PLATE.inset + 0.0002]}>
        <planeGeometry args={[PLATE.w, PLATE.h]} />
      </mesh>
    </group>
  )
}

const labelCache = new Map<string, THREE.Texture>()

/** Ivory label with the name running down it, like the title on a spine. */
function labelTexture(label: string) {
  const hit = labelCache.get(label)
  if (hit) return hit
  const PX = 6000 // pixels per metre
  const c = document.createElement('canvas')
  c.width = Math.round(PLATE.w * PX)
  c.height = Math.round(PLATE.h * PX)
  const ctx = c.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, c.width, 0)
  grad.addColorStop(0, '#e9dcc0')
  grad.addColorStop(0.5, '#f7eedb')
  grad.addColorStop(1, '#e4d5b6')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, c.width, c.height)
  // thin rules near the ends, like a bookplate
  ctx.fillStyle = '#9a7a45'
  ctx.fillRect(c.width * 0.2, 10, c.width * 0.6, 3)
  ctx.fillRect(c.width * 0.2, c.height - 13, c.width * 0.6, 3)

  // the text runs top to bottom, turned like a spine title
  ctx.save()
  ctx.translate(c.width / 2, c.height / 2)
  ctx.rotate(Math.PI / 2)
  const room = c.height - 56
  let size = Math.round(c.width * 0.62)
  const font = (s: number) => `italic 600 ${s}px Georgia, "Times New Roman", serif`
  ctx.font = font(size)
  while (ctx.measureText(label).width > room && size > c.width * 0.36) ctx.font = font(--size)
  let text = label
  if (ctx.measureText(text).width > room) {
    while (text.length > 1 && ctx.measureText(text + '…').width > room) text = text.slice(0, -1)
    text = text.trimEnd() + '…'
  }
  ctx.fillStyle = '#3a2614'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 0, size * 0.06)
  ctx.restore()

  const t = toTexture(c)
  labelCache.set(label, t)
  return t
}
