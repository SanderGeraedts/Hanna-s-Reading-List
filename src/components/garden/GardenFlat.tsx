import { Fragment } from 'react'
import type { Visitors, YearGarden } from '#/lib/garden/garden'
import type { GardenItemId } from '#/lib/garden/numbers'
import { ITEM_SLOTS } from '#/lib/garden/numbers'
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

export interface GardenFlatProps {
  year: YearGarden
  season: Season
  /** beds across; the phone's garden is one bed wide */
  columns?: number
  /** the dashboard block's smaller drawing: one bed, no visitors */
  compact?: boolean
  /** nothing moves */
  reduce?: boolean
  /** the plant she has picked up, drawn lifted */
  picked?: string | null
}

export function GardenFlat({ year, season, columns = 1, compact, reduce, picked }: GardenFlatProps) {
  const beds = compact ? Math.min(2, year.beds) : year.beds
  const layout = gardenLayout(beds, compact ? 2 : columns, !compact)
  const ground = GROUND[season]
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
          const at = slotPoint(layout, slot, ITEM_SLOTS)
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
            <ellipse cx={0} cy={0} rx={0.22} ry={0.09} fill="#000" opacity={0.18} />
            <PlantShape plant={p} season={season} compact={compact} />
          </g>
        )
      })}
      {!compact && <VisitorMarks visitors={year.visitors} layout={{ width: layout.width, depth: layout.depth }} reduce={reduce} />}
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
