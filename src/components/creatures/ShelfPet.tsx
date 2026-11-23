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
 * on streak days. Never walks the shelf.
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
    // breathing
    if (rig.body) {
      const b = 1 + 0.015 * Math.sin((t / 4) * Math.PI * 2)
      rig.body.scale.set(rig.base.body.x, rig.base.body.y * b, rig.base.body.z)
    }
    // blink
    let open = 1
    if (t >= blink.current.next) {
      if (t < blink.current.next + 0.15) open = 0.1
      else blink.current.next = t + 4 + Math.random() * 3
    }
    // sleep: eyes almost shut, lie down a bit (rotate z 90°)
    if (shows.night) {
      open = Math.min(open, 0.05)
      if (holder.current) holder.current.rotation.z = Math.PI / 2
    } else if (holder.current) {
      holder.current.rotation.z = 0
    }
    if (rig.eyes) rig.eyes.scale.set(rig.base.eyes.x, rig.base.eyes.y * open, rig.base.eyes.z)

    // cheer: hop + arms up for 0.5 s
    if (shows.cheer && !cheered.current) {
      if (cheerStart.current === null) cheerStart.current = t
      const k = t - cheerStart.current
      if (k < 0.5) {
        if (holder.current) holder.current.position.y = Math.sin((k / 0.5) * Math.PI) * 0.06
        const armL = rig.root.getObjectByName('part:armL')
        const armR = rig.root.getObjectByName('part:armR')
        if (armL) armL.rotation.x = -1.0
        if (armR) armR.rotation.x = -1.0
      } else {
        cheered.current = true
        shows.onCheered?.()
      }
    } else if (shows.pointAt) {
      // point at the reading book: right paw raised
      const armR = rig.root.getObjectByName('part:armR')
      if (armR) armR.rotation.x = -0.9
    }
  })

  return (
    <group ref={holder} scale={scale}>
      <primitive object={rig.root} />
      {shows.night && <BookPile phone={phone} />}
      {shows.streak > 0 && <StreakSign n={shows.streak} />}
      {shows.shiny && <ShelfSparkles height={rig.height} />}
    </group>
  )
}

function BookPile({ phone }: { phone: boolean }) {
  const colors = ['#b85a3a', '#5a7fb2', '#b29149'] as const
  const boxes = phone ? 1 : 3
  return (
    <group position={[0, -0.01, 0]}>
      {Array.from({ length: boxes }, (_, i) => (
        <mesh key={i} position={[0, 0.015 * (i + 0.5), 0]}>
          <boxGeometry args={[0.09, 0.015, 0.07]} />
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
