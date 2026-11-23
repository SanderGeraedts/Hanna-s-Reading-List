import type { CompareLine } from '#/lib/yearCompare'

/**
 * The compare year's value beside a number on the Stats page (T-0080,
 * D-0060): "↑ 12 vs 2025". The arrow is decoration, so a screen reader hears
 * the sentence instead ("12 more than in 2025"). Up is gold, down is quiet
 * grey and never red: reading less than last year is not a failure.
 */
export function CompareNote({ line, big = false }: { line: CompareLine; big?: boolean }) {
  return (
    <span className={`compare-note ${line.kind}${big ? ' big' : ''}`}>
      <span aria-hidden>{line.text}</span>
      <span className="visually-hidden">{line.spoken}</span>
    </span>
  )
}
