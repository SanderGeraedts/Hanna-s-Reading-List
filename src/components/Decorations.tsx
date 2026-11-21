import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { DecorKind, DecorSlot } from '#/lib/shelfLayout'
import { SHELF } from '#/lib/shelfLayout'
import { toTexture } from './textures'

/** On a phone the decorations sit still (no flicker, steam, breathing or twinkling): less work every frame. */
export const StillDecorations = createContext(false)

/**
 * Shelf decorations, modelled from primitives. Each model's origin is the
 * bottom-centre of its footprint, facing the viewer (+z).
 */
export function Decorations({ items }: { items: DecorSlot[] }) {
  return (
    <>
      {items.map((d) => (
        <Placed key={d.kind} slot={d} />
      ))}
    </>
  )
}

const FRONT_Z = SHELF.depth / 2 - 0.11
const BACK_Z = -SHELF.depth / 2 + 0.045

const PLACEMENT: Record<DecorKind, { z: number; rotY: number }> = {
  koala: { z: FRONT_Z, rotY: -0.25 },
  succulent: { z: FRONT_Z - 0.02, rotY: 0.4 },
  frame: { z: BACK_Z, rotY: -0.08 },
  candle: { z: FRONT_Z, rotY: 0 },
  vase: { z: 0, rotY: 0.3 },
  cat: { z: FRONT_Z - 0.02, rotY: 0.15 },
  mug: { z: FRONT_Z + 0.01, rotY: -0.6 },
  // near the front edge, so the vines can hang over it
  ivy: { z: SHELF.depth / 2 - 0.07, rotY: 0 },
}

/** Eases decorations to a new spot when books push them along. */
function Placed({ slot }: { slot: DecorSlot }) {
  const group = useRef<THREE.Group>(null)
  const { z, rotY } = PLACEMENT[slot.kind]
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const d = Math.min(dt, 0.05)
    g.position.x = THREE.MathUtils.damp(g.position.x, slot.x, 8, d)
    g.position.y = THREE.MathUtils.damp(g.position.y, slot.floorY, 8, d)
  })
  return (
    <group ref={group} position={[slot.x, slot.floorY, z]} rotation={[0, rotY, 0]}>
      {slot.kind === 'koala' && <Koala />}
      {slot.kind === 'succulent' && <Succulent />}
      {slot.kind === 'frame' && <PictureFrame />}
      {slot.kind === 'candle' && <Candle />}
      {slot.kind === 'vase' && <PampasVase />}
      {slot.kind === 'cat' && <SleepingCat />}
      {slot.kind === 'mug' && <TeaMug />}
      {slot.kind === 'ivy' && <TrailingIvy />}
    </group>
  )
}

/** A mesh that casts and receives shadows. */
function Part(props: React.ComponentProps<'mesh'>) {
  return <mesh castShadow receiveShadow {...props} />
}

// ---------------------------------------------------------------------------
// Koala plushie
// ---------------------------------------------------------------------------

function Koala() {
  const m = useMemo(
    () => ({
      fur: new THREE.MeshStandardMaterial({ color: '#9196a0', roughness: 1 }),
      cream: new THREE.MeshStandardMaterial({ color: '#ece6dc', roughness: 1 }),
      nose: new THREE.MeshStandardMaterial({ color: '#2b2a2f', roughness: 0.45 }),
      eye: new THREE.MeshStandardMaterial({ color: '#111114', roughness: 0.15 }),
      blush: new THREE.MeshStandardMaterial({
        color: '#e8a6a6',
        roughness: 1,
        transparent: true,
        opacity: 0.55,
      }),
    }),
    [],
  )
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])

  return (
    <group>
      {/* body */}
      <Part material={m.fur} position={[0, 0.072, 0]} scale={[1, 1.08, 0.86]}>
        <sphereGeometry args={[0.07, 32, 24]} />
      </Part>
      {/* tummy patch */}
      <Part material={m.cream} position={[0, 0.068, 0.043]} scale={[0.95, 1.15, 0.55]}>
        <sphereGeometry args={[0.046, 24, 16]} />
      </Part>
      {/* feet */}
      {[-1, 1].map((s) => (
        <Part key={s} material={m.fur} position={[s * 0.04, 0.018, 0.048]} scale={[1, 0.7, 1.35]}>
          <sphereGeometry args={[0.027, 20, 14]} />
        </Part>
      ))}
      {/* arms, hugging the tummy */}
      {[-1, 1].map((s) => (
        <Part
          key={s}
          material={m.fur}
          position={[s * 0.05, 0.09, 0.038]}
          rotation={[-0.9, 0, s * 0.75]}
        >
          <capsuleGeometry args={[0.019, 0.045, 6, 14]} />
        </Part>
      ))}
      {/* head */}
      <group position={[0, 0.172, 0.008]}>
        <Part material={m.fur} scale={[1.08, 0.98, 0.95]}>
          <sphereGeometry args={[0.064, 32, 24]} />
        </Part>
        {/* big fluffy ears */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.064, 0.038, -0.004]}>
            <Part material={m.fur} scale={[1, 1, 0.5]}>
              <sphereGeometry args={[0.038, 24, 16]} />
            </Part>
            <Part material={m.cream} position={[0, -0.002, 0.012]} scale={[1, 1, 0.4]}>
              <sphereGeometry args={[0.026, 20, 14]} />
            </Part>
          </group>
        ))}
        {/* nose */}
        <Part material={m.nose} position={[0, -0.006, 0.058]} scale={[0.8, 1.2, 0.7]}>
          <sphereGeometry args={[0.022, 24, 16]} />
        </Part>
        {/* eyes */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={m.eye} position={[s * 0.026, 0.014, 0.052]}>
            <sphereGeometry args={[0.0075, 12, 10]} />
          </mesh>
        ))}
        {/* blushing cheeks */}
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            material={m.blush}
            position={[s * 0.04, -0.012, 0.046]}
            scale={[1, 0.7, 0.3]}
          >
            <sphereGeometry args={[0.012, 12, 10]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Potted succulent
// ---------------------------------------------------------------------------

function Succulent() {
  const m = useMemo(
    () => ({
      pot: new THREE.MeshStandardMaterial({ color: '#c8724c', roughness: 0.9 }),
      soil: new THREE.MeshStandardMaterial({ color: '#3b2a1e', roughness: 1 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#86ab84', roughness: 0.6 }),
      leafTip: new THREE.MeshStandardMaterial({ color: '#a7c49a', roughness: 0.6 }),
    }),
    [],
  )
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])

  // rosette: rings of fleshy leaves, outer ones splayed wider
  const leaves = useMemo(() => {
    const out: Array<{ pos: [number, number, number]; rot: THREE.Euler; size: number; tip: boolean }> = []
    const rings = [
      { n: 9, r: 0.03, tilt: 1.15, size: 1 },
      { n: 7, r: 0.018, tilt: 0.75, size: 0.8 },
      { n: 5, r: 0.007, tilt: 0.35, size: 0.6 },
    ]
    rings.forEach((ring, ri) => {
      for (let i = 0; i < ring.n; i++) {
        const a = (i / ring.n) * Math.PI * 2 + ri * 0.4
        out.push({
          pos: [Math.cos(a) * ring.r, 0.078 + ri * 0.006, Math.sin(a) * ring.r],
          rot: new THREE.Euler(0, -a + Math.PI / 2, ring.tilt, 'YXZ'),
          size: ring.size,
          tip: ri === 2,
        })
      }
    })
    return out
  }, [])

  return (
    <group>
      <Part material={m.pot} position={[0, 0.034, 0]}>
        <cylinderGeometry args={[0.045, 0.034, 0.068, 28]} />
      </Part>
      <Part material={m.pot} position={[0, 0.066, 0]}>
        <cylinderGeometry args={[0.05, 0.048, 0.014, 28]} />
      </Part>
      <mesh material={m.soil} position={[0, 0.073, 0]}>
        <cylinderGeometry args={[0.044, 0.044, 0.004, 24]} />
      </mesh>
      {leaves.map((l, i) => (
        <group key={i} position={l.pos} rotation={l.rot}>
          <Part
            material={l.tip ? m.leafTip : m.leaf}
            position={[0, 0.022 * l.size, 0]}
            scale={[0.55 * l.size, l.size, 0.3 * l.size]}
          >
            <sphereGeometry args={[0.024, 14, 10]} />
          </Part>
        </group>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// Small framed picture, leaning against the back panel
// ---------------------------------------------------------------------------

function paintLandscape() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 320
  const ctx = c.getContext('2d')!
  const sky = ctx.createLinearGradient(0, 0, 0, 200)
  sky.addColorStop(0, '#9fb4ef')
  sky.addColorStop(1, '#f3d9c4')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 256, 320)
  ctx.fillStyle = '#f6e7b0'
  ctx.beginPath()
  ctx.arc(176, 110, 26, 0, Math.PI * 2)
  ctx.fill()
  const hill = (y: number, amp: number, color: string, phase: number) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, 320)
    for (let x = 0; x <= 256; x += 8) ctx.lineTo(x, y + Math.sin(x / 40 + phase) * amp)
    ctx.lineTo(256, 320)
    ctx.fill()
  }
  hill(190, 14, '#8fae8b', 0.3)
  hill(222, 18, '#6f9471', 2.1)
  hill(262, 12, '#557a5b', 4.2)
  return toTexture(c)
}

function PictureFrame() {
  const art = useMemo(() => paintLandscape(), [])
  const m = useMemo(
    () => ({
      frame: new THREE.MeshStandardMaterial({ color: '#2f2b29', roughness: 0.5 }),
      mat: new THREE.MeshStandardMaterial({ color: '#f5f1ea', roughness: 0.95 }),
      art: new THREE.MeshStandardMaterial({ map: art, roughness: 0.8 }),
    }),
    [art],
  )
  useEffect(
    () => () => {
      art.dispose()
      Object.values(m).forEach((x) => x.dispose())
    },
    [art, m],
  )
  const W = 0.14
  const H = 0.18
  return (
    // lean back a little against the panel
    <group rotation={[-0.12, 0, 0]}>
      <Part material={m.frame} position={[0, H / 2, 0]}>
        <boxGeometry args={[W, H, 0.014]} />
      </Part>
      <mesh material={m.mat} position={[0, H / 2, 0.0072]}>
        <planeGeometry args={[W - 0.022, H - 0.022]} />
      </mesh>
      <mesh material={m.art} position={[0, H / 2, 0.0075]}>
        <planeGeometry args={[W - 0.05, H - 0.05]} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Candle in a glass jar, with a flickering flame
// ---------------------------------------------------------------------------

function Candle() {
  const flame = useRef<THREE.Mesh>(null)
  const m = useMemo(
    () => ({
      glass: new THREE.MeshStandardMaterial({
        color: '#dfe8f2',
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
      wax: new THREE.MeshStandardMaterial({ color: '#f2e6cf', roughness: 0.7 }),
      wick: new THREE.MeshStandardMaterial({ color: '#2a2420' }),
      flame: new THREE.MeshBasicMaterial({ color: '#ffc46b', toneMapped: false }),
    }),
    [],
  )
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])

  const still = useContext(StillDecorations)
  useFrame(({ clock }) => {
    const f = flame.current
    if (!f || still) return
    const t = clock.elapsedTime
    const flicker = 1 + Math.sin(t * 13) * 0.06 + Math.sin(t * 23.7) * 0.05
    f.scale.set(0.55, 1.25 * flicker, 0.55)
    f.rotation.z = Math.sin(t * 7.3) * 0.08
  })

  return (
    <group>
      <Part material={m.wax} position={[0, 0.026, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.052, 28]} />
      </Part>
      <mesh material={m.wick} position={[0, 0.058, 0]}>
        <cylinderGeometry args={[0.0015, 0.0015, 0.012, 6]} />
      </mesh>
      <mesh ref={flame} material={m.flame} position={[0, 0.072, 0]}>
        <sphereGeometry args={[0.008, 12, 10]} />
      </mesh>
      <mesh material={m.glass} position={[0, 0.04, 0]} renderOrder={2}>
        <cylinderGeometry args={[0.035, 0.035, 0.08, 32, 1, true]} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Ceramic vase with dried pampas grass
// ---------------------------------------------------------------------------

function PampasVase() {
  const vaseGeometry = useMemo(() => {
    // profile from the base up: belly, neck, lip
    const pts = [
      [0.0, 0.0],
      [0.03, 0.0],
      [0.045, 0.03],
      [0.048, 0.06],
      [0.036, 0.1],
      [0.02, 0.13],
      [0.019, 0.15],
      [0.024, 0.16],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    return new THREE.LatheGeometry(pts, 40)
  }, [])
  const m = useMemo(
    () => ({
      vase: new THREE.MeshStandardMaterial({ color: '#efe9e1', roughness: 0.85, side: THREE.DoubleSide }),
      stem: new THREE.MeshStandardMaterial({ color: '#b59b74', roughness: 1 }),
      plume: new THREE.MeshStandardMaterial({ color: '#ead8b9', roughness: 1 }),
    }),
    [],
  )
  useEffect(
    () => () => {
      vaseGeometry.dispose()
      Object.values(m).forEach((x) => x.dispose())
    },
    [vaseGeometry, m],
  )

  const stems = [
    { tilt: [0.05, 0, -0.22], len: 0.17 },
    { tilt: [-0.12, 0, 0.12], len: 0.19 },
    { tilt: [0.16, 0, 0.3], len: 0.15 },
    { tilt: [-0.05, 0, -0.04], len: 0.2 },
  ] as const

  return (
    <group>
      <Part geometry={vaseGeometry} material={m.vase} />
      {stems.map((s, i) => (
        <group key={i} position={[0, 0.13, 0]} rotation={s.tilt as unknown as [number, number, number]}>
          <mesh material={m.stem} position={[0, s.len / 2, 0]}>
            <cylinderGeometry args={[0.0015, 0.0018, s.len, 5]} />
          </mesh>
          <Part material={m.plume} position={[0, s.len + 0.02, 0]} scale={[0.32, 1, 0.32]}>
            <sphereGeometry args={[0.04, 14, 12]} />
          </Part>
        </group>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// A grey cat curled up asleep, breathing slowly
// ---------------------------------------------------------------------------

function SleepingCat() {
  const body = useRef<THREE.Group>(null)
  const m = useMemo(
    () => ({
      fur: new THREE.MeshStandardMaterial({ color: '#8d8782', roughness: 0.95 }),
      light: new THREE.MeshStandardMaterial({ color: '#d9d2ca', roughness: 0.95 }),
      ear: new THREE.MeshStandardMaterial({ color: '#c99a9a', roughness: 0.9 }),
      dark: new THREE.MeshStandardMaterial({ color: '#3a3330', roughness: 0.6 }),
    }),
    [],
  )
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])
  const tail = useMemo(() => new THREE.TorusGeometry(0.062, 0.012, 10, 28, Math.PI * 1.15), [])
  useEffect(() => () => tail.dispose(), [tail])

  // a slow breath, about every four seconds
  const still = useContext(StillDecorations)
  useFrame(({ clock }) => {
    const b = body.current
    if (b && !still) b.scale.y = 1 + Math.sin(clock.elapsedTime * 1.5) * 0.035
  })

  return (
    <group>
      <group ref={body}>
        {/* the curled body */}
        <Part material={m.fur} position={[0, 0.034, 0]} scale={[1, 0.52, 0.78]}>
          <sphereGeometry args={[0.068, 28, 20]} />
        </Part>
      </group>
      {/* the head, tucked in at the front left, eyes closed */}
      <group position={[-0.042, 0.04, 0.035]} rotation={[0.1, 0.5, -0.25]}>
        <Part material={m.fur} scale={[1, 0.82, 0.9]}>
          <sphereGeometry args={[0.032, 22, 16]} />
        </Part>
        <Part material={m.light} position={[0, -0.008, 0.022]} scale={[1, 0.7, 0.7]}>
          <sphereGeometry args={[0.016, 14, 10]} />
        </Part>
        {[-1, 1].map((side) => (
          <group key={side}>
            <Part material={m.fur} position={[side * 0.017, 0.026, -0.004]} rotation={[0, 0, -side * 0.35]}>
              <coneGeometry args={[0.011, 0.02, 4]} />
            </Part>
            <mesh material={m.ear} position={[side * 0.017, 0.025, -0.0005]} rotation={[0, 0, -side * 0.35]}>
              <coneGeometry args={[0.007, 0.014, 4]} />
            </mesh>
            {/* closed eyes: two short dark lines */}
            <mesh material={m.dark} position={[side * 0.011, 0.004, 0.028]} rotation={[0, 0, side * 0.2]}>
              <boxGeometry args={[0.009, 0.0015, 0.001]} />
            </mesh>
          </group>
        ))}
        <mesh material={m.ear} position={[0, -0.004, 0.0335]}>
          <sphereGeometry args={[0.003, 8, 6]} />
        </mesh>
      </group>
      {/* the tail, wrapped round the front */}
      <Part geometry={tail} material={m.fur} position={[0.004, 0.012, 0.004]} rotation={[Math.PI / 2, 0, -0.2]} />
    </group>
  )
}

// ---------------------------------------------------------------------------
// A lavender mug of tea, steaming a little
// ---------------------------------------------------------------------------

function TeaMug() {
  const steam = useRef<THREE.Group>(null)
  const m = useMemo(
    () => ({
      mug: new THREE.MeshStandardMaterial({ color: '#b9a3d6', roughness: 0.35 }),
      inside: new THREE.MeshStandardMaterial({ color: '#efe8f6', roughness: 0.4, side: THREE.BackSide }),
      tea: new THREE.MeshStandardMaterial({ color: '#7a4a24', roughness: 0.15 }),
      steam: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false }),
      tag: new THREE.MeshStandardMaterial({ color: '#f4efe6', roughness: 0.9 }),
      string: new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 1 }),
    }),
    [],
  )
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])
  const handle = useMemo(() => new THREE.TorusGeometry(0.019, 0.0055, 10, 24, Math.PI), [])
  useEffect(() => () => handle.dispose(), [handle])

  // three wisps that rise, widen and fade, over and over
  const still = useContext(StillDecorations)
  useFrame(({ clock }) => {
    const g = steam.current
    if (!g || still) return
    g.children.forEach((w, i) => {
      const t = (clock.elapsedTime * 0.35 + i / 3) % 1
      w.position.y = 0.085 + t * 0.07
      w.position.x = Math.sin(t * 5 + i) * 0.006
      w.scale.setScalar(0.6 + t * 1.2)
      const mat = (w as THREE.Mesh).material as THREE.MeshBasicMaterial
      mat.opacity = 0.14 * Math.sin(t * Math.PI)
    })
  })
  // each wisp needs its own material for its own fade
  const wisps = useMemo(() => [0, 1, 2].map(() => m.steam.clone()), [m])
  useEffect(() => () => wisps.forEach((w) => w.dispose()), [wisps])

  return (
    <group>
      <Part material={m.mug} position={[0, 0.0375, 0]}>
        <cylinderGeometry args={[0.032, 0.029, 0.075, 32, 1, true]} />
      </Part>
      <mesh material={m.inside} position={[0, 0.0375, 0]}>
        <cylinderGeometry args={[0.03, 0.027, 0.075, 32, 1, true]} />
      </mesh>
      <Part material={m.mug} position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.029, 0.029, 0.004, 32]} />
      </Part>
      <mesh material={m.tea} position={[0, 0.064, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.0295, 32]} />
      </mesh>
      <Part geometry={handle} material={m.mug} position={[0.032, 0.04, 0]} rotation={[0, 0, -Math.PI / 2]} />
      {/* the tea bag's string and tag over the rim */}
      <mesh material={m.string} position={[-0.0305, 0.058, 0.004]}>
        <cylinderGeometry args={[0.0006, 0.0006, 0.035, 4]} />
      </mesh>
      <mesh material={m.tag} position={[-0.0325, 0.036, 0.004]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.014, 0.018, 0.0008]} />
      </mesh>
      <group ref={steam} visible={!still}>
        {wisps.map((mat, i) => (
          <mesh key={i} material={mat} position={[0, 0.09, 0]}>
            <sphereGeometry args={[0.012, 10, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ---------------------------------------------------------------------------
// Ivy in a small white pot, its vines hanging over the front of the shelf
// ---------------------------------------------------------------------------

/** How far the pot stands from the front edge (see PLACEMENT.ivy). */
const IVY_TO_EDGE = 0.07

function TrailingIvy() {
  const m = useMemo(
    () => ({
      pot: new THREE.MeshStandardMaterial({ color: '#f1ece4', roughness: 0.7 }),
      soil: new THREE.MeshStandardMaterial({ color: '#3b2a1e', roughness: 1 }),
      vine: new THREE.MeshStandardMaterial({ color: '#4d6b3a', roughness: 0.9 }),
      leaf: new THREE.MeshStandardMaterial({ color: '#5f8f4e', roughness: 0.55, side: THREE.DoubleSide }),
      leafLight: new THREE.MeshStandardMaterial({ color: '#86ad6a', roughness: 0.55, side: THREE.DoubleSide }),
    }),
    [],
  )
  // vines: from the pot, forward over the edge, then down (lengths differ)
  const vines = useMemo(() => {
    // short enough to drape over the board, never in front of the books below
    const drops = [0.06, 0.08, 0.045, 0.07]
    const spreads = [-0.03, -0.008, 0.014, 0.034]
    return drops.map((drop, i) => {
      const x = spreads[i]
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x * 0.4, 0.062, 0),
        new THREE.Vector3(x * 0.8, 0.07, IVY_TO_EDGE * 0.5),
        new THREE.Vector3(x, 0.012, IVY_TO_EDGE + 0.008),
        new THREE.Vector3(x * 1.1, -0.04, IVY_TO_EDGE + 0.014),
        new THREE.Vector3(x * 1.2 + 0.006, -drop, IVY_TO_EDGE + 0.012),
      ])
      const geometry = new THREE.TubeGeometry(curve, 40, 0.0012, 5, false)
      const count = Math.round(drop * 110)
      const leaves = Array.from({ length: count }, (_, j) => {
        const t = 0.08 + (j / count) * 0.9
        return { pos: curve.getPoint(t), side: j % 2 ? 1 : -1, light: (i + j) % 3 === 0, size: 1 - t * 0.35 }
      })
      return { geometry, leaves }
    })
  }, [])
  // every leaf of one colour is one instanced mesh: two draws instead of about thirty
  const leafSets = useMemo(() => {
    const geometry = new THREE.CircleGeometry(0.0075, 7)
    const all = vines.flatMap((v) => v.leaves)
    const o = new THREE.Object3D()
    const make = (light: boolean) => {
      const list = all.filter((l) => l.light === light)
      const mesh = new THREE.InstancedMesh(geometry, light ? m.leafLight : m.leaf, Math.max(1, list.length))
      mesh.count = list.length
      list.forEach((l, i) => {
        o.position.set(l.pos.x + l.side * 0.005, l.pos.y, l.pos.z + 0.002)
        o.rotation.set(0.3, l.side * 0.6, l.side * 0.5)
        o.scale.set(l.size, l.size * 1.1, l.size)
        o.updateMatrix()
        mesh.setMatrixAt(i, o.matrix)
      })
      mesh.castShadow = true
      return mesh
    }
    return { geometry, dark: make(false), light: make(true) }
  }, [vines, m])
  useEffect(
    () => () => {
      Object.values(m).forEach((x) => x.dispose())
      vines.forEach((v) => v.geometry.dispose())
      leafSets.geometry.dispose()
      leafSets.dark.dispose()
      leafSets.light.dispose()
    },
    [m, vines, leafSets],
  )

  return (
    <group>
      <Part material={m.pot} position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.04, 0.032, 0.06, 28]} />
      </Part>
      <mesh material={m.soil} position={[0, 0.0595, 0]}>
        <cylinderGeometry args={[0.037, 0.037, 0.003, 24]} />
      </mesh>
      {/* a little bush on top */}
      {[-0.018, 0, 0.018].map((x, i) => (
        <Part key={i} material={i === 1 ? m.leafLight : m.leaf} position={[x, 0.075, (i - 1) * 0.01]} scale={[1, 0.6, 1]}>
          <sphereGeometry args={[0.02, 12, 8]} />
        </Part>
      ))}
      {vines.map((v, i) => (
        <mesh key={i} geometry={v.geometry} material={m.vine} castShadow />
      ))}
      <primitive object={leafSets.dark} />
      <primitive object={leafSets.light} />
    </group>
  )
}

// ---------------------------------------------------------------------------
// Fairy lights: a warm string drooping along the front of the top shelf,
// each bulb twinkling softly at its own pace
// ---------------------------------------------------------------------------

export function FairyLights({ width, top }: { width: number; top: number }) {
  const { wire, points } = useMemo(() => {
    // pinned at both sides and every ~40 cm, drooping a little in between
    const spans = Math.max(2, Math.round(width / 0.4))
    const z = SHELF.depth / 2 + 0.006
    const y = top - SHELF.board - 0.006
    const pts: THREE.Vector3[] = []
    const per = 24
    for (let i = 0; i <= spans * per; i++) {
      const u = i / per
      const within = u - Math.floor(u)
      pts.push(new THREE.Vector3(-width / 2 + (u / spans) * width, y - Math.sin(within * Math.PI) * 0.035, z))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const n = spans * 7
    return {
      wire: new THREE.TubeGeometry(curve, spans * per, 0.0009, 4, false),
      points: Array.from({ length: n }, (_, i) => curve.getPointAt((i + 0.5) / n)),
    }
  }, [width, top])
  const m = useMemo(
    () => ({
      wire: new THREE.MeshStandardMaterial({ color: '#b08d57', metalness: 0.6, roughness: 0.4 }),
      // white: each bulb's own warm colour comes from its instance colour
      bulb: new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
    }),
    [],
  )
  // all bulbs are one instanced mesh (one draw), each with its own colour to twinkle
  const bulbMesh = useMemo(() => {
    const geometry = new THREE.SphereGeometry(0.0042, 10, 8)
    const mesh = new THREE.InstancedMesh(geometry, m.bulb, Math.max(1, points.length))
    mesh.count = points.length
    const o = new THREE.Object3D()
    const warm = new THREE.Color(1, 0.83, 0.54)
    points.forEach((pt, i) => {
      o.position.set(pt.x, pt.y - 0.004, pt.z + 0.002)
      o.scale.set(1, 1.4, 1)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, warm)
    })
    return mesh
  }, [points, m])
  useEffect(() => () => wire.dispose(), [wire])
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m])
  useEffect(
    () => () => {
      bulbMesh.geometry.dispose()
      bulbMesh.dispose()
    },
    [bulbMesh],
  )
  const glowColor = useMemo(() => new THREE.Color(), [])

  const still = useContext(StillDecorations)
  useFrame(({ clock }) => {
    if (still) return
    const t = clock.elapsedTime
    for (let i = 0; i < points.length; i++) {
      const glow = 0.78 + 0.22 * Math.sin(t * (0.9 + (i % 5) * 0.23) + i * 1.7)
      bulbMesh.setColorAt(i, glowColor.setRGB(glow, glow * 0.83, glow * 0.54))
    }
    if (bulbMesh.instanceColor) bulbMesh.instanceColor.needsUpdate = true
  })

  return (
    <group>
      <mesh geometry={wire} material={m.wire} />
      <primitive object={bulbMesh} />
    </group>
  )
}
