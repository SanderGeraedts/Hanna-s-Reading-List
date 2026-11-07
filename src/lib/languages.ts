/** Book languages, stored as two-letter ISO 639-1 codes ("en", "de", …). */

export const LANGUAGE_CHOICES = ['en', 'de', 'nl', 'fr', 'es', 'it', 'sv', 'da', 'no', 'fi', 'pl', 'pt']

const englishNames = typeof Intl !== 'undefined' ? new Intl.DisplayNames(['en'], { type: 'language' }) : null

/** "German" for "de". Unknown codes come back as they are. */
export function languageName(code: string) {
  try {
    return englishNames?.of(code) ?? code
  } catch {
    return code
  }
}

/** The language's own name ("Deutsch"), so a search in either works. */
export function nativeLanguageName(code: string) {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code
  } catch {
    return code
  }
}

// Open Library and some Storytel data use three-letter (MARC / ISO 639-2) codes
const THREE_TO_TWO: Record<string, string> = {
  eng: 'en',
  ger: 'de',
  deu: 'de',
  dut: 'nl',
  nld: 'nl',
  fre: 'fr',
  fra: 'fr',
  spa: 'es',
  ita: 'it',
  swe: 'sv',
  dan: 'da',
  nor: 'no',
  nob: 'no',
  fin: 'fi',
  pol: 'pl',
  por: 'pt',
}

/** "de", "de-DE", "ger", "deu", "/languages/ger" → "de". */
export function toLanguageCode(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const s = raw.trim().toLowerCase().replace(/^\/languages\//, '')
  if (/^[a-z]{2}([-_][a-z0-9]+)?$/.test(s)) return s.slice(0, 2)
  return THREE_TO_TWO[s]
}

const STOPWORDS: Record<string, string[]> = {
  en: ['the', 'of', 'and', 'a', 'an', 'in', 'to', 'with', 'for', 'on', 'my', 'your', 'book', 'part', 'is', 'from'],
  de: ['der', 'die', 'das', 'und', 'ein', 'eine', 'des', 'dem', 'den', 'im', 'von', 'zu', 'mit', 'ist', 'auf', 'für', 'über', 'teil', 'band', 'aus', 'nicht', 'ich'],
  nl: ['het', 'een', 'van', 'en', 'voor', 'op', 'met', 'deel', 'niet', 'ik', 'zijn', 'naar', 'uit', 'bij'],
}

/**
 * A rough guess from a title: counts common short words (and German
 * letters). Returns nothing unless one language clearly wins.
 */
export function guessLanguage(text: string): string | undefined {
  const words = text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean)
  const score: Record<string, number> = { en: 0, de: 0, nl: 0 }
  for (const w of words) for (const [lang, list] of Object.entries(STOPWORDS)) if (list.includes(w)) score[lang]++
  if (/[äöüß]/.test(text.toLowerCase())) score.de += 2
  if (/\bij|\bhet\b/.test(text.toLowerCase())) score.nl += 1
  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1])
  return ranked[0][1] > 0 && ranked[0][1] > ranked[1][1] ? ranked[0][0] : undefined
}
