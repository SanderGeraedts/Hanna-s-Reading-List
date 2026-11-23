import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { SpeciesId } from '#/lib/creatures/species'
import { creatureFor, rigOf, usePageVisible } from './pose'

/**
 * The five creatures of *Choose your first creature* (T-0029 Design §3b) in
 * ONE canvas behind the grid of tiles (browsers allow only about 16
 * canvases): each the grown-up in its normal palette, ¾ turned. The picked one
 * turns slowly to face her (computer) or does one small hop (phone); with
 * reduce motion it holds still. Rendered on demand: nothing moves otherwise.
 */

export interface Tile {
  x: number
  y: number
  size: number
}

interface Props {
  species: readonly SpeciesId[]
  tiles: Tile[]
  picked: SpeciesId | null
  phone: boolean
  reduce: boolean
}

/** ¾ turned, like the den. */
const THREE_QUARTER = -0.55
const TILT = 0.17

export function ChooseScene({ species, tiles, picked, phone, reduce }: Props) {
  const visible = usePageVisible()
  return (
    <Canvas
      className="choose-canvas"
      aria-hidden="true"
      tabIndex={-1}
      frameloop={visible ? 'demand' : 'never'}
      shadows={false}
      dpr={phone ? [1, 1.5] : [1, 2]}
      orthographic
      camera={{ position: [0, 0, 1000], near: 1, far: 2000 }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
      // drawn over the tiles, but every tap goes through to them
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <PixelCamera />
      <hemisphereLight args={['#ffe8cc', '#4a2f1e', 1.3]} />
      <ambientLight intensity={0.28} color="#ffdcb4" />
      <directionalLight position={[-3, 4, 5]} intensity={2.4} color="#ffdcae" />
      <directionalLight position={[0, 3, -4]} intensity={0.5} color="#fff3e0" />
      {species.map((s, i) =>
        tiles[i]?.size ? <Choice key={s} species={s} tile={tiles[i]} picked={picked === s} phone={phone} reduce={reduce} /> : null,
      )}
    </Canvas>
  )
}

/** An orthographic camera in CSS pixels: (0, 0) is the grid's top-left corner, y down is negative. */
function PixelCamera() {
  const { camera, size, invalidate } = useThree()
  useLayoutEffect(() => {
    const cam = camera as THREE.OrthographicCamera
    cam.left = 0
    cam.right = size.width
    cam.top = 0
    cam.bottom = -size.height
    cam.updateProjectionMatrix()
    invalidate()
  }, [camera, size, invalidate])
  return null
}

function Choice({ species, tile, picked, phone, reduce }: { species: SpeciesId; tile: Tile; picked: boolean; phone: boolean; reduce: boolean }) {
  const rig = useMemo(() => rigOf(creatureFor(species, 'grown', false, phone ? 'low' : 'high')), [species, phone])
  const turn = useRef<THREE.Group>(null)
  const hop = useRef<THREE.Group>(null)
  const since = useRef<number | null>(null)
  const { invalidate } = useThree()
  const was = useRef(picked)
  if (was.current !== picked) {
    was.current = picked
    since.current = null
  }
  useLayoutEffect(() => invalidate(), [picked, invalidate])

  useFrame(({ clock }) => {
    if (!turn.current || !hop.current) return
    const target = picked && !phone ? 0 : THREE_QUARTER
    if (reduce) {
      turn.current.rotation.y = target
      hop.current.position.y = 0
      return
    }
    if (since.current === null) since.current = clock.elapsedTime
    const k = clock.elapsedTime - since.current
    // the computer: turn to face her in about a second
    const r = turn.current.rotation.y
    const next = r + (target - r) * Math.min(1, 0.12)
    turn.current.rotation.y = Math.abs(target - next) < 0.002 ? target : next
    // the phone: one small hop
    hop.current.position.y = picked && phone && k < 0.45 ? Math.sin((k / 0.45) * Math.PI) * 0.08 : 0
    if (turn.current.rotation.y !== target || (picked && phone && k < 0.5)) invalidate()
  })

  // fill 78 % of the square, standing on its lower part
  const scale = (tile.size * 0.78) / rig.height
  return (
    <group position={[tile.x, -tile.y - tile.size * 0.4, 0]} scale={scale} rotation={[TILT, 0, 0]}>
      <group ref={hop}>
        <group ref={turn} rotation={[0, THREE_QUARTER, 0]}>
          <primitive object={rig.root} />
        </group>
      </group>
    </group>
  )
}
