import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Mood, Stage } from '#/lib/creatures/creature'
import type { SpeciesId, Tier } from '#/lib/creatures/species'
import type { DenSlot, HabitatId, OutfitSlot } from '#/lib/creatures/shop'
import { skyAt, weatherAt } from '#/lib/creatures/weather'
import { creatureFor, eyeOpen, headTilt, rigOf, usePageVisible } from './pose'
import { SPARKLE_SPOTS, glowTex, makeEgg, sparkleTexture } from './eggModel'
import type { Rig } from './pose'
import type { CreatureQuality } from './model'
import {
  DEN_CAMERA,
  DEN_FILL,
  DEN_FOV,
  DEN_LOOK,
  DEN_SPOTS,
  DEN_VIEW_H,
  HABITAT_BACK,
  buildBowl,
  denBed,
  denItem,
  denRoom,
  denRug,
  dressCreature,
} from './shopModels'

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

export type DenShows =
  | { kind: 'egg'; tier?: Tier }
  | { kind: 'crack'; species: SpeciesId; shiny: boolean; tier?: Tier }
  | { kind: 'creature'; species: SpeciesId; shiny: boolean; stage: Stage; mood: Mood | null }

/** What she bought for the den (T-0031): the habitat and what stands in each spot. */
export interface DenSetup {
  habitat: HabitatId
  placed: Partial<Record<DenSlot, string>>
}

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
  /** what the creature wears, per slot (T-0031) */
  dress?: Partial<Record<OutfitSlot, string>>
  /** the habitat and the den's spots (T-0031) */
  den?: DenSetup
  /** the device clock, for the window's sky and weather (a test clock in a test) */
  now?: Date
}

/** Share of the canvas height a creature fills, per stage (Design §5), before the 10 % pull-back of T-0031. */
const FILL: Record<Stage, number> = DEN_FILL
const FOV = DEN_FOV
const VIEW_H = DEN_VIEW_H
const LOOK = DEN_LOOK
const CAMERA = DEN_CAMERA
const NO_DEN: DenSetup = { habitat: 'cosy', placed: {} }
/** The cushion's top: where the creature stands. */
const SEAT = 0.1

export function DenScene({ shows, cookies, phone, reduce, paused, reaction, onCrackDone, dress, den = NO_DEN, now }: Props) {
  const visible = usePageVisible()
  const q: CreatureQuality = phone ? 'low' : 'high'
  const wall = HABITAT_BACK[den.habitat]
  // the clock is read per render: the page re-renders every minute (moods), so the sky follows
  const clock = now ?? new Date()
  const sky = skyAt(clock)
  const weather = weatherAt(clock)
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
      style={{ background: wall }}
    >
      <LookAt />
      <color attach="background" args={[wall]} />
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
      <Room habitat={den.habitat} q={q} phone={phone} />
      <Spots placed={den.placed} q={q} sky={sky} weather={weather} moving={!phone && !reduce} reduce={reduce} />
      <Bowl cookies={cookies} q={q} />
      {shows.kind === 'egg' && <Egg key={shows.tier ?? 'common'} tier={shows.tier ?? 'common'} phone={phone} rock={!phone && !reduce} />}
      {shows.kind === 'crack' && (
        <Crack
          key={`${shows.species}|${shows.tier ?? 'common'}`}
          species={shows.species}
          shiny={shows.shiny}
          tier={shows.tier ?? 'common'}
          phone={phone}
          reduce={reduce}
          onDone={onCrackDone}
        />
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
          dress={dress}
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

/**
 * The corner in her habitat (T-0031 §9; the Cosy den is T-0029's): walls, floor and the habitat's
 * props, and on a phone a soft dark disc that fakes the creature's shadow. Built once per habitat.
 */
function Room({ habitat, q, phone }: { habitat: HabitatId; q: CreatureQuality; phone: boolean }) {
  const room = useMemo(() => denRoom(habitat, q), [habitat, q])
  return (
    <group>
      <primitive object={room} />
      {phone && (
        <mesh position={[0.04, 0.014, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.62, 32]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

/**
 * The six spots (T-0031 §8): the bed (T-0029's gold cushion unless she placed one), the rug (the
 * plum one unless she placed one), the wall, the two corners and the toy. A new item fades in
 * (here: grows from 90 % in 200 ms; at once with reduce motion).
 */
function Spots({
  placed,
  q,
  sky,
  weather,
  moving,
  reduce,
}: {
  placed: Partial<Record<DenSlot, string>>
  q: CreatureQuality
  sky: ReturnType<typeof skyAt>
  weather: ReturnType<typeof weatherAt>
  moving: boolean
  reduce: boolean
}) {
  return (
    <>
      <Spot key={`bed|${placed.bed ?? '-'}`} slot="bed" id={placed.bed} q={q} reduce={reduce} />
      <Spot key={`rug|${placed.rug ?? '-'}`} slot="rug" id={placed.rug} q={q} reduce={reduce} />
      {(['wall', 'left', 'right', 'toy'] as const).map((slot) =>
        placed[slot] ? (
          <Spot key={`${slot}|${placed[slot]}`} slot={slot} id={placed[slot]} q={q} sky={sky} weather={weather} moving={moving} reduce={reduce} />
        ) : null,
      )}
    </>
  )
}

function Spot({
  slot,
  id,
  q,
  sky,
  weather,
  moving = false,
  reduce,
}: {
  slot: DenSlot
  id?: string
  q: CreatureQuality
  sky?: ReturnType<typeof skyAt>
  weather?: ReturnType<typeof weatherAt>
  moving?: boolean
  reduce: boolean
}) {
  const g = useMemo(() => {
    if (!id) return slot === 'bed' ? denBed(q) : denRug(q)
    return denItem(id, q, { sky, weather, moving })
  }, [id, slot, q, sky, weather, moving])
  const holder = useRef<THREE.Group>(null)
  const start = useRef<number | null>(null)
  const { invalidate } = useThree()
  // only items she placed grow in; the den's own cushion and rug are just there
  const grow = !!id && !reduce
  useFrame(({ clock }) => {
    const h = holder.current
    if (!h) return
    if (grow) {
      if (start.current === null) start.current = clock.elapsedTime
      const k = Math.min(1, (clock.elapsedTime - start.current) / 0.2)
      h.scale.setScalar(0.9 + 0.1 * k)
      if (k < 1) invalidate()
    }
    if (!moving) return
    // on a computer the weather falls or drifts and the fairy lights twinkle slowly (Design §8)
    const t = clock.elapsedTime
    g.traverse((o) => {
      const pts = o as THREE.Points
      if (pts.isPoints && pts.userData.moving) {
        const pos = pts.geometry.attributes.position as THREE.BufferAttribute
        const { bottom, top, width, kind } = pts.userData as { bottom: number; top: number; width: number; kind: string }
        const speed = kind === 'rain' ? 0.5 : 0.08
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) - speed / 60
          if (y < bottom) y = top
          pos.setY(i, y)
          if (kind === 'snow') pos.setX(i, Math.max(-width / 2, Math.min(width / 2, pos.getX(i) + Math.sin(t + i) * 0.0004)))
        }
        pos.needsUpdate = true
      }
      const m = o as THREE.Mesh
      if (m.isMesh && m.userData.twinkle) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.75 + 0.25 * Math.sin(t * 1.3)
    })
  })
  return (
    <group ref={holder} position={DEN_SPOTS[slot]} scale={grow ? 0.9 : 1}>
      <primitive object={g} />
    </group>
  )
}

/** The wooden food bowl beside the cushion, with one cookie per 5 🍪 up to 5 (none at 0 or below). */
function Bowl({ cookies, q }: { cookies: number; q: CreatureQuality }) {
  const n = Math.max(0, Math.min(5, Math.ceil(cookies / 5)))
  const bowl = useMemo(() => buildBowl(n * 5, q), [n, q])
  return <primitive object={bowl} />
}

// ---- the egg ------------------------------------------------------------------------------

/** The egg on the cushion: tilted 6°; on a computer it rocks ±4° for 0.8 s about every 6 s. */
function Egg({ tier, phone, rock }: { tier: Tier; phone: boolean; rock: boolean }) {
  const g = useRef<THREE.Group>(null)
  const egg = useMemo(() => makeEgg(tier, phone), [tier, phone])
  useFrame(({ clock }) => {
    if (!g.current) return
    const t = clock.elapsedTime % 6
    const r = rock && t < 0.8 ? Math.sin((t / 0.8) * Math.PI * 2) * ((4 * Math.PI) / 180) : 0
    g.current.rotation.z = (6 * Math.PI) / 180 + r
  })
  return (
    <group position={[0, SEAT, 0]}>
      <group ref={g} rotation={[0, 0, (6 * Math.PI) / 180]}>
        <primitive object={egg.root} />
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
function Crack({
  species,
  shiny,
  tier,
  phone,
  reduce,
  onDone,
}: {
  species: SpeciesId
  shiny: boolean
  tier: Tier
  phone: boolean
  reduce: boolean
  onDone?: () => void
}) {
  const egg = useRef<THREE.Group>(null)
  const parts = useMemo(() => makeEgg(tier, phone), [tier, phone])
  const topHalf = useRef<THREE.Group>(parts.top)
  const bottomHalf = useRef<THREE.Group>(parts.bottom)
  const baby = useRef<THREE.Group>(null)
  const glow = useRef<THREE.Sprite>(null)
  const ring = useRef<THREE.Group>(null)
  // rarity in the moment (T-0030 Design §3): a glow for rare and up, also a ring of sparkles for epic and up
  const glows = tier === 'rare' || tier === 'very rare' || tier === 'epic' || tier === 'legendary'
  const rings = tier === 'epic' || tier === 'legendary'
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
        // the glow behind the baby while it pops (0.6 s), the ring drifting out and fading (1 s)
        const g = t - WOBBLE - SPLIT * 0.6
        if (glow.current) {
          const k = g < 0 ? 0 : g < 0.6 ? Math.sin((g / 0.6) * Math.PI) : 0
          glow.current.visible = k > 0
          glow.current.material.opacity = k
        }
        if (ring.current) {
          const k = g < 0 ? -1 : g
          ring.current.visible = k >= 0 && k < 1
          ring.current.children.forEach((child, i) => {
            const an = (i / 12) * Math.PI * 2
            const r = 0.25 + 0.55 * Math.max(0, k)
            child.position.set(Math.cos(an) * r, 0.35 + Math.sin(an) * r * 0.6, 0.2)
            ;((child as THREE.Sprite).material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - k)
          })
        }
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
        <primitive object={parts.root} />
      </group>
      {glows && !reduce && (
        <sprite ref={glow} position={[0, 0.32, -0.25]} scale={[1.1, 1.1, 1]} visible={false}>
          <spriteMaterial map={glowTex()} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      )}
      {rings && !reduce && (
        <group ref={ring} visible={false}>
          {Array.from({ length: 12 }, (_, i) => (
            <sprite key={i} scale={[0.07, 0.07, 1]}>
              <spriteMaterial map={sparkleTexture()} transparent opacity={0} depthWrite={false} toneMapped={false} />
            </sprite>
          ))}
        </group>
      )}
      <group ref={baby} visible={reduce} scale={reduce ? scale : scale * 0.6}>
        <primitive object={rig.root} />
        {shiny && <Sparkles height={rig.height} twinkle={false} />}
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

const OUTFIT_KEYS: readonly OutfitSlot[] = ['head', 'face', 'neck', 'back']

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
  dress,
}: {
  species: SpeciesId
  shiny: boolean
  stage: Stage
  mood: Mood | null
  phone: boolean
  reduce: boolean
  reaction: Reaction | null
  dress?: Partial<Record<OutfitSlot, string>>
}) {
  const q: CreatureQuality = phone ? 'low' : 'high'
  const rig = useMemo<Rig>(() => rigOf(creatureFor(species, stage, shiny, q)), [species, stage, shiny, q])
  // outfits on their anchors (T-0031 §7): a new piece pops in (0.8 → 1 in 200 ms; none with reduce motion)
  const dressKey = OUTFIT_KEYS.map((s) => dress?.[s] ?? '').join('|')
  const wore = useRef<Partial<Record<OutfitSlot, string>>>({})
  const pops = useRef<Array<{ m: THREE.Object3D; base: number; at: number | null }>>([])
  useLayoutEffect(() => {
    const before = wore.current
    const pieces = dressCreature(rig.root, dress ?? {}, q)
    wore.current = { ...(dress ?? {}) }
    if (!reduce)
      pops.current = pieces
        .filter((m) => before[m.userData.slot as OutfitSlot] !== dress?.[m.userData.slot as OutfitSlot])
        .map((m) => ({ m, base: m.scale.x, at: null }))
    invalidate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, dressKey, q])
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
    if (pops.current.length) {
      for (const p of pops.current) {
        if (p.at === null) p.at = t
        const k = Math.min(1, (t - p.at) / 0.2)
        p.m.scale.setScalar(p.base * (0.8 + 0.2 * k))
      }
      pops.current = pops.current.filter((p) => t - (p.at ?? t) < 0.2)
      invalidate()
    }
  })

  return (
    <group ref={holder} position={[0, SEAT, 0]} scale={scale}>
      <primitive object={rig.root} />
      {shiny && <Sparkles height={rig.height} twinkle={!phone && !reduce} />}
    </group>
  )
}

/** An egg standing still (the dashboard block's picture): 0.55 model units tall, tilted 6°. */
export function StillEgg({ phone, tier = 'common' }: { phone: boolean; tier?: Tier }) {
  const egg = useMemo(() => makeEgg(tier, phone), [tier, phone])
  return (
    <group rotation={[0, 0, (6 * Math.PI) / 180]}>
      <primitive object={egg.root} />
    </group>
  )
}

/**
 * The shiny sparkle (T-0030 Design §4): 8 tiny four-point stars in #f4d68c on a loose ring at head
 * and shoulder height. On a computer they twinkle (each in its own 2–3 s) and drift round once in
 * about 20 s; on a phone and with reduce motion they stand still at 70 %.
 */
function Sparkles({ height, twinkle }: { height: number; twinkle: boolean }) {
  const g = useRef<THREE.Group>(null)
  const tex = sparkleTexture()
  useFrame(({ clock }) => {
    if (!twinkle || !g.current) return
    const t = clock.elapsedTime
    g.current.rotation.y = (t / 20) * Math.PI * 2
    g.current.children.forEach((child, i) => {
      const period = 2 + (i % 3) * 0.5
      ;((child as THREE.Sprite).material as THREE.SpriteMaterial).opacity = 0.65 + 0.35 * Math.sin((t / period) * Math.PI * 2 + i)
    })
  })
  const r = height * 0.55
  return (
    <group ref={g}>
      {SPARKLE_SPOTS.map((sp, i) => (
        <sprite
          key={i}
          position={[Math.cos(sp.angle) * r, sp.y * height, Math.sin(sp.angle) * r]}
          scale={[sp.size * height * 1.4, sp.size * height * 1.4, 1]}
        >
          <spriteMaterial map={tex} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  )
}
