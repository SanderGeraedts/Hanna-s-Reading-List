import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { NOOK, SHELF } from '#/lib/shelfLayout'
import type { NookSlot } from '#/lib/shelfLayout'
import { NOOK_THEMES } from '#/lib/nookThemes'
import type { NookThemeId } from '#/lib/nookThemes'
import { METALS, medalTier, toTexture } from './textures'
import { getMedalMaterials } from './BookMesh'
import { D, H, IH, IW, SHELL, W, sceneTextures } from './nookPaint'

/**
 * Book nooks: book-sized boxes that open onto a tiny scene, standing between
 * groups of books. Each group gets a scene that fits it (a lamplit alley, an
 * enchanted forest, a beach at sunset, a castle, …; see nookThemes) and its
 * own version of it. A hanging sign names the group that follows, gold with a
 * star for a series that's been read, with a medal hanging under it: bronze,
 * silver or gold for reading every book once, twice, three times. Origin is the bottom-centre, opening
 * towards the viewer (+z).
 */
export function BookNooks({ items }: { items: NookSlot[] }) {
  return (
    <>
      {items.map((n) => (
        <PlacedNook key={`${n.label}:${n.theme ?? 'alley'}`} slot={n} />
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
      <Nook
        label={slot.label}
        theme={slot.theme ?? 'alley'}
        variant={slot.variant ?? 0}
        complete={!!slot.complete}
        medal={slot.medal}
        sleep={!!slot.sleep}
      />
    </group>
  )
}

function Nook({
  label,
  theme: themeId,
  variant,
  complete,
  medal,
  sleep,
}: {
  label: string
  theme: NookThemeId
  variant: number
  complete: boolean
  /** a finished series: how many times every book has been read */
  medal?: number
  /** the whole series is a sleep read: a moon on the sign */
  sleep: boolean
}) {
  const theme = NOOK_THEMES[themeId]
  const tex = useMemo(() => sceneTextures(themeId, variant), [themeId, variant])
  const sign = useMemo(() => signTexture(label, complete, sleep), [label, complete, sleep])
  useEffect(() => () => sign.dispose(), [sign])
  // daylight scenes don't glow; night scenes light up their windows
  const glow = theme.sky === 'day' ? 0.15 : 1.4

  const shell = useMemo(
    () => new THREE.MeshStandardMaterial({ color: theme.shell, roughness: 0.6, metalness: 0.05 }),
    [theme.shell],
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
          emissive={theme.glow}
          emissiveIntensity={glow}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[IW / 2 - 0.0005, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[D - SHELL, IH]} />
        <meshStandardMaterial
          map={tex.rightWall.map}
          emissiveMap={tex.rightWall.glow}
          emissive={theme.glow}
          emissiveIntensity={glow}
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
          map={tex.ground.map}
          emissiveMap={tex.ground.glow}
          emissive={theme.glow}
          emissiveIntensity={glow * 0.65}
          roughness={0.85}
        />
      </mesh>

      {/* fairy lights strung across the alley */}
      {theme.lights &&
        strings.map((s, i) => (
          <FairyLights key={i} y={SHELL + s.y} z={s.z} sag={s.sag} colours={theme.lights!} />
        ))}

      {/* a street lamp by the left-hand wall */}
      {theme.lamp && <group position={[-IW / 2 + 0.014, SHELL, D * 0.05]}>
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
      </group>}

      {/* tall hanging sign naming the books that follow, written top to bottom like a spine (#50);
          off to the left so the scene stays in view */}
      <group position={[SIGN.x, H - SHELL, D / 2 - 0.014]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * SIGN.w * 0.3, -SIGN.hang / 2, 0]}>
            <cylinderGeometry args={[0.0006, 0.0006, SIGN.hang, 4]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        <mesh castShadow position={[0, -SIGN.hang - SIGN.h / 2, 0]}>
          <boxGeometry args={[SIGN.w, SIGN.h, 0.003]} />
          <meshStandardMaterial attach="material-0" color="#5a3a22" />
          <meshStandardMaterial attach="material-1" color="#5a3a22" />
          <meshStandardMaterial attach="material-2" color="#5a3a22" />
          <meshStandardMaterial attach="material-3" color="#5a3a22" />
          <meshStandardMaterial attach="material-4" map={sign} roughness={0.7} />
          <meshStandardMaterial attach="material-5" color="#5a3a22" />
        </mesh>
        {!!medal && <SignMedal count={medal} top={-SIGN.hang - SIGN.h} />}
      </group>
    </group>
  )
}

/** The medal of a finished series, hanging on a short ribbon from the bottom of its sign. */
const SIGN_MEDAL = { r: 0.012, ribbon: 0.014, depth: 0.0018 }
function SignMedal({ count, top }: { count: number; top: number }) {
  const mats = getMedalMaterials(count)
  const metal = METALS[medalTier(count)]
  const y = top - SIGN_MEDAL.ribbon - SIGN_MEDAL.r * 0.6
  return (
    <group>
      {/* the ribbon: two tails, like the ones on the books' spines */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * SIGN_MEDAL.r * 0.35, top - SIGN_MEDAL.ribbon / 2, 0.0005]} rotation={[0, 0, s * 0.12]}>
          <boxGeometry args={[SIGN_MEDAL.r * 0.6, SIGN_MEDAL.ribbon, 0.0006]} />
          <meshStandardMaterial color="#2f4fb5" roughness={0.8} />
        </mesh>
      ))}
      {/* white centre with a red pinstripe, as on the books' ribbons */}
      <mesh position={[0, top - SIGN_MEDAL.ribbon / 2, 0.0009]}>
        <boxGeometry args={[SIGN_MEDAL.r * 0.3, SIGN_MEDAL.ribbon, 0.0002]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.8} />
      </mesh>
      <mesh position={[0, top - SIGN_MEDAL.ribbon / 2, 0.001]}>
        <boxGeometry args={[SIGN_MEDAL.r * 0.08, SIGN_MEDAL.ribbon, 0.0002]} />
        <meshStandardMaterial color="#d23a3a" roughness={0.8} />
      </mesh>
      <group position={[0, y, 0.0012]}>
        <mesh castShadow material={mats.rim} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[SIGN_MEDAL.r, SIGN_MEDAL.r, SIGN_MEDAL.depth, 40, 1, true]} />
        </mesh>
        <mesh material={mats.face} position={[0, 0, SIGN_MEDAL.depth / 2]}>
          <circleGeometry args={[SIGN_MEDAL.r, 40]} />
        </mesh>
        <mesh position={[0, 0, -SIGN_MEDAL.depth / 2]} rotation={[0, Math.PI, 0]}>
          <circleGeometry args={[SIGN_MEDAL.r, 40]} />
          <meshStandardMaterial color={metal.dark} metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}

/** A string of warm bulbs hanging in a shallow curve between the house fronts. */
function FairyLights({ y, z, sag, colours }: { y: number; z: number; sag: number; colours: string[] }) {
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
          <meshBasicMaterial color={colours[i % colours.length]} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/** The hanging sign: tall and narrow, so a long name stays big enough to read (#50). */
const SIGN = { w: 0.03, h: 0.17, hang: 0.01, x: -W / 2 + SHELL + 0.03 / 2 + 0.006 }

function signTexture(label: string, complete = false, sleep = false) {
  // drawn lying down, then turned a quarter so the text runs down the sign
  const long = 816
  const short = Math.round((long * SIGN.w) / SIGN.h)
  const c = document.createElement('canvas')
  c.width = long
  c.height = short
  const ctx = c.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 0, c.height)
  // a finished series gets a gilded sign
  grad.addColorStop(0, complete ? '#d9ad45' : '#7a5232')
  grad.addColorStop(1, complete ? '#a87a22' : '#4e321e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.strokeStyle = complete ? '#fff0b0' : '#d9b46a'
  ctx.lineWidth = 6
  ctx.strokeRect(10, 10, c.width - 20, c.height - 20)
  ctx.fillStyle = complete ? '#3a2614' : '#f6e7c4'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const text = `${complete ? '★ ' : ''}${sleep ? '🌙 ' : ''}${label}`
  let size = Math.round(short * 0.58)
  do {
    ctx.font = `italic 600 ${size}px Georgia, "Segoe UI Symbol", "Times New Roman", serif`
    size -= 2
  } while (ctx.measureText(text).width > c.width - 64 && size > 18)
  ctx.fillText(text, c.width / 2, c.height / 2 + 3)

  // stand it up: the start of the text at the top, read with the head tilted right, like a spine
  const up = document.createElement('canvas')
  up.width = short
  up.height = long
  const u = up.getContext('2d')!
  u.translate(short, 0)
  u.rotate(Math.PI / 2)
  u.drawImage(c, 0, 0)
  return toTexture(up)
}
