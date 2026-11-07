// words that mark an edition note rather than part of the title
const EDITION_NOTE =
  /edition|recording|adaptation|abridged|anniversary|dramati[sz]ed|version|full[- ]cast|tie-in|illustrated|deluxe|collector|audiobook|ungekürzt|gekürzt|hörbuch|hörspiel|ausgabe|lesung|jubiläum|luisterboek/i

/**
 * The title without trailing edition notes, e.g.
 * "Six of Crows (10th Anniversary Recording)" → "Six of Crows",
 * "Alcatraz Versus the Dark Talent [Dramatized Adaptation]" → "Alcatraz Versus the Dark Talent".
 * Returns null when there's nothing to tidy.
 */
export function tidyTitle(title: string): string | null {
  let t = title.trim()
  let changed = false
  for (;;) {
    const bracket = t.match(/\s*[([]([^()[\]]*)[)\]]\s*$/)
    if (bracket && EDITION_NOTE.test(bracket[1])) {
      t = t.slice(0, bracket.index).trim()
      changed = true
      continue
    }
    // "Title - 10th Anniversary Edition", "Titel - Die ungekürzte Lesung: Band 2 der …"
    // (cut from the first such note: Storytel often adds a marketing line after it)
    const parts = t.split(/\s+[-–—]\s+/)
    const note = parts.findIndex((p, i) => i > 0 && EDITION_NOTE.test(p))
    if (note > 0) {
      t = parts.slice(0, note).join(' - ').trim()
      changed = true
      continue
    }
    break
  }
  return changed && t ? t : null
}

/**
 * Ways to search for a title: the tidied whole, and its parts around a colon
 * or dash ("Die Kane-Chroniken 1: Die rote Pyramide" → "Die rote Pyramide").
 */
export function titleQueries(title: string) {
  const base = (tidyTitle(title) ?? title).replace(/\s*[([][^)\]]*[)\]]/g, '').trim()
  const parts = base.split(/\s*:\s*|\s+[-–—]\s+|,\s*(?:teil|band|part|book|deel)\s*\d+\s*/i).map((p) => p.trim())
  return [...new Set([base, ...parts.filter((p) => p.length > 3)])]
}
