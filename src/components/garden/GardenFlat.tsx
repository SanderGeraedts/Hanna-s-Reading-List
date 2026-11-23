import { Fragment } from 'react'
import type { Visitors, YearGarden } from '#/lib/garden/garden'
import type { GardenItemId } from '#/lib/garden/numbers'
import { itemSlotsFor } from '#/lib/garden/numbers'
import type { Season } from '#/lib/garden/seasons'
import { BED_D, BED_W, gardenLayout, slotPoint, spotPoint } from '#/lib/garden/view'
import { PlantShape } from './plantSvg'

/**
 * The flat drawn garden (T-0061 §3, D-0051 §2): the year's ground, its beds and
 * spots, every plant in its spot, the garden items along the bottom and the
 * visitors — all as one inline SVG, in garden units, with no WebGL and no
 * images. The same drawing, smaller, is the dashboard block (T-0065).
 *
 * It draws only; the buttons she tends with lie over it (`SpotLayer`), so this
 * is `aria-hidden` and has no handlers.
 */

const GROUND: Record<Season, { grass: string; grass2: string; earth: string; rim: string }> = {
  spring: { grass: '#86ab6b', grass2: '#7ba263', earth: '#6b4f39', rim: '#5d4531' },
  summer: { grass: '#6f9a58', grass2: '#688f52', earth: '#6b4f39', rim: '#5d4531' },
  autumn: { grass: '#8a9655', grass2: '#7f8b4f', earth: '#64482f', rim: '#56402b' },
  winter: { grass: '#c9cfdc', grass2: '#c0c7d6', earth: '#5a4434', rim: '#4c3a2a' },
}

/** The same ground after dark: cooler, darker, and the snow still pale (D-0071). */
const NIGHT: Record<Season, { grass: string; grass2: string; earth: string; rim: string }> = {
  spring: { grass: '#38485a', grass2: '#334252', earth: '#33281f', rim: '#2a211a' },
  summer: { grass: '#334655', grass2: '#2f404e', earth: '#33281f', rim: '#2a211a' },
  autumn: { grass: '#3c4450', grass2: '#363e49', earth: '#2f251c', rim: '#271f18' },
  winter: { grass: '#4a5468', grass2: '#444e61', earth: '#2c231c', rim: '#241d17' },
}

export interface GardenFlatProps {
  year: YearGarden
  season: Season
  /** after dark: a cool, dark garden where only the night-bloomers glow (D-0071) */
  night?: boolean
  /** beds across; the phone's garden is one bed wide */
  columns?: number
  /** the dashboard block's smaller drawing: one bed, no visitors */
  compact?: boolean
  /** nothing moves */
  reduce?: boolean
  /** the plant she has picked up, drawn lifted */
  picked?: string | null
  /** the plant she has just found by searching, drawn with a ring (T-0066) */
  found?: string | null
}

export function GardenFlat({ year, season, night, columns = 1, compact, reduce, picked, found }: GardenFlatProps) {
  const beds = compact ? Math.min(2, year.beds) : year.beds
  const layout = gardenLayout(beds, compact ? 2 : columns, !compact)
  const ground = night ? NIGHT[season] : GROUND[season]
  const plants = [...year.plants]
    .filter((p) => p.bed < beds)
    // the beds at the back are drawn first, so a tall plant leans over the bed behind it
    .sort((a, b) => a.bed - b.bed || a.spot - b.spot)
  return (
    <svg
      className="garden-svg"
      viewBox={`0 0 ${layout.width} ${layout.depth}`}
      preserveAspectRatio="xMidYMin meet"
      aria-hidden="true"
      focusable="false"
    >
      <rect x={0} y={0} width={layout.width} height={layout.depth} fill={ground.grass} rx={0.5} />
      {/* two flat tones instead of a texture: stripes of grass, cheapest thing that isn't a flat colour */}
      {Array.from({ length: Math.ceil(layout.depth / 1.5) }, (_, i) => (
        <rect key={i} x={0} y={i * 1.5 + 0.75} width={layout.width} height={0.75} fill={ground.grass2} opacity={0.5} />
      ))}
      {layout.beds.map((box) => (
        <Fragment key={box.bed}>
          <rect x={box.x} y={box.z} width={BED_W} height={BED_D} rx={0.35} fill={ground.earth} stroke={ground.rim} strokeWidth={0.08} />
          {season === 'winter' && <rect x={box.x} y={box.z} width={BED_W} height={BED_D * 0.45} rx={0.35} fill="#eef1f8" opacity={0.8} />}
          {!compact &&
            Array.from({ length: 12 }, (_, s) => {
              const p = spotPoint(layout, box.bed, s)
              const taken = year.plants.some((pl) => pl.bed === box.bed && pl.spot === s)
              return taken ? null : <circle key={s} cx={p.x} cy={p.z} r={0.22} fill="#000" opacity={0.12} />
            })}
        </Fragment>
      ))}
      {!compact && year.items.size > 0 && (
        <rect x={0.4} y={layout.stripZ} width={layout.width - 0.8} height={1.4} rx={0.4} fill="#000" opacity={0.08} />
      )}
      {!compact &&
        [...year.items].map(([item, slot]) => {
          const at = slotPoint(layout, slot, itemSlotsFor(year.beds))
          return (
            <g key={item} transform={`translate(${at.x} ${at.z})`}>
              <ItemShape item={item} season={season} />
            </g>
          )
        })}
      {plants.map((p) => {
        const at = spotPoint(layout, p.bed, p.spot)
        return (
          <g key={p.id} transform={`translate(${at.x} ${at.z + 0.35})`} className={picked === p.id ? 'garden-plant picked' : 'garden-plant'}>
            {found === p.id && <circle cx={0} cy={0} r={0.5} fill="none" stroke="#e8c15a" strokeWidth={0.1} opacity={0.9} />}
            <ellipse cx={0} cy={0} rx={0.22} ry={0.09} fill="#000" opacity={0.18} />
            <PlantShape plant={p} season={season} compact={compact} />
          </g>
        )
      })}
      {!compact && !night && <VisitorMarks visitors={year.visitors} layout={{ width: layout.width, depth: layout.depth }} reduce={reduce} />}
      {/* after dark the whole garden cools down; the night-bloomers keep their own glow */}
      {night && <rect x={0} y={0} width={layout.width} height={layout.depth} fill="#141d2e" opacity={0.3} rx={0.5} />}
    </svg>
  )
}

/** The garden items, drawn flat and simply (T-0061 §3). */
export function ItemShape({ item, season }: { item: GardenItemId; season: Season }) {
  const snow = season === 'winter'
  switch (item) {
    case 'path':
      return (
        <>
          {[-0.5, 0, 0.5].map((x, i) => (
            <rect key={i} x={x - 0.18} y={-0.14} width={0.36} height={0.28} rx={0.08} fill={snow ? '#e9ecf4' : '#b9ad99'} />
          ))}
        </>
      )
    case 'bench':
      return (
        <>
          <rect x={-0.45} y={-0.22} width={0.9} height={0.2} rx={0.06} fill="#8a6440" />
          <rect x={-0.45} y={0.02} width={0.9} height={0.1} rx={0.04} fill="#6f4f32" />
          {snow && <rect x={-0.45} y={-0.26} width={0.9} height={0.08} rx={0.04} fill="#eef1f8" />}
        </>
      )
    case 'birdbath':
      return (
        <>
          <rect x={-0.06} y={-0.1} width={0.12} height={0.34} fill="#9aa0a8" />
          <ellipse cx={0} cy={-0.16} rx={0.3} ry={0.14} fill="#b4bac2" />
          <ellipse cx={0} cy={-0.17} rx={0.21} ry={0.09} fill={snow ? '#dfe6f2' : '#7fa8c4'} />
        </>
      )
    case 'pond':
      return (
        <>
          <ellipse cx={0} cy={0} rx={0.62} ry={0.38} fill="#6f91ae" />
          <ellipse cx={0} cy={-0.04} rx={0.5} ry={0.28} fill={snow ? '#cfdcea' : '#86aecb'} />
          <ellipse cx={-0.14} cy={-0.08} rx={0.14} ry={0.06} fill="#a7c6dc" opacity={0.8} />
        </>
      )
    case 'lanterns':
      return (
        <>
          {[-0.4, 0.4].map((x, i) => (
            <Fragment key={i}>
              <rect x={x - 0.03} y={-0.1} width={0.06} height={0.36} fill="#5a4a3a" />
              <circle cx={x} cy={-0.2} r={0.14} fill="#d9a85b" />
              <circle cx={x} cy={-0.2} r={0.22} fill="#d9a85b" opacity={0.25} />
            </Fragment>
          ))}
        </>
      )
    case 'greenhouse':
      return (
        <>
          <rect x={-0.55} y={-0.42} width={1.1} height={0.62} rx={0.06} fill="#cfe3e6" opacity={0.75} stroke="#8fa7aa" strokeWidth={0.05} />
          <path d={`M-0.6 -0.42 L0 -0.72 L0.6 -0.42 Z`} fill="#dceaec" opacity={0.85} stroke="#8fa7aa" strokeWidth={0.05} />
          <path d="M0 -0.42 L0 0.2" stroke="#8fa7aa" strokeWidth={0.04} />
        </>
      )
    case 'seedlings':
      return (
        <>
          <rect x={-0.55} y={-0.16} width={1.1} height={0.3} rx={0.05} fill="#8a6440" />
          <rect x={-0.5} y={-0.13} width={1} height={0.12} rx={0.04} fill="#5b4433" />
          {[-0.34, 0, 0.34].map((x, i) => (
            <Fragment key={i}>
              <path d={`M${x} -0.1 L${x} -0.3`} stroke="#6f9a58" strokeWidth={0.05} strokeLinecap="round" />
              <ellipse cx={x} cy={-0.3} rx={0.11} ry={0.06} fill="#86ab6b" />
            </Fragment>
          ))}
        </>
      )
    case 'parasol':
      return (
        <>
          <path d="M0 0.24 L0 -0.3" stroke="#8a7a66" strokeWidth={0.05} strokeLinecap="round" />
          <path d="M-0.62 -0.28 Q0 -0.74 0.62 -0.28 Z" fill="#e5a06a" />
          <path d="M-0.2 -0.28 Q0 -0.62 0.2 -0.28 Z" fill="#f0bb8d" opacity={0.8} />
        </>
      )
    case 'leaves':
      return (
        <>
          <ellipse cx={0} cy={0} rx={0.6} ry={0.26} fill="#b9742f" />
          <ellipse cx={-0.22} cy={-0.07} rx={0.3} ry={0.16} fill="#cf9040" />
          <ellipse cx={0.24} cy={-0.04} rx={0.26} ry={0.14} fill="#a6632c" />
        </>
      )
    case 'snowman':
      return (
        <>
          <circle cx={0} cy={0} r={0.3} fill="#f2f5fb" />
          <circle cx={0} cy={-0.3} r={0.22} fill="#f7f9fd" />
          <circle cx={0} cy={-0.56} r={0.16} fill="#fbfcff" />
          <path d="M0.04 -0.56 L0.2 -0.52 L0.04 -0.5 Z" fill="#e8963f" />
          <rect x={-0.17} y={-0.76} width={0.34} height={0.08} rx={0.02} fill="#4a3a2c" />
        </>
      )
    case 'fountain':
      return (
        <>
          <ellipse cx={0} cy={0} rx={0.62} ry={0.36} fill="#9aa0a8" />
          <ellipse cx={0} cy={-0.02} rx={0.5} ry={0.27} fill={snow ? '#dfe6f2' : '#7fa8c4'} />
          <rect x={-0.07} y={-0.42} width={0.14} height={0.4} fill="#b4bac2" />
          <ellipse cx={0} cy={-0.44} rx={0.25} ry={0.1} fill="#b4bac2" />
        </>
      )
    case 'arch':
      return (
        <>
          <path d="M-0.42 0.2 L-0.42 -0.36 Q0 -0.78 0.42 -0.36 L0.42 0.2" fill="none" stroke="#8a6440" strokeWidth={0.09} strokeLinecap="round" />
          {!snow && [-0.3, 0.05, 0.34].map((x, i) => <circle key={i} cx={x} cy={-0.5 + Math.abs(x) * 0.3} r={0.09} fill="#e07f94" />)}
        </>
      )
    case 'swing':
      return (
        <>
          <path d="M-0.3 0.22 L-0.3 -0.5 L0.34 -0.5" stroke="#6b4a32" strokeWidth={0.08} fill="none" strokeLinecap="round" />
          {[0.1, 0.46].map((x, i) => <path key={i} d={`M${x} -0.48 L${x} -0.1`} stroke="#9a8a74" strokeWidth={0.03} />)}
          <rect x={0.04} y={-0.12} width={0.48} height={0.07} rx={0.03} fill="#8a6440" />
        </>
      )
    case 'dovecote':
      return (
        <>
          <rect x={-0.06} y={-0.2} width={0.12} height={0.42} fill="#8a7a66" />
          <rect x={-0.28} y={-0.5} width={0.56} height={0.32} rx={0.04} fill="#efe9dc" stroke="#c9c0ae" strokeWidth={0.03} />
          <path d="M-0.36 -0.5 L0 -0.72 L0.36 -0.5 Z" fill="#8a6440" />
          <circle cx={0} cy={-0.36} r={0.07} fill="#5b4433" />
        </>
      )
    case 'gate':
      return (
        <>
          {[-0.5, 0.5].map((x, i) => <rect key={i} x={x - 0.06} y={-0.38} width={0.12} height={0.6} rx={0.04} fill="#6f4f32" />)}
          {[-0.28, -0.1, 0.1, 0.28].map((x, i) => <rect key={i} x={x - 0.025} y={-0.3} width={0.05} height={0.5} fill="#8a6440" />)}
          {[-0.22, 0.02].map((y, i) => <rect key={i} x={-0.44} y={y} width={0.88} height={0.05} rx={0.02} fill="#8a6440" />)}
        </>
      )
  }
}

/** Bees, butterflies and birds (T-0063 §3): small marks that drift; still with reduce motion. */
function VisitorMarks({ visitors, layout, reduce }: { visitors: Visitors; layout: { width: number; depth: number }; reduce?: boolean }) {
  const marks: Array<{ kind: 'bee' | 'butterfly' | 'bird'; i: number }> = [
    ...Array.from({ length: visitors.bees }, (_, i) => ({ kind: 'bee' as const, i })),
    ...Array.from({ length: visitors.butterflies }, (_, i) => ({ kind: 'butterfly' as const, i })),
    ...Array.from({ length: visitors.birds }, (_, i) => ({ kind: 'bird' as const, i })),
  ]
  return (
    <>
      {marks.map((m, n) => {
        const x = layout.width * (0.18 + ((n * 0.27) % 0.66))
        const y = layout.depth * (0.12 + ((n * 0.19) % 0.7))
        return (
          <g key={`${m.kind}${m.i}`} transform={`translate(${x} ${y})`} className={reduce ? 'garden-visitor still' : `garden-visitor drift-${n % 3}`}>
            {m.kind === 'bee' && (
              <>
                <ellipse cx={0} cy={0} rx={0.1} ry={0.07} fill="#e2c05a" />
                <path d="M-0.05 -0.01 L0.05 -0.01" stroke="#3b2d1c" strokeWidth={0.04} />
                <ellipse cx={0} cy={-0.07} rx={0.07} ry={0.03} fill="#ffffff" opacity={0.7} />
              </>
            )}
            {m.kind === 'butterfly' && (
              <>
                <ellipse cx={-0.07} cy={0} rx={0.08} ry={0.1} fill="#e4a0c8" />
                <ellipse cx={0.07} cy={0} rx={0.08} ry={0.1} fill="#e4a0c8" />
                <rect x={-0.015} y={-0.08} width={0.03} height={0.16} rx={0.015} fill="#4a3a2c" />
              </>
            )}
            {m.kind === 'bird' && (
              <>
                <ellipse cx={0} cy={0} rx={0.16} ry={0.1} fill="#8d7f9c" />
                <circle cx={0.13} cy={-0.05} r={0.07} fill="#8d7f9c" />
                <path d="M0.19 -0.05 L0.27 -0.02 L0.19 0.01 Z" fill="#d9a85b" />
              </>
            )}
          </g>
        )
      })}
    </>
  )
}
