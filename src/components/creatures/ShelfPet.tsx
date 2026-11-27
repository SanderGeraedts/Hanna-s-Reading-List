import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { SpeciesId } from '#/lib/creatures/species'
import type { Stage } from '#/lib/creatures/creature'
import type { OutfitSlot } from '#/lib/creatures/shop'
import { creatureFor, rigOf } from './pose'
import { dressCreature } from './shopModels'
import { sparkleTexture } from './eggModel'

/**
 * The favourite creature on the top shelf (T-0033 §8c–§8d). Keeps a short
 * state machine of its own (sit · yawn · stretch · sleep), reacts to her
 * reading (cheer on a finish day, point at a reading book), and holds a sign
 * on streak days. Never walks the shelf. At night it nods off sitting up, with
 * a little pile of books beside it (T-0119): it never tips over.
 */

export interface ShelfPetShows {
  species: SpeciesId
  stage: Stage
  shiny: boolean
  name: string
  /** her outfit on this pet */
  dress?: Partial<Record<OutfitSlot, string>>
  /** the night mode (22:30 – 07:00 shelf) */
  night: boolean
  /** cheer once on first draw after a finish day */
  cheer: boolean
  /** called when the cheer has played (so the page sets its storage flag) */
  onCheered?: () => void
  /** streak day count, or 0 for no sign */
  streak: number
  /** mid-day point at a reading book on another shelf, 0 for no point */
  pointAt: boolean
}

const SIZE: Record<Stage, number> = { baby: 0.12, young: 0.17, grown: 0.22 }
const OUTFIT_KEYS: readonly OutfitSlot[] = ['head', 'face', 'neck', 'back']

export function ShelfPet({ shows, phone }: { shows: ShelfPetShows; phone: boolean }) {
  const q = phone ? 'low' : 'high'
  const rig = useMemo(() => rigOf(creatureFor(shows.species, shows.stage, shows.shiny, q)), [shows.species, shows.stage, shows.shiny, q])
  // outfits
  useEffect(() => {
    dressCreature(rig.root, shows.dress ?? {}, q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, OUTFIT_KEYS.map((k) => shows.dress?.[k] ?? '').join('|'), q])

  const scale = SIZE[shows.stage] / Math.max(0.1, rig.height)
  const holder = useRef<THREE.Group>(null)
  const blink = useRef({ next: 2 + Math.random() * 3 })
  const cheerStart = useRef<number | null>(null)
  const cheered = useRef(false)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pose = shelfPetPose(shows.night, t)
    // breathing: slower and deeper while asleep
    if (rig.body) rig.body.scale.set(rig.base.body.x, rig.base.body.y * pose.breathe, rig.base.body.z)
    // asleep it stays sitting, head drooped forward and a little to the side: it never tips over
    if (rig.head) rig.head.rotation.set(rig.base.head.x + pose.headX, rig.base.head.y, rig.base.head.z + pose.headZ)
    // blink
    let open = 1
    if (t >= blink.current.next) {
      if (t < blink.current.next + 0.15) open = 0.1
      else blink.current.next = t + 4 + Math.random() * 3
    }
    open = Math.min(open, pose.eyesOpen)
    if (rig.eyes) rig.eyes.scale.set(rig.base.eyes.x, rig.base.eyes.y * open, rig.base.eyes.z)

    // arms back where they were built, before a cheer or a point raises one
    const armL = rig.root.getObjectByName('part:armL')
    const armR = rig.root.getObjectByName('part:armR')
    if (armL) armL.rotation.x = 0
    if (armR) armR.rotation.x = 0
    if (holder.current) holder.current.position.y = 0

    // cheer: hop + arms up for 0.5 s
    if (shows.cheer && !cheered.current) {
      if (cheerStart.current === null) cheerStart.current = t
      const k = t - cheerStart.current
      if (k < 0.5) {
        if (holder.current) holder.current.position.y = Math.sin((k / 0.5) * Math.PI) * 0.06
        if (armL) armL.rotation.x = -1.0
        if (armR) armR.rotation.x = -1.0
      } else {
        cheered.current = true
        shows.onCheered?.()
      }
    } else if (shows.pointAt && !shows.night) {
      // point at the reading book: right paw raised (not in its sleep)
      if (armR) armR.rotation.x = -0.9
    }
  })

  return (
    <>
      <group ref={holder} scale={scale}>
        <primitive object={rig.root} />
        {shows.streak > 0 && <StreakSign n={shows.streak} />}
        {shows.shiny && <ShelfSparkles height={rig.height} />}
      </group>
      {/* beside the pet on the shelf, in shelf units: not scaled with the pet, not under it */}
      {shows.night && <BookPile phone={phone} />}
    </>
  )
}

/**
 * How the pet holds itself (T-0119): awake it sits up and breathes gently; asleep it still
 * sits, head drooped forward and tipped a little to one side with a slow nod, eyes shut,
 * and slower, deeper breaths. Rotations in radians, added to the pose it was built with.
 */
export function shelfPetPose(night: boolean, t: number): { headX: number; headZ: number; breathe: number; eyesOpen: number } {
  if (!night) return { headX: 0, headZ: 0, breathe: 1 + 0.015 * Math.sin((t / 4) * Math.PI * 2), eyesOpen: 1 }
  const nod = Math.sin((t / 6) * Math.PI * 2)
  return { headX: 0.38 + 0.04 * nod, headZ: 0.16, breathe: 1 + 0.03 * nod, eyesOpen: 0.05 }
}

/** Where the night book pile sits, in shelf units: behind the pet and to its right, on the shelf. */
export const BOOK_PILE_AT: readonly [number, number, number] = [0.045, 0, -0.075]

function BookPile({ phone }: { phone: boolean }) {
  const colors = ['#b85a3a', '#5a7fb2', '#b29149'] as const
  const boxes = phone ? 1 : 3
  return (
    <group position={BOOK_PILE_AT} rotation={[0, 0.35, 0]}>
      {Array.from({ length: boxes }, (_, i) => (
        <mesh key={i} position={[0.004 * (i % 2), 0.012 * (i + 0.5), 0]} rotation={[0, i * 0.12, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.07, 0.012, 0.05]} />
          <meshStandardMaterial color={colors[i % colors.length]} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

function StreakSign({ n }: { n: number }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 64
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#f4efe6'
    ctx.fillRect(0, 0, 64, 64)
    ctx.fillStyle = '#332b24'
    ctx.font = '700 36px Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(n), 32, 36)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [n])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <group position={[0.05, 0.08, 0.02]} rotation={[0, -0.2, 0]}>
      <mesh>
        <boxGeometry args={[0.04, 0.04, 0.003]} />
        <meshStandardMaterial map={texture} roughness={0.9} />
      </mesh>
    </group>
  )
}

function ShelfSparkles({ height }: { height: number }) {
  const tex = sparkleTexture()
  return (
    <sprite position={[0, height * 0.9, 0]} scale={[0.04, 0.04, 1]}>
      <spriteMaterial map={tex} transparent opacity={0.8} depthWrite={false} toneMapped={false} />
    </sprite>
  )
}
