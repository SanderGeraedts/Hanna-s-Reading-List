/** "Open ›" in a dashboard block's header: the same thing, bigger, on its own page. */
export function OpenLink({ onOpen, label }: { onOpen?: () => void; label: string }) {
  if (!onOpen) return null
  return (
    <button type="button" className="btn small quiet open-link" aria-label={`Open ${label}`} onClick={onOpen}>
      Open ›
    </button>
  )
}
