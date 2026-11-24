import { Canvas, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Mood, Stage } from '#/lib/creatures/creature'
import type { SpeciesId } from '#/lib/creatures/species'
import { StillEgg } from './DenScene'
import { creatureFor, poseStill, rigOf } from './pose'
import type { OutfitSlot } from '#/lib/creatures/shop'
import { dressCreature } from './shopModels'

/**
 * The dashboard block's small still picture (T-0029 Design §8): the creature
 * (or the welcome egg), ¾ turned, framed to fill its round tile whatever the
 * stage, without the den. Rendered once (`frameloop="demand"`) and again only
 * when the creature, stage, mood or palette changes: it never moves.
 */

export type StillShows =
  | { kind: 'egg' }
  | { kind: 'creature'; species: SpeciesId; shiny: boolean; stage: Stage; mood: Mood | null; dress?: Partial<Record<OutfitSlot, string>> }

const FOV = 24
const TURN = -0.55

export function CreatureStill({ shows, phone }: { shows: StillShows; phone: boolean }) {
  return (
    <Canvas
      className="still-canvas"
      aria-hidden="true"
      tabIndex={-1}
      frameloop="demand"
      shadows={false}
      dpr={phone ? [1, 1.5] : [1, 2]}
      camera={{ fov: FOV, position: [0, 0.55, 3.2], near: 0.1, far: 20 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
    >
      <Frame />
      <hemisphereLight args={['#ffe8cc', '#4a2f1e', 1.3]} />
      <ambientLight intensity={0.28} color="#ffdcb4" />
      <directionalLight position={[-3, 4, 5]} intensity={2.4} color="#ffdcae" />
      <directionalLight position={[0, 3, -4]} intensity={0.5} color="#fff3e0" />
      {shows.kind === 'egg' ? (
        <group scale={1.55} position={[0, 0.1, 0]}>
          <StillEgg phone={phone} />
        </group>
      ) : (
        <Still species={shows.species} shiny={shows.shiny} stage={shows.stage} mood={shows.mood} phone={phone} dress={shows.dress} />
      )}
    </Canvas>
  )
}

function Frame() {
  const { camera, invalidate } = useThree()
  useLayoutEffect(() => {
    camera.lookAt(0, 0.5, 0)
    invalidate()
  }, [camera, invalidate])
  return null
}

function Still({
  species,
  shiny,
  stage,
  mood,
  phone,
  dress,
}: {
  species: SpeciesId
  shiny: boolean
  stage: Stage
  mood: Mood | null
  phone: boolean
  dress?: Partial<Record<OutfitSlot, string>>
}) {
  const rig = useMemo(() => rigOf(creatureFor(species, stage, shiny, phone ? 'low' : 'high')), [species, stage, shiny, phone])
  const { invalidate } = useThree()
  useLayoutEffect(() => {
    poseStill(rig, mood)
    invalidate()
  }, [rig, mood, invalidate])
  // her pet's outfits (T-0031 §7): rendered again when one changes
  const dressKey = JSON.stringify(dress ?? {})
  useLayoutEffect(() => {
    dressCreature(rig.root, dress ?? {}, phone ? 'low' : 'high')
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, dressKey, phone, invalidate])
  // about 1 unit tall whatever the stage, so every stage fills the tile
  const scale = 1.0 / rig.height
  return (
    <group scale={scale} position={[0, -0.05, 0]} rotation={[0.12, TURN, 0]}>
      <primitive object={rig.root} />
    </group>
  )
}
