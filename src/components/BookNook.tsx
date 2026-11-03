import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { NOOK, SHELF } from '#/lib/shelfLayout'
import type { NookSlot } from '#/lib/shelfLayout'
import { toTexture } from './textures'

/**
 * Book nooks: book-sized boxes that open onto a tiny lamplit alley at night,
 * standing between groups of books. A hanging sign names the group that
 * follows. Origin is the bottom-centre, opening towards the viewer (+z).
 */
export function BookNooks({ items }: { items: NookSlot[] }) {
  return (
    <>
      {items.map((n) => (
        <PlacedNook key={n.label} slot={n} />
      ))}
    </>
  )
}

// front flush with the books' spines
const NOOK_Z = SHELF.depth / 2 - NOOK.depth / 2 - 0.012

function PlacedNook({ slot }: { slot: NookSlot }) {
  const group = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const d = Math.min(dt, 0.05)
    g.position.x = THREE.MathUtils.damp(g.position.x, slot.x, 8, d)
    g.position.y = THREE.MathUtils.damp(g.position.y, slot.floorY, 8, d)
  })
  return (
    <group ref={group} position={[slot.x, slot.floorY, NOOK_Z]}>
      <Nook label={slot.label} />
    </group>
  )
}

const SHELL = 0.007 // board thickness of the box
const W = NOOK.width
const H = NOOK.height
const D = NOOK.depth
const IW = W - SHELL * 2 // inner width
const IH = H - SHELL * 2

function Nook({ label }: { label: string }) {
  const tex = useMemo(getNookTextures, [])
  const sign = useMemo(() => signTexture(label), [label])
  useEffect(() => () => sign.dispose(), [sign])

  const shell = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2d4440', roughness: 0.6, metalness: 0.05 }),
    [],
  )
  const gilt = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c9a24a', roughness: 0.35, metalness: 0.6 }),
    [],
  )
  useEffect(
    () => () => {
      shell.dispose()
      gilt.dispose()
    },
    [shell, gilt],
  )

  const strings = useMemo(
    () => [
      { z: D * 0.18, y: IH * 0.74, sag: 0.022 },
      { z: -D * 0.12, y: IH * 0.8, sag: 0.018 },
      { z: -D * 0.36, y: IH * 0.84, sag: 0.014 },
    ],
    [],
  )

  return (
    <group>
      {/* the box, bound like a book: two covers, top, bottom and back */}
      <mesh castShadow receiveShadow material={shell} position={[-W / 2 + SHELL / 2, H / 2, 0]}>
        <boxGeometry args={[SHELL, H, D]} />
      </mesh>
      <mesh castShadow receiveShadow material={shell} position={[W / 2 - SHELL / 2, H / 2, 0]}>
        <boxGeometry args={[SHELL, H, D]} />
      </mesh>
      <mesh castShadow receiveShadow material={shell} position={[0, H - SHELL / 2, 0]}>
        <boxGeometry args={[W, SHELL, D]} />
      </mesh>
      <mesh receiveShadow material={shell} position={[0, SHELL / 2, 0]}>
        <boxGeometry args={[W, SHELL, D]} />
      </mesh>
      <mesh material={shell} position={[0, H / 2, -D / 2 + SHELL / 2]}>
        <boxGeometry args={[W, H, SHELL]} />
      </mesh>
      {/* gilt edging round the opening */}
      {[
        [0, H - SHELL / 2, W, 0.0025],
        [0, SHELL / 2, W, 0.0025],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} material={gilt} position={[x, y, D / 2 + 0.0006]}>
          <boxGeometry args={[w, h, 0.001]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} material={gilt} position={[s * (W / 2 - SHELL / 2), H / 2, D / 2 + 0.0006]}>
          <boxGeometry args={[0.0025, H, 0.001]} />
        </mesh>
      ))}

      {/* the alley: house fronts on both sides, night sky at the end, cobbles underfoot */}
      <mesh position={[-IW / 2 + 0.0005, H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[D - SHELL, IH]} />
        <meshStandardMaterial
          map={tex.leftWall.map}
          emissiveMap={tex.leftWall.glow}
          emissive="#ffc46b"
          emissiveIntensity={1.4}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[IW / 2 - 0.0005, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[D - SHELL, IH]} />
        <meshStandardMaterial
          map={tex.rightWall.map}
          emissiveMap={tex.rightWall.glow}
          emissive="#ffc46b"
          emissiveIntensity={1.4}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[0, H / 2, -D / 2 + SHELL + 0.0005]}>
        <planeGeometry args={[IW, IH]} />
        <meshBasicMaterial map={tex.sky} toneMapped={false} />
      </mesh>
      <mesh position={[0, SHELL + 0.0005, SHELL / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[IW, D - SHELL]} />
        <meshStandardMaterial
          map={tex.cobbles.map}
          emissiveMap={tex.cobbles.glow}
          emissive="#ffb85c"
          emissiveIntensity={0.9}
          roughness={0.85}
        />
      </mesh>

      {/* fairy lights strung across the alley */}
      {strings.map((s, i) => (
        <FairyLights key={i} y={SHELL + s.y} z={s.z} sag={s.sag} />
      ))}

      {/* a street lamp by the left-hand houses */}
      <group position={[-IW / 2 + 0.014, SHELL, D * 0.05]}>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.0018, 0.0024, 0.14, 8]} />
          <meshStandardMaterial color="#1c1c22" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.146, 0]}>
          <boxGeometry args={[0.011, 0.014, 0.011]} />
          <meshBasicMaterial color="#ffe2a0" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.156, 0]}>
          <coneGeometry args={[0.0095, 0.008, 4]} />
          <meshStandardMaterial color="#1c1c22" roughness={0.5} metalness={0.4} />
        </mesh>
      </group>

      {/* hanging sign naming the books that follow */}
      <group position={[0, H - SHELL, D / 2 - 0.018]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.026, -0.009, 0]}>
            <cylinderGeometry args={[0.0006, 0.0006, 0.018, 4]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        <mesh castShadow position={[0, -0.031, 0]}>
          <boxGeometry args={[0.078, 0.026, 0.003]} />
          <meshStandardMaterial attach="material-0" color="#5a3a22" />
          <meshStandardMaterial attach="material-1" color="#5a3a22" />
          <meshStandardMaterial attach="material-2" color="#5a3a22" />
          <meshStandardMaterial attach="material-3" color="#5a3a22" />
          <meshStandardMaterial attach="material-4" map={sign} roughness={0.7} />
          <meshStandardMaterial attach="material-5" color="#5a3a22" />
        </mesh>
      </group>
    </group>
  )
}

/** A string of warm bulbs hanging in a shallow curve between the house fronts. */
function FairyLights({ y, z, sag }: { y: number; z: number; sag: number }) {
  const { wire, bulbs } = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const n = 24
    for (let i = 0; i <= n; i++) {
      const t = i / n
      pts.push(new THREE.Vector3(-IW / 2 + t * IW, y - sag * 4 * t * (1 - t), z))
    }
    const wire = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0004, 4, false)
    const bulbs = [1, 2, 3, 4, 5, 6].map((i) => pts[i * 4 - 2 + (i % 2)])
    return { wire, bulbs }
  }, [y, z, sag])
  useEffect(() => () => wire.dispose(), [wire])
  return (
    <group>
      <mesh geometry={wire}>
        <meshBasicMaterial color="#1a1410" />
      </mesh>
      {bulbs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y - 0.003, p.z]}>
          <sphereGeometry args={[0.0028, 8, 6]} />
          <meshBasicMaterial color={['#ffd27a', '#ffb86b', '#fff0c2'][i % 3]} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

// ---------------------------------------------------------------------------
// textures (painted once, shared by every nook)
// ---------------------------------------------------------------------------

const PX = 2000 // pixels per metre

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.round(w * PX)
  c.height = Math.round(h * PX)
  return c
}

/** Seeded random so every nook's houses look the same. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

interface WallTex {
  map: THREE.Texture
  glow: THREE.Texture
}

/**
 * House fronts along one side of the alley. `u` runs from the opening (0) to
 * the back (1) when `frontFirst`, the other way round otherwise.
 */
function paintWall(frontFirst: boolean, palette: string[], seed: number): WallTex {
  const wallLen = D - SHELL
  const c = makeCanvas(wallLen, IH)
  const g = makeCanvas(wallLen, IH)
  const ctx = c.getContext('2d')!
  const gl = g.getContext('2d')!
  const cw = c.width
  const ch = c.height
  const rand = rng(seed)
  gl.fillStyle = '#000'
  gl.fillRect(0, 0, cw, ch)

  // three narrow houses side by side, the one at the back lower
  const houses = 3
  const hw = cw / houses
  for (let i = 0; i < houses; i++) {
    const fromFront = frontFirst ? i : houses - 1 - i
    const x0 = i * hw
    const roof = ch * (0.08 + fromFront * 0.07 + rand() * 0.04)
    ctx.fillStyle = palette[(i + seed) % palette.length]
    ctx.fillRect(x0, roof, hw + 1, ch - roof)
    // timber/plaster texture
    ctx.globalAlpha = 0.08
    for (let k = 0; k < 120; k++) {
      ctx.fillStyle = rand() < 0.5 ? '#000' : '#fff'
      ctx.fillRect(x0 + rand() * hw, roof + rand() * (ch - roof), 2 + rand() * 6, 1 + rand() * 3)
    }
    ctx.globalAlpha = 1
    // eaves line and the dark gap to the next house
    ctx.fillStyle = 'rgba(30,20,20,0.75)'
    ctx.fillRect(x0, roof, hw, ch * 0.012)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(x0 + hw - 2, roof, 3, ch - roof)

    // windows: two per floor
    const floors = 3
    const floorH = (ch * 0.74 - roof) / floors
    for (let f = 0; f < floors; f++) {
      for (let k = 0; k < 2; k++) {
        const wx = x0 + hw * (0.2 + k * 0.42)
        const wy = roof + ch * 0.04 + f * floorH
        const ww = hw * 0.22
        const wh = floorH * 0.55
        const lit = rand() < 0.62
        ctx.fillStyle = '#2a1e18'
        ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4)
        if (lit) {
          const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh)
          grad.addColorStop(0, '#ffe7a8')
          grad.addColorStop(1, '#f0a24a')
          ctx.fillStyle = grad
          gl.fillStyle = rand() < 0.5 ? '#ffffff' : '#d9c6a0'
          gl.fillRect(wx, wy, ww, wh)
        } else {
          ctx.fillStyle = '#26304f'
        }
        ctx.fillRect(wx, wy, ww, wh)
        // glazing bars and a flower box
        ctx.fillStyle = '#2a1e18'
        ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh)
        ctx.fillRect(wx, wy + wh / 2 - 1, ww, 2)
        ctx.fillStyle = '#5b3b26'
        ctx.fillRect(wx - 3, wy + wh + 2, ww + 6, 5)
        for (let p = 0; p < 4; p++) {
          ctx.fillStyle = ['#e26d8a', '#f2c14e', '#ffffff', '#c45ab3'][(p + f + k) % 4]
          ctx.beginPath()
          ctx.arc(wx + (ww * (p + 0.5)) / 4, wy + wh + 1, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    // a door at street level
    const dx = x0 + hw * 0.33
    const dw = hw * 0.32
    const dy = ch * 0.8
    ctx.fillStyle = ['#7b2f2f', '#2f4f6b', '#3f5f3a'][(i + seed) % 3]
    ctx.beginPath()
    ctx.moveTo(dx, ch)
    ctx.lineTo(dx, dy + dw / 2)
    ctx.arc(dx + dw / 2, dy + dw / 2, dw / 2, Math.PI, 0)
    ctx.lineTo(dx + dw, ch)
    ctx.fill()
    ctx.fillStyle = '#e8c56a'
    ctx.beginPath()
    ctx.arc(dx + dw * 0.8, ch - (ch - dy) * 0.45, 2.5, 0, Math.PI * 2)
    ctx.fill()
    // fanlight over the door, softly lit
    ctx.fillStyle = '#ffd98a'
    ctx.beginPath()
    ctx.arc(dx + dw / 2, dy + dw / 2, dw * 0.36, Math.PI, 0)
    ctx.fill()
    gl.fillStyle = '#c8a870'
    gl.beginPath()
    gl.arc(dx + dw / 2, dy + dw / 2, dw * 0.36, Math.PI, 0)
    gl.fill()
  }
  // darker towards the back of the alley
  const shade = ctx.createLinearGradient(0, 0, cw, 0)
  shade.addColorStop(frontFirst ? 0 : 1, 'rgba(0,0,10,0)')
  shade.addColorStop(frontFirst ? 1 : 0, 'rgba(0,0,10,0.35)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, cw, ch)
  // and the night above the rooftops
  const sky = ctx.createLinearGradient(0, 0, 0, ch * 0.3)
  sky.addColorStop(0, '#141a3a')
  sky.addColorStop(1, '#2b2f62')
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, cw, ch)
  ctx.globalCompositeOperation = 'source-over'

  return { map: toTexture(c), glow: toTexture(g) }
}

function paintSky() {
  const c = makeCanvas(IW, IH)
  const ctx = c.getContext('2d')!
  const cw = c.width
  const ch = c.height
  const grad = ctx.createLinearGradient(0, 0, 0, ch)
  grad.addColorStop(0, '#0f1433')
  grad.addColorStop(0.55, '#2e3170')
  grad.addColorStop(0.85, '#7a5a8c')
  grad.addColorStop(1, '#d9927a')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, cw, ch)
  const rand = rng(7)
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,240,${0.4 + rand() * 0.6})`
    ctx.fillRect(rand() * cw, rand() * ch * 0.55, 1.5, 1.5)
  }
  // moon with a soft halo
  const mx = cw * 0.66
  const my = ch * 0.2
  const halo = ctx.createRadialGradient(mx, my, 2, mx, my, cw * 0.3)
  halo.addColorStop(0, 'rgba(255,245,210,0.55)')
  halo.addColorStop(1, 'rgba(255,245,210,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, cw, ch)
  ctx.fillStyle = '#fff6d8'
  ctx.beginPath()
  ctx.arc(mx, my, cw * 0.075, 0, Math.PI * 2)
  ctx.fill()
  // distant rooftops and a little tower at the end of the street
  ctx.fillStyle = '#1b1838'
  ctx.beginPath()
  ctx.moveTo(0, ch)
  let x = 0
  while (x < cw) {
    const w = cw * (0.12 + rand() * 0.14)
    const top = ch * (0.62 + rand() * 0.12)
    ctx.lineTo(x, top + ch * 0.03)
    ctx.lineTo(x + w / 2, top)
    ctx.lineTo(x + w, top + ch * 0.03)
    x += w
  }
  ctx.lineTo(cw, ch)
  ctx.fill()
  ctx.fillRect(cw * 0.36, ch * 0.5, cw * 0.1, ch * 0.5)
  ctx.beginPath()
  ctx.moveTo(cw * 0.34, ch * 0.5)
  ctx.lineTo(cw * 0.41, ch * 0.4)
  ctx.lineTo(cw * 0.48, ch * 0.5)
  ctx.fill()
  // a few lit windows far away
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = '#ffcf7a'
    ctx.fillRect(rand() * cw, ch * (0.74 + rand() * 0.2), 2, 3)
  }
  return toTexture(c)
}

function paintCobbles(): WallTex {
  const c = makeCanvas(IW, D - SHELL)
  const g = makeCanvas(IW, D - SHELL)
  const ctx = c.getContext('2d')!
  const gl = g.getContext('2d')!
  const cw = c.width
  const ch = c.height
  ctx.fillStyle = '#2b2724'
  ctx.fillRect(0, 0, cw, ch)
  const rand = rng(3)
  const s = 13
  for (let y = 0; y < ch + s; y += s * 0.8) {
    const off = (Math.round(y / (s * 0.8)) % 2) * s * 0.5
    for (let x = -s; x < cw + s; x += s) {
      const v = 70 + rand() * 40
      ctx.fillStyle = `rgb(${v + 8}, ${v + 2}, ${v - 6})`
      ctx.beginPath()
      ctx.ellipse(x + off, y, s * 0.42, s * 0.32, rand() * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // warm pool of light from the windows and the lamp
  gl.fillStyle = '#000'
  gl.fillRect(0, 0, cw, ch)
  const pool = gl.createRadialGradient(cw * 0.25, ch * 0.6, 4, cw * 0.4, ch * 0.55, cw * 0.9)
  pool.addColorStop(0, 'rgba(255,220,160,0.55)')
  pool.addColorStop(1, 'rgba(255,220,160,0)')
  gl.fillStyle = pool
  gl.fillRect(0, 0, cw, ch)
  return { map: toTexture(c), glow: toTexture(g) }
}

let nookTextures: { leftWall: WallTex; rightWall: WallTex; sky: THREE.Texture; cobbles: WallTex } | null =
  null
function getNookTextures() {
  nookTextures ??= {
    // the left wall's texture runs from the opening to the back, the right wall's the other way
    leftWall: paintWall(true, ['#c98f5a', '#d8b48a', '#a86a52'], 1),
    rightWall: paintWall(false, ['#b87a8a', '#d6c08f', '#8f9fb0'], 2),
    sky: paintSky(),
    cobbles: paintCobbles(),
  }
  return nookTextures
}

function signTexture(label: string) {
  const c = document.createElement('canvas')
  c.width = 384
  c.height = 128
  const ctx = c.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, c.height)
  grad.addColorStop(0, '#7a5232')
  grad.addColorStop(1, '#4e321e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = '#d9b46a'
  ctx.lineWidth = 6
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20)
  ctx.fillStyle = '#f6e7c4'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let size = 64
  do {
    ctx.font = `italic 600 ${size}px Georgia, "Times New Roman", serif`
    size -= 2
  } while (ctx.measureText(label).width > c.width - 56 && size > 18)
  ctx.fillText(label, c.width / 2, c.height / 2 + 3)
  return toTexture(c)
}
