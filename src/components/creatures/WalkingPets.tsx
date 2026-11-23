import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { Pet } from '#/lib/creatures/creature'
import type { OutfitSlot } from '#/lib/creatures/shop'
import { creatureFor, eyeOpen, headTilt, rigOf } from './pose'
import type { Rig } from './pose'
import { dressCreature } from './shopModels'
import { HOP, WALK, isHopper, pickRoam, roamTarget } from '#/lib/creatures/denRoam'
import type { RoamState } from '#/lib/creatures/denRoam'

/**
 * Secondary pets that roam the den on desktop (T-0032 Design §4). The current
 * pet keeps its cushion spot in `<Creature>`; these are her other pets.
 * Deterministic per `(petId, session)` so a re-render re-plays. No path finding,
 * no collisions.
 */

const SIZE = 0.3 // target height of a roaming pet in world units

interface Props {
  pets: readonly Pet[]
  dressOf: (petId: string) => Partial<Record<OutfitSlot, string>>
  session: number
  /** called when a pet is tapped (pet-to-pet) */
  onTap?: (pet: Pet) => void
  /** called when a dragged cookie is dropped on a pet */
  onFeed?: (pet: Pet) => void
}

export function WalkingPets({ pets, dressOf, session, onTap, onFeed }: Props) {
  // roaming positions and toy locks are shared; lift them to a single state
  const positions = useRef(new Map<string, THREE.Vector3>())
  return (
    <group name="walking-pets">
      {pets.map((p, i) => (
        <WalkingPet
          key={p.id}
          pet={p}
          dress={dressOf(p.id)}
          session={session + i}
          positions={positions}
          onTap={() => onTap?.(p)}
          onFeed={() => onFeed?.(p)}
        />
      ))}
    </group>
  )
}

function WalkingPet({
  pet,
  dress,
  session,
  positions,
  onTap,
  onFeed,
}: {
  pet: Pet
  dress: Partial<Record<OutfitSlot, string>>
  session: number
  positions: React.MutableRefObject<Map<string, THREE.Vector3>>
  onTap: () => void
  onFeed: () => void
}) {
  const rig = useMemo<Rig>(() => rigOf(creatureFor(pet.species, pet.stage, pet.shiny, 'high')), [pet.species, pet.stage, pet.shiny])
  useEffect(() => {
    dressCreature(rig.root, dress ?? {}, 'high')
  }, [rig, dress])
  const scale = SIZE / Math.max(0.1, rig.height)
  const holder = useRef<THREE.Group>(null)
  const blink = useRef({ next: 2 + Math.random() * 3 })
  const state = useRef<{ s: RoamState; until: number; target: THREE.Vector3; counter: number } | null>(null)
  const pos = useRef<THREE.Vector3>(
    positions.current.get(pet.id) ??
      (() => {
        // start near a seeded point in the walkable rectangle
        const t = roamTarget(pet.id, session, 0)
        const v = new THREE.Vector3(t.x, 0.01, t.z)
        positions.current.set(pet.id, v)
        return v
      })(),
  )
  const facing = useRef(0)
  const hop = isHopper(pet.species)
  const { invalidate } = useThree()

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const d = Math.min(dt, 0.05)
    let s = state.current
    if (!s || t > s.until) {
      const counter = (s?.counter ?? 0) + 1
      const pick = pickRoam(
        {
          petId: pet.id,
          session,
          phone: false,
          reduce: false,
          current: false,
          toyFree: true,
          pairFree: false,
          mood: pet.mood,
          hour: new Date().getHours(),
        },
        counter,
      )
      const tgt = roamTarget(pet.id, session, counter)
      state.current = s = {
        s: pick.state,
        until: t + pick.secs,
        target: new THREE.Vector3(tgt.x, 0.01, tgt.z),
        counter,
      }
      invalidate()
    }

    const h = holder.current
    if (!h) return

    // walk toward target when roaming (hoppers hop)
    if (s.s === 'roam') {
      const dir = new THREE.Vector3().subVectors(s.target, pos.current)
      dir.y = 0
      const dist = dir.length()
      if (dist > 0.02) {
        dir.normalize()
        const speed = hop ? HOP : WALK
        pos.current.addScaledVector(dir, Math.min(dist, speed * d))
        // face direction
        const desired = Math.atan2(dir.x, dir.z)
        const diff = THREE.MathUtils.euclideanModulo(desired - facing.current + Math.PI, Math.PI * 2) - Math.PI
        facing.current += diff * Math.min(1, 8 * d)
        // arm swing + body bob while walking
        const armL = rig.root.getObjectByName('part:armL')
        const armR = rig.root.getObjectByName('part:armR')
        if (armL) armL.rotation.x = Math.sin(t * 2 * Math.PI * 2) * 0.3
        if (armR) armR.rotation.x = -Math.sin(t * 2 * Math.PI * 2) * 0.3
        // hop parabola
        if (hop) {
          const phase = (t * 2) % 1
          h.position.y = pos.current.y + 0.04 * Math.sin(phase * Math.PI)
        } else {
          h.position.y = pos.current.y + 0.015 * Math.sin(t * 2 * Math.PI * 2)
        }
      }
    } else {
      // reset arms to rest for non-walking states
      const armL = rig.root.getObjectByName('part:armL')
      const armR = rig.root.getObjectByName('part:armR')
      if (armL) armL.rotation.x *= 1 - Math.min(1, 6 * d)
      if (armR) armR.rotation.x *= 1 - Math.min(1, 6 * d)
      h.position.y = pos.current.y + (s.s === 'sleep' ? 0.005 : 0.01 * Math.sin(t * Math.PI * 0.5))
    }

    // pair-play: arms up when state is pair
    if (s.s === 'pair') {
      const armL = rig.root.getObjectByName('part:armL')
      const armR = rig.root.getObjectByName('part:armR')
      if (armL) armL.rotation.x = -1.0
      if (armR) armR.rotation.x = -1.0
    }

    h.position.x = pos.current.x
    h.position.z = pos.current.z
    h.rotation.y = facing.current

    // breathing
    if (rig.body) {
      const b = 1 + 0.015 * Math.sin((t / 4) * Math.PI * 2)
      const happy = pet.mood === 'happy' ? 1.02 : 1
      rig.body.scale.set(rig.base.body.x, rig.base.body.y * b * happy, rig.base.body.z)
    }
    // eyes: mood + blink + sleep
    let open = eyeOpen(pet.mood)
    if (s.s === 'sleep') open = Math.min(open, 0.05)
    if (t >= blink.current.next) {
      if (t < blink.current.next + 0.15) open = Math.min(open, 0.1)
      else blink.current.next = t + 4 + Math.random() * 3
    }
    if (rig.eyes) rig.eyes.scale.set(rig.base.eyes.x, rig.base.eyes.y * open, rig.base.eyes.z)
    // head tilt per mood
    const tilt = headTilt(pet.mood)
    if (rig.head) rig.head.rotation.set(rig.base.head.x + tilt.x, rig.base.head.y, rig.base.head.z + tilt.z)
    // sleepy body sway
    if (pet.mood === 'sleepy' && rig.body) rig.body.rotation.z = Math.sin(t * 0.4 * Math.PI * 2) * 0.03
  })

  // save position across re-renders
  useEffect(() => {
    return () => {
      positions.current.set(pet.id, pos.current.clone())
    }
  }, [pet.id, positions])

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onTap()
  }
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    // feed when something is dragged onto us (buttons !== 0 means still dragging)
    if (e.nativeEvent.buttons !== 0) {
      e.stopPropagation()
      onFeed()
    }
  }

  return (
    <group
      ref={holder}
      position={[pos.current.x, 0.01, pos.current.z]}
      scale={scale}
      onPointerDown={onDown}
      onPointerUp={onUp}
      userData={{ petId: pet.id, isPet: true }}
    >
      <primitive object={rig.root} />
    </group>
  )
}
