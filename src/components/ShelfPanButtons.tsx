import type { PanDirection, PanEdges } from '#/lib/shelfPan'
import { SHELF_CONTROLS_ATTR } from '#/lib/shelfPan'

/**
 * The round ‹ › buttons at the shelf's left and right edges while it is zoomed in (T-0025,
 * D-0032). Not rendered when the shelf can't move; at an end the button on that side is
 * `aria-disabled` (not `disabled`), so it keeps keyboard focus and stays in place.
 */
export function ShelfPanButtons({ pan, onStep }: { pan: PanEdges | null; onStep: (direction: PanDirection) => void }) {
  if (!pan?.canPan) return null
  const button = (direction: PanDirection, off: boolean, side: string, glyph: string, label: string, key: string) => (
    <button
      type="button"
      className={`btn shelf-pan-${side}`}
      aria-label={label}
      title={`${label} (${key} key)`}
      aria-disabled={off || undefined}
      onClick={() => {
        if (!off) onStep(direction)
      }}
    >
      {glyph}
    </button>
  )
  return (
    <div className="shelf-pan" role="group" aria-label="Move along the shelf" {...{ [SHELF_CONTROLS_ATTR]: '' }}>
      {button(-1, pan.atStart, 'left', '‹', 'Show books to the left', '←')}
      {button(1, pan.atEnd, 'right', '›', 'Show books to the right', '→')}
    </div>
  )
}
