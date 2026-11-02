import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { DecorKind, DecorSlot } from '#/lib/shelfLayout'
import { SHELF } from '#/lib/shelfLayout'
import { toTexture } from './textures'

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

  useFrame(({ clock }) => {
    const f = flame.current
    if (!f) return
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
