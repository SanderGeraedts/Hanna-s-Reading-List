/**
 * Names to pick from under a field while typing (genres, series, tropes).
 * Tapping one keeps the field focused (pointerdown is cancelled), so the
 * half-typed text isn't saved first.
 */
export function Suggestions({ names, onPick }: { names: string[]; onPick: (name: string) => void }) {
  if (!names.length) return null
  return (
    <div className="chips suggestions" role="listbox" aria-label="Suggestions">
      {names.map((n) => (
        <button
          key={n}
          type="button"
          role="option"
          aria-selected={false}
          className="btn small"
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
