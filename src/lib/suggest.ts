/**
 * Suggestions shown under a field while typing (series, genres), drawn by
 * the app itself because phones show the browser's own list unreliably.
 * Names containing what was typed, ignoring capitals; everything when
 * nothing is typed yet; nothing once the text is one of the names exactly.
 */
export function suggest(options: string[], typed: string, n = 5): string[] {
  const q = typed.trim().toLowerCase()
  if (q && options.some((o) => o.toLowerCase() === q)) return []
  const matches = q ? options.filter((o) => o.toLowerCase().includes(q)) : options
  // names starting with what was typed first
  return [...matches].sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q))).slice(0, n)
}
