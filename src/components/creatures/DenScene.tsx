import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Mood, Stage } from '#/lib/creatures/creature'
import type { SpeciesId } from '#/lib/creatures/species'
import { creatureFor, eyeOpen, headTilt, rigOf, usePageVisible } from './pose'
import type { Rig } from './pose'

/**
 * The den (T-0029 Design §5): a cosy corner seen about 10° from above and ¾
 * turned, a rug, a gold cushion where the creature (or the welcome egg) sits
 * and a small food bowl with one 3D cookie per 5 🍪 up to 5. Also the crack
 * of the welcome egg (§3c) and the reactions to a feed (§5) and a level-up (§6).
 *
 * How much moves (§12): on a phone only breathing and blinking, rendered on
 * demand about 20 times a second, `low` quality, no shadow maps; on a computer
 * also a look to the side now and then and the egg's rocking, 60 fps, shadows;
 * with reduce motion nothing idles. It stops (`frameloop="never"`) when the
 * page is hidden or `paused` (the book panel or a sheet over it); leaving the
 * tab unmounts it.
 */

export type DenShows = { kind: 'egg' } | { kind: 'crack'; species: SpeciesId; shiny: boolean } | { kind: 'creature'; species: SpeciesId; shiny: boolean; stage: Stage; mood: Mood | null }

/** A tap reaction: a new `n` starts it again. */
export interface Reaction {
  kind: 'feed' | 'levelup'
  n: number
}

interface Props {
  shows: DenShows
  /** cookies in the bowl */
  cookies: number
  phone: boolean
  reduce: boolean
  /** something is over the den (the book panel, a sheet) */
  paused?: boolean
  reaction?: Reaction | null
  /** the crack has played (or faded) */
  onCrackDone?: () => void
}

const WALL = '#3a2c24'
const SIDE_WALL = '#362c2a'
const FLOOR = '#5a3f2c'
const RUG = '#6e4f8f'
const GOLD = '#d9a85b'
const COOKIE = '#c98a4b'
const BOWL = '#7a5236'
const EGG = '#f3e9d8'

/** Share of the canvas height a creature fills, per stage (Design §5). */
const FILL: Record<Stage, number> = { grown: 0.6, young: 0.46, baby: 0.33 }
const FOV = 30
/** Visible height at the cushion: the grown-up (1 world unit tall) fills 60 % of it. */
const VIEW_H = 1 / FILL.grown
const DISTANCE = VIEW_H / (2 * Math.tan(((FOV / 2) * Math.PI) / 180))
const LOOK = new THREE.Vector3(0, 0.62, 0)
const DOWN = (10 * Math.PI) / 180
const TURN = (32 * Math.PI) / 180
const CAMERA: [number, number, number] = [
  LOOK.x + DISTANCE * Math.sin(TURN) * Math.cos(DOWN),
  LOOK.y + DISTANCE * Math.sin(DOWN),
  LOOK.z + DISTANCE * Math.cos(TURN) * Math.cos(DOWN),
]
/** The cushion's top: where the creature stands. */
const SEAT = 0.1

export function DenScene({ shows, cookies, phone, reduce, paused, reaction, onCrackDone }: Props) {
  const visible = usePageVisible()
  const stopped = paused || !visible
  // a phone or reduce motion: render on demand (the idle asks for frames itself); a computer: every frame
  const frameloop = stopped ? 'never' : phone || reduce ? 'demand' : 'always'
  return (
    <Canvas
      className="den-canvas"
      aria-hidden="true"
      tabIndex={-1}
      frameloop={frameloop}
      shadows={!phone}
      dpr={phone ? [1, 1.5] : [1, 2]}
      camera={{ fov: FOV, position: CAMERA, near: 0.1, far: 30 }}
      gl={{ antialias: !phone, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ background: WALL }}
    >
      <LookAt />
      <color attach="background" args={[WALL]} />
      <hemisphereLight args={['#ffe8cc', '#4a2f1e', 1.3]} />
      <ambientLight intensity={0.55} color="#ffdcb4" />
      <directionalLight
        position={[-2.5, 4, 3]}
        intensity={2.2}
        color="#ffdcae"
        castShadow={!phone}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
      />
      <directionalLight position={[0, 3, -4]} intensity={0.5} color="#fff3e0" />
      <Room phone={phone} />
      <Bowl cookies={cookies} phone={phone} />
      {shows.kind === 'egg' && <Egg phone={phone} reduce={reduce} rock={!phone && !reduce} />}
      {shows.kind === 'crack' && (
        <Crack species={shows.species} shiny={shows.shiny} phone={phone} reduce={reduce} onDone={onCrackDone} />
      )}
      {shows.kind === 'creature' && (
        <Creature
          key={`${shows.species}|${shows.stage}|${shows.shiny}`}
          species={shows.species}
          shiny={shows.shiny}
          stage={shows.stage}
          mood={shows.mood}
          phone={phone}
          reduce={reduce}
          reaction={reaction ?? null}
        />
      )}
      {(phone || reduce) && !stopped && <Idle on={!reduce} />}
    </Canvas>
  )
}

function LookAt() {
  const { camera } = useThree()
  useLayoutEffect(() => {
    camera.lookAt(LOOK)
  }, [camera])
  return null
}

/** On demand: asks for about 20 frames a second while the idle may move (a phone without reduce motion). */
function Idle({ on }: { on: boolean }) {
  const { invalidate } = useThree()
  useEffect(() => {
    invalidate()
    if (!on) return
    const t = setInterval(() => invalidate(), 50)
    return () => clearInterval(t)
  }, [invalidate, on])
  return null
}

/** The corner, the rug and the cushion; built once. */
function Room({ phone }: { phone: boolean }) {
  return (
    <group>
      {/* floor and the two walls of the corner */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={!phone}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={FLOOR} roughness={0.9} />
      </mesh>
      {/* the walls show their own colour, untouched by light and tone mapping (the key light sits
          behind the left wall's plane, and ACES made both nearly black): the back wall #3a2c24, the
          left one a little darker but still warm brown */}
      <mesh position={[0, 3, -1.6]}>
        <planeGeometry args={[12, 6]} />
        <meshBasicMaterial color={WALL} toneMapped={false} />
      </mesh>
      <mesh position={[-2.2, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[12, 6]} />
        <meshBasicMaterial color={SIDE_WALL} toneMapped={false} />
      </mesh>
      {/* a skirting board where wall meets floor, so the corner reads */}
      <mesh position={[0, 0.04, -1.58]}>
        <boxGeometry args={[12, 0.08, 0.04]} />
        <meshStandardMaterial color="#2c211b" roughness={1} />
      </mesh>
      {/* round rug in muted plum */}
      <mesh position={[0, 0.006, 0.05]} receiveShadow={!phone}>
        <cylinderGeometry args={[1.05, 1.05, 0.012, phone ? 32 : 48]} />
        <meshStandardMaterial color={RUG} roughness={1} />
      </mesh>
      {/* a soft dark disc fakes the shadow on a phone */}
      {phone && (
        <mesh position={[0.04, 0.014, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.62, 32]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
      {/* the round floor cushion */}
      <mesh position={[0, 0.06, 0]} scale={[1, 0.22, 1]} castShadow={!phone} receiveShadow={!phone}>
        <sphereGeometry args={[0.55, phone ? 20 : 32, phone ? 10 : 16]} />
        <meshStandardMaterial color={GOLD} roughness={1} />
      </mesh>
    </group>
  )
}

/** The wooden food bowl beside the cushion, with one cookie per 5 🍪 up to 5 (none at 0 or below). */
function Bowl({ cookies, phone }: { cookies: number; phone: boolean }) {
  const n = Math.max(0, Math.min(5, Math.ceil(cookies / 5)))
  const spots: Array<[number, number, number, number]> = [
    [-0.05, 0.1, 0.0, 0.2],
    [0.05, 0.1, 0.03, -0.3],
    [0.0, 0.1, -0.05, 0.5],
    [-0.01, 0.125, 0.0, -0.1],
    [0.03, 0.145, -0.01, 0.35],
  ]
  return (
    <group position={[0.72, 0, -0.32]}>
      <mesh position={[0, 0.05, 0]} castShadow={!phone} receiveShadow={!phone}>
        <cylinderGeometry args={[0.16, 0.11, 0.1, phone ? 16 : 24, 1, true]} />
        <meshStandardMaterial color={BOWL} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.005, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.01, phone ? 16 : 24]} />
        <meshStandardMaterial color={BOWL} roughness={0.8} />
      </mesh>
      {spots.slice(0, n).map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y - 0.02, z]} rotation={[0.25, r, 0.2]} castShadow={!phone}>
          <cylinderGeometry args={[0.045, 0.045, 0.018, 12]} />
          <meshStandardMaterial color={COOKIE} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ---- the welcome egg ----------------------------------------------------------------------

/** 0.55 model units tall, scaled [1, 1.28, 1]; as two halves, so it can crack. */
const EGG_R = 0.55 / 2 / 1.28
const SPOTS: Array<[number, number]> = [
  [0.3, 0.35],
  [1.4, 0.55],
  [2.5, 0.3],
  [3.6, 0.6],
  [4.7, 0.4],
  [5.7, 0.7],
]

/**
 * The six gold spots on the upper half, lying flat on the shell. They live inside the egg's
 * [1, 1.28, 1] group, so each one first undoes that scale (scale [1, 1/1.28, 1] at its point) and is
 * then turned to the shell's real normal there: a non-uniform parent scale would otherwise skew the
 * flattened discs sideways into slits.
 */
const EGG_STRETCH = 1.28
const SPOT_PLACES = SPOTS.map(([a, h]) => {
  // a point on the unit-scaled half sphere: angle a round it, height h (0 equator … 1 top)
  const phi = (1 - h) * (Math.PI / 2)
  const p = new THREE.Vector3(Math.sin(phi) * Math.cos(a), Math.cos(phi), Math.sin(phi) * Math.sin(a))
  // the normal of the stretched egg at that point
  const n = new THREE.Vector3(p.x, p.y / EGG_STRETCH, p.z).normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
  return { position: p.multiplyScalar(EGG_R * 0.985).toArray() as [number, number, number], quaternion: q }
})

function EggSpots() {
  return (
    <>
      {SPOT_PLACES.map((s, i) => (
        <group key={i} position={s.position} scale={[1, 1 / EGG_STRETCH, 1]}>
          <mesh quaternion={s.quaternion} scale={[1, 1, 0.3]}>
            <sphereGeometry args={[0.032, 10, 6]} />
            <meshStandardMaterial color={GOLD} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function EggHalf({ top, phone }: { top: boolean; phone: boolean }) {
  const seg = phone ? 16 : 24
  return (
    <group>
      <mesh castShadow={!phone}>
        <sphereGeometry args={[EGG_R, seg, seg / 2, 0, Math.PI * 2, top ? 0 : Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color={EGG} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {top && <EggSpots />}
    </group>
  )
}

/** The egg on the cushion: tilted 6°; on a computer it rocks ±4° for 0.8 s about every 6 s. */
function Egg({ phone, rock }: { phone: boolean; reduce: boolean; rock: boolean }) {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.elapsedTime % 6
    const r = rock && t < 0.8 ? Math.sin((t / 0.8) * Math.PI * 2) * ((4 * Math.PI) / 180) : 0
    g.current.rotation.z = (6 * Math.PI) / 180 + r
  })
  return (
    <group position={[0, SEAT, 0]}>
      <group ref={g} rotation={[0, 0, (6 * Math.PI) / 180]}>
        <group scale={[1, 1.28, 1]} position={[0, EGG_R * 1.28, 0]}>
          <EggHalf top phone={phone} />
          <EggHalf top={false} phone={phone} />
        </group>
      </group>
    </group>
  )
}

// ---- the crack ----------------------------------------------------------------------------

const WOBBLE = 0.9
const SPLIT = 0.4
const POP = 0.3
/** the egg is shown big while it cracks */
const BIG = 1.7

/**
 * The crack (Design §3c), on her tap only: the egg wobbles three times
 * (0.9 s), splits in two halves that tip away (0.4 s) and the baby pops up
 * (0.6 → 1 in 0.3 s, a small overshoot). With reduce motion a 200 ms
 * cross-fade from egg to baby.
 */
function Crack({ species, shiny, phone, reduce, onDone }: { species: SpeciesId; shiny: boolean; phone: boolean; reduce: boolean; onDone?: () => void }) {
  const egg = useRef<THREE.Group>(null)
  const topHalf = useRef<THREE.Group>(null)
  const bottomHalf = useRef<THREE.Group>(null)
  const baby = useRef<THREE.Group>(null)
  const start = useRef<number | null>(null)
  const done = useRef(false)
  const { invalidate } = useThree()
  const rig = useMemo(() => rigOf(creatureFor(species, 'baby', shiny, phone ? 'low' : 'high')), [species, shiny, phone])
  const scale = (FILL.baby * VIEW_H) / rig.height
  const fade = 0.2
  const total = reduce ? fade : WOBBLE + SPLIT + POP

  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime
    const t = clock.elapsedTime - start.current
    if (egg.current && topHalf.current && bottomHalf.current && baby.current) {
      if (reduce) {
        const k = Math.min(1, t / fade)
        setOpacity(egg.current, 1 - k)
        setOpacity(baby.current, k)
        baby.current.scale.setScalar(scale)
      } else {
        // wobble three times
        const w = Math.min(t, WOBBLE)
        egg.current.rotation.z = t < WOBBLE ? Math.sin((w / WOBBLE) * Math.PI * 6) * 0.18 * (1 - w / WOBBLE / 2) : 0
        // split: the halves tip away and fade
        const s = Math.max(0, Math.min(1, (t - WOBBLE) / SPLIT))
        topHalf.current.position.set(-0.12 * s, 0.1 * s, 0)
        topHalf.current.rotation.z = 0.9 * s
        bottomHalf.current.position.set(0.1 * s, 0, 0)
        bottomHalf.current.rotation.z = -0.5 * s
        setOpacity(egg.current, 1 - Math.max(0, (t - WOBBLE - SPLIT * 0.5) / (SPLIT * 0.5 + POP)))
        // the baby pops up with a small overshoot
        const p = Math.max(0, Math.min(1, (t - WOBBLE - SPLIT * 0.6) / POP))
        const over = p < 1 ? 0.6 + 0.4 * (1 - Math.pow(1 - p, 3)) + Math.sin(p * Math.PI) * 0.12 : 1
        baby.current.visible = p > 0
        baby.current.scale.setScalar(scale * over)
      }
    }
    if (t < total + 0.05) invalidate()
    else if (!done.current) {
      done.current = true
      onDone?.()
    }
  })

  return (
    <group position={[0, SEAT, 0]}>
      <group ref={egg} scale={BIG}>
        <group scale={[1, 1.28, 1]} position={[0, EGG_R * 1.28, 0]}>
          <group ref={topHalf}>
            <EggHalf top phone={phone} />
          </group>
          <group ref={bottomHalf}>
            <EggHalf top={false} phone={phone} />
          </group>
        </group>
      </group>
      <group ref={baby} visible={reduce} scale={reduce ? scale : scale * 0.6}>
        <primitive object={rig.root} />
      </group>
    </group>
  )
}

function setOpacity(obj: THREE.Object3D, opacity: number) {
  obj.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined
    if (!m || !(o as THREE.Mesh).isMesh) return
    // the creature's materials are shared: give this mesh its own copy the first time
    if (!o.userData.ownMaterial) {
      ;(o as THREE.Mesh).material = m.clone()
      o.userData.ownMaterial = true
    }
    const own = (o as THREE.Mesh).material as THREE.Material
    own.transparent = opacity < 1
    own.opacity = Math.max(0, opacity)
  })
  obj.visible = opacity > 0.001
}

// ---- the creature -------------------------------------------------------------------------

/** Seconds a feed reaction lasts: the happy squint (^ ^). */
const HAPPY = 0.8

/**
 * The creature on its cushion, ¾ turned toward her (the camera does the
 * turning), at its stage's size. Idle: breathing (body scale y ±1.5 %, 4 s; 6 s
 * with a mood) and a blink every 4–7 s; on a computer a small look to the side
 * about every 8 s. A mood squashes the eyes and tips the head (Design §7).
 */
function Creature({
  species,
  shiny,
  stage,
  mood,
  phone,
  reduce,
  reaction,
}: {
  species: SpeciesId
  shiny: boolean
  stage: Stage
  mood: Mood | null
  phone: boolean
  reduce: boolean
  reaction: Reaction | null
}) {
  const rig = useMemo<Rig>(() => rigOf(creatureFor(species, stage, shiny, phone ? 'low' : 'high')), [species, stage, shiny, phone])
  const scale = (FILL[stage] * VIEW_H) / rig.height
  const holder = useRef<THREE.Group>(null)
  const { invalidate } = useThree()
  const blink = useRef({ next: 2 + Math.random() * 3 })
  const react = useRef<{ kind: Reaction['kind']; at: number | null } | null>(null)
  const seen = useRef<number | null>(reaction?.n ?? null)

  useEffect(() => {
    if (!reaction || reaction.n === seen.current) return
    seen.current = reaction.n
    react.current = { kind: reaction.kind, at: null }
    invalidate()
  }, [reaction, invalidate])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const tilt = headTilt(mood)
    const idle = !reduce
    // breathing
    if (rig.body) {
      const period = mood ? 6 : 4
      const b = idle ? 1 + 0.015 * Math.sin((t / period) * Math.PI * 2) : 1
      rig.body.scale.set(rig.base.body.x, rig.base.body.y * b, rig.base.body.z)
    }
    // eyes: the mood's opening, a blink now and then, a happy squint after a feed
    let open = eyeOpen(mood)
    if (idle && t >= blink.current.next) {
      if (t < blink.current.next + 0.15) open = Math.min(open, 0.1)
      else blink.current.next = t + 4 + Math.random() * 3
    }
    let bob = 0
    const r = react.current
    if (r) {
      if (r.at === null) r.at = t
      const k = t - r.at
      if (k < HAPPY) {
        open = Math.min(open, 0.35)
        // a bob (a bigger one for a level-up); none with reduce motion
        if (!reduce && k < 0.5) bob = Math.sin((k / 0.5) * Math.PI) * (r.kind === 'levelup' ? 0.12 : 0.06)
        invalidate()
      } else react.current = null
    }
    if (rig.eyes) rig.eyes.scale.set(rig.base.eyes.x, rig.base.eyes.y * open, rig.base.eyes.z)
    // head: the mood's tilt; on a computer a small look to the side about every 8 s
    if (rig.head) {
      const c = t % 8
      const look = idle && !phone && !mood && c > 6 ? Math.sin(((c - 6) / 2) * Math.PI) * 0.3 : 0
      rig.head.rotation.set(rig.base.head.x + tilt.x, rig.base.head.y + look, rig.base.head.z + tilt.z)
    }
    if (holder.current) holder.current.position.y = SEAT + bob * scale
  })

  return (
    <group ref={holder} position={[0, SEAT, 0]} scale={scale}>
      <primitive object={rig.root} />
    </group>
  )
}

/** The welcome egg standing still (the dashboard block's picture): 0.55 model units tall, tilted 6°. */
export function StillEgg({ phone }: { phone: boolean }) {
  return (
    <group rotation={[0, 0, (6 * Math.PI) / 180]}>
      <group scale={[1, 1.28, 1]} position={[0, EGG_R * 1.28, 0]}>
        <EggHalf top phone={phone} />
        <EggHalf top={false} phone={phone} />
      </group>
    </group>
  )
}
