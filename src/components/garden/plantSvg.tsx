import type { Plant } from '#/lib/garden/garden'
import type { PlantKind } from '#/lib/garden/plants'
import type { Season } from '#/lib/garden/seasons'
import { plantHeight } from '#/lib/garden/view'

/**
 * A plant in the flat drawn garden (T-0061 §3, D-0051 §2): four shapes — tree,
 * shrub, flower and fern — drawn from the kind's own colours, with the season
 * on top (blossom, green, gold, bare and snow) and a sprout for a plant that
 * has only just appeared. Plain SVG: no WebGL, no textures, no gradients that
 * a phone would have to blend.
 *
 * Everything is drawn in garden units with the plant's foot at (0, 0) and the
 * plant growing upwards (negative y), so the caller only has to move it to its
 * spot.
 */

/** The leaf colour for a season; winter leaves nothing on a plant that loses them. */
export function leafColour(kind: PlantKind, season: Season): string | null {
  if (season === 'autumn' && !kind.evergreen) return kind.autumnLeaf
  if (season === 'winter' && !kind.evergreen) return null
  return kind.leaf
}

const round = (n: number) => Math.round(n * 1000) / 1000

export interface PlantShapeProps {
  plant: Plant
  season: Season
  /** a smaller drawing for the dashboard block: no blossom dots, no berries */
  compact?: boolean
}

export function PlantShape({ plant, season, compact }: PlantShapeProps) {
  const { kind } = plant
  const h = plantHeight(kind.height, plant.scale)
  if (plant.stage === 'sprout') return <Sprout kind={kind} h={h} night={plant.night} />
  const leaf = leafColour(kind, season)
  const flowers = plant.blooming
  const flowerColour = plant.night ? '#f3f1ff' : kind.flower
  const parts: React.ReactNode[] = []
  switch (kind.family) {
    case 'tree':
      parts.push(<Tree key="t" kind={kind} h={h} leaf={leaf} season={season} flowers={flowers} flowerColour={flowerColour} compact={compact} />)
      break
    case 'shrub':
      parts.push(<Shrub key="s" kind={kind} h={h} leaf={leaf} season={season} flowers={flowers} flowerColour={flowerColour} compact={compact} />)
      break
    case 'flower':
      parts.push(<Flower key="f" kind={kind} h={h} leaf={leaf} flowers={flowers} flowerColour={flowerColour} />)
      break
    case 'fern':
      parts.push(<Fern key="n" kind={kind} h={h} leaf={leaf ?? kind.leaf} />)
      break
  }
  return (
    <>
      {plant.night && flowers && <circle cx={0} cy={round(-h * 0.7)} r={round(h * 0.45)} fill="#eae6ff" opacity={0.18} />}
      {parts}
      {season === 'winter' && <ellipse cx={0} cy={-0.02} rx={round(0.3 + h * 0.08)} ry={0.1} fill="#f2f4fb" opacity={0.75} />}
    </>
  )
}

function Sprout({ kind, h, night }: { kind: PlantKind; h: number; night: boolean }) {
  const top = round(-Math.max(0.16, h))
  return (
    <>
      <path d={`M0 0 L0 ${top}`} stroke={kind.stem} strokeWidth={0.05} strokeLinecap="round" fill="none" />
      <ellipse cx={round(-0.09)} cy={round(top * 0.8)} rx={0.1} ry={0.055} fill={night ? '#cfe6d6' : kind.leaf} transform={`rotate(-25 ${-0.09} ${round(top * 0.8)})`} />
      <ellipse cx={round(0.09)} cy={round(top * 0.95)} rx={0.1} ry={0.055} fill={night ? '#cfe6d6' : kind.leaf} transform={`rotate(25 ${0.09} ${round(top * 0.95)})`} />
    </>
  )
}

interface ShapeProps {
  kind: PlantKind
  h: number
  leaf: string | null
  season: Season
  flowers: boolean
  flowerColour: string
  compact?: boolean
}

function Tree({ kind, h, leaf, season, flowers, flowerColour, compact }: ShapeProps) {
  const trunkH = h * (kind.id === 'pine' ? 0.25 : 0.42)
  const crownY = -trunkH
  const crownH = h - trunkH
  const w = Math.max(0.22, Math.min(1.05, crownH * 0.72))
  return (
    <>
      <path
        d={`M${round(-0.05 - h * 0.02)} 0 L${round(-0.03)} ${round(crownY)} L${round(0.03)} ${round(crownY)} L${round(0.05 + h * 0.02)} 0 Z`}
        fill={kind.stem}
      />
      {leaf === null ? (
        // winter: bare branches
        <>
          <path d={`M0 ${round(crownY)} L${round(-w * 0.5)} ${round(crownY - crownH * 0.55)}`} stroke={kind.stem} strokeWidth={0.035} strokeLinecap="round" />
          <path d={`M0 ${round(crownY)} L${round(w * 0.5)} ${round(crownY - crownH * 0.6)}`} stroke={kind.stem} strokeWidth={0.035} strokeLinecap="round" />
          <path d={`M0 ${round(crownY)} L0 ${round(crownY - crownH * 0.85)}`} stroke={kind.stem} strokeWidth={0.035} strokeLinecap="round" />
        </>
      ) : kind.id === 'pine' ? (
        [0, 1, 2].map((i) => {
          const base = crownY - (crownH * i) / 3
          const spread = w * (1 - i * 0.22)
          return (
            <path
              key={i}
              d={`M${round(-spread / 2)} ${round(base)} L0 ${round(base - crownH * 0.52)} L${round(spread / 2)} ${round(base)} Z`}
              fill={leaf}
            />
          )
        })
      ) : kind.id === 'birch' ? (
        <ellipse cx={0} cy={round(crownY - crownH * 0.52)} rx={round(w * 0.42)} ry={round(crownH * 0.55)} fill={leaf} />
      ) : (
        // the two side blobs reach down to the top of the trunk, so the crown
        // sits on the tree instead of hovering over a gap
        [
          { x: 0, y: crownY - crownH * 0.62, r: w * 0.5 },
          { x: -w * 0.33, y: crownY - crownH * 0.3, r: w * 0.38 },
          { x: w * 0.33, y: crownY - crownH * 0.32, r: w * 0.38 },
        ].map((c, i) => <circle key={i} cx={round(c.x)} cy={round(c.y)} r={round(c.r)} fill={leaf} />)
      )}
      {!compact && leaf !== null && flowers && season === 'spring' && (
        <>
          {[-0.3, 0.1, 0.35].map((x, i) => (
            <circle key={i} cx={round(x * w)} cy={round(crownY - crownH * (0.35 + i * 0.22))} r={round(0.055 + h * 0.01)} fill={flowerColour} />
          ))}
        </>
      )}
      {!compact && kind.berries && (season === 'winter' || season === 'autumn') && (
        <>
          {[-0.25, 0.2].map((x, i) => (
            <circle key={i} cx={round(x * w)} cy={round(crownY - crownH * (0.45 + i * 0.25))} r={0.05} fill="#c0493f" />
          ))}
        </>
      )}
    </>
  )
}

function Shrub({ kind, h: full, leaf, season, flowers, flowerColour, compact }: ShapeProps) {
  // bare in winter: a smaller tangle of twigs, never a big brown blob
  const h = leaf === null ? full * 0.7 : full
  const w = Math.max(0.26, Math.min(0.95, h * 0.8))
  const body = leaf ?? '#6a5747'
  return (
    <>
      <path d={`M0 0 L0 ${round(-h * 0.35)}`} stroke={kind.stem} strokeWidth={0.05} strokeLinecap="round" />
      <ellipse cx={0} cy={round(-h * 0.58)} rx={round(w * 0.5)} ry={round(h * 0.42)} fill={body} />
      {leaf !== null &&
        [-0.34, 0, 0.34].map((x, i) => (
          <circle key={i} cx={round(x * w)} cy={round(-h * (0.72 + (i % 2) * 0.12))} r={round(w * 0.2)} fill={body} />
        ))}
      {kind.thorns && (
        <>
          {[-0.45, 0.45].map((x, i) => (
            <path key={i} d={`M${round(x * w)} ${round(-h * 0.6)} l${round(x * 0.1)} ${round(-0.07)}`} stroke={kind.stem} strokeWidth={0.03} strokeLinecap="round" />
          ))}
        </>
      )}
      {!compact && flowers && (
        <>
          {[-0.28, 0.05, 0.3].map((x, i) => (
            <circle key={i} cx={round(x * w)} cy={round(-h * (0.55 + i * 0.16))} r={round(0.06 + h * 0.015)} fill={flowerColour} />
          ))}
        </>
      )}
      {!compact && kind.berries && season !== 'spring' && (
        <>
          {[-0.2, 0.25].map((x, i) => (
            <circle key={i} cx={round(x * w)} cy={round(-h * (0.5 + i * 0.2))} r={0.045} fill="#c0493f" />
          ))}
        </>
      )}
    </>
  )
}

function Flower({ kind, h, leaf, flowers, flowerColour }: Omit<ShapeProps, 'season' | 'compact'>) {
  const stem = leaf ?? kind.stem
  const head = -h
  const petal = Math.max(0.07, h * 0.17)
  return (
    <>
      <path d={`M0 0 Q${round(h * 0.06)} ${round(head * 0.5)} 0 ${round(head)}`} stroke={stem} strokeWidth={0.04} fill="none" strokeLinecap="round" />
      <ellipse cx={round(-0.1)} cy={round(head * 0.45)} rx={0.09} ry={0.05} fill={kind.leaf} transform={`rotate(-20 ${-0.1} ${round(head * 0.45)})`} />
      {kind.id === 'lavender' || kind.id === 'snowdrop' ? (
        [0, 1, 2, 3].map((i) => (
          <circle key={i} cx={round(((i % 2) - 0.5) * 0.07)} cy={round(head + i * petal * 0.5)} r={round(petal * 0.42)} fill={flowers ? flowerColour : kind.leaf} />
        ))
      ) : (
        <>
          {flowers &&
            [0, 1, 2, 3, 4].map((i) => {
              const a = (i / 5) * Math.PI * 2
              return (
                <ellipse
                  key={i}
                  cx={round(Math.cos(a) * petal * 0.75)}
                  cy={round(head + Math.sin(a) * petal * 0.75)}
                  rx={round(petal * 0.55)}
                  ry={round(petal * 0.42)}
                  fill={flowerColour}
                  transform={`rotate(${Math.round((a * 180) / Math.PI)} ${round(Math.cos(a) * petal * 0.75)} ${round(head + Math.sin(a) * petal * 0.75)})`}
                />
              )
            })}
          <circle cx={0} cy={round(head)} r={round(petal * 0.38)} fill={flowers ? (kind.id === 'sunflower' ? '#7a5a2e' : '#d9a85b') : kind.leaf} />
        </>
      )}
    </>
  )
}

function Fern({ kind, h, leaf }: { kind: PlantKind; h: number; leaf: string }) {
  const w = Math.max(0.24, h * 1.1)
  return (
    <>
      {[-1, -0.45, 0.2, 0.8].map((t, i) => (
        <path
          key={i}
          d={`M0 0 Q${round((t * w) / 2)} ${round(-h * 0.75)} ${round(t * w * 0.6)} ${round(-h * (0.55 + (i % 2) * 0.2))}`}
          stroke={leaf}
          strokeWidth={round(0.05 + h * 0.03)}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      <circle cx={0} cy={round(-0.04)} r={round(0.06 + h * 0.02)} fill={kind.stem} />
    </>
  )
}
