import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import type { Pet } from '#/lib/creatures/creature'
import type { DenSlot, OutfitSlot } from '#/lib/creatures/shop'
import { creatureFor, eyeOpen, headTilt, rigOf } from './pose'
import type { Rig } from './pose'
import { dressCreature } from './shopModels'
import { ROAM_RANGE, HOP, WALK, isHopper, pickRoam, roamTarget } from '#/lib/creatures/denRoam'
import type { RoamState } from '#/lib/creatures/denRoam'
import { FLOOR_Y, clearTarget, clearanceFor, denFootprints, insideAny, pushOutOf, stepAround } from '#/lib/creatures/denProps'
import type { Footprint } from '#/lib/creatures/denProps'

/**
 * Secondary pets that roam the den on desktop (T-0032 Design §4). The current
 * pet keeps its cushion spot in `<Creature>`; these are her other pets.
 * Deterministic per `(petId, session)` so a re-render re-plays. No path finding,
 * but since T-0050 (D-0043) they do keep out of the den's props: the bed, the
 * bowl and whatever she placed. They never walk home to the bed, so for them it
 * is a plain keep-out rather than something to stand on.
 */

const SIZE = 0.3 // target height of a roaming pet in world units

interface Props {
  pets: readonly Pet[]
  dressOf: (petId: string) => Partial<Record<OutfitSlot, string>>
  /** what stands in the den's spots, so the walk can keep out of it (T-0050, D-0043) */
  placed?: Partial<Record<DenSlot, string>>
  session: number
  /** called when a pet is tapped (pet-to-pet) */
  onTap?: (pet: Pet) => void
  /** called when a dragged cookie is dropped on a pet */
  onFeed?: (pet: Pet) => void
}

export function WalkingPets({ pets, dressOf, placed, session, onTap, onFeed }: Props) {
  // roaming positions and toy locks are shared; lift them to a single state
  const positions = useRef(new Map<string, THREE.Vector3>())
  // for these small pets the bed is a keep-out like any other prop (D-0043 §5)
  const placedKey = (['bed', 'toy', 'left', 'right'] as const).map((s) => placed?.[s] ?? '').join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const props = useMemo<Footprint[]>(() => {
    const f = denFootprints(placed ?? {})
    return [...f.hard, { x: f.bed.x, z: f.bed.z, r: f.bed.r }]
  }, [placedKey])
  return (
    <group name="walking-pets">
      {pets.map((p, i) => (
        <WalkingPet
          key={p.id}
          pet={p}
          dress={dressOf(p.id)}
          session={session + i}
          positions={positions}
          props={props}
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
  props,
  onTap,
  onFeed,
}: {
  pet: Pet
  dress: Partial<Record<OutfitSlot, string>>
  session: number
  positions: React.MutableRefObject<Map<string, THREE.Vector3>>
  props: readonly Footprint[]
  onTap: () => void
  onFeed: () => void
}) {
  const rig = useMemo<Rig>(() => rigOf(creatureFor(pet.species, pet.stage, pet.shiny, 'high')), [pet.species, pet.stage, pet.shiny])
  useEffect(() => {
    dressCreature(rig.root, dress ?? {}, 'high')
  }, [rig, dress])
  const scale = SIZE / Math.max(0.1, rig.height)
  const clear = clearanceFor(SIZE)
  const holder = useRef<THREE.Group>(null)
  const blink = useRef({ next: 2 + Math.random() * 3 })
  const state = useRef<{ s: RoamState; until: number; target: THREE.Vector3; counter: number } | null>(null)
  const pos = useRef<THREE.Vector3>(
    positions.current.get(pet.id) ??
      (() => {
        // start near a seeded point in the walkable rectangle, clear of the den's props
        const t = roamTarget(pet.id, session, 0)
        const c = clearTarget(t.x, t.z, props, clear, ROAM_RANGE)
        const v = new THREE.Vector3(c.x, FLOOR_Y, c.z)
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
      const seeded = roamTarget(pet.id, session, counter)
      // repaired against the den's props, so the pet never walks to a spot inside one (D-0043)
      const tgt = clearTarget(seeded.x, seeded.z, props, clear, ROAM_RANGE)
      state.current = s = {
        s: pick.state,
        until: t + pick.secs,
        target: new THREE.Vector3(tgt.x, FLOOR_Y, tgt.z),
        counter,
      }
      invalidate()
    }

    const h = holder.current
    if (!h) return

    // a prop placed where the pet stands: ease it out at its own walking speed (D-0043 §2)
    const speed = hop ? HOP : WALK
    if (insideAny(pos.current.x, pos.current.z, props, clear)) {
      const free = pushOutOf(pos.current.x, pos.current.z, props, clear, speed * d)
      pos.current.x = free.x
      pos.current.z = free.z
    }
    // walk toward target when roaming (hoppers hop)
    if (s.s === 'roam') {
      const dist = Math.hypot(s.target.x - pos.current.x, s.target.z - pos.current.z)
      if (dist > 0.02) {
        // the step walks round a prop instead of through it (D-0043 §2)
        const next = stepAround({ x: pos.current.x, z: pos.current.z }, { x: s.target.x, z: s.target.z }, Math.min(dist, speed * d), props, clear)
        const wentX = next.x - pos.current.x
        const wentZ = next.z - pos.current.z
        pos.current.x = next.x
        pos.current.z = next.z
        // face direction
        const desired = Math.atan2(wentX, wentZ)
        const diff = THREE.MathUtils.euclideanModulo(desired - facing.current + Math.PI, Math.PI * 2) - Math.PI
        if (Math.hypot(wentX, wentZ) > 1e-5) facing.current += diff * Math.min(1, 8 * d)
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
