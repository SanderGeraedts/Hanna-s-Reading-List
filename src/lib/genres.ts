/**
 * A short list of shelf genres, and how to read them from the subjects Open
 * Library (English) and Storytel (often German) attach to a book. Subjects are
 * noisy, so only the first few clear matches are kept; Hanna can add her own.
 */
export const GENRE_RULES: Array<[string, RegExp]> = [
  ['Fantasy', /fantas|magic|wizard|witch|dragon|fairy|fairies|elves|sorcer|zauber|magie/],
  ['Romance', /romance|love stor|liebes|romantik/],
  ['Science fiction', /science fiction|sci-?fi|space opera|time travel|extraterrestrial/],
  ['Dystopian', /dystop|post-?apocalyp/],
  ['Mystery', /myster|detective|whodunit|detektiv/],
  ['Thriller', /thriller|suspense|spannung/],
  ['Crime', /crime|murder|krimi|verbrechen/],
  ['Horror', /horror|ghost stor|haunted|grusel/],
  ['Mythology', /mytholog|gods and goddesses|götter/],
  ['Historical fiction', /historical fiction|historische? roman|history.*fiction/],
  ['Adventure', /adventure|abenteuer/],
  ['Young adult', /young adult|teen|jugend/],
  ["Children's", /juvenile|children|kinder/],
  ['Classics', /classic|klassiker/],
  ['Humour', /humou?r|comedy|satire|komödie/],
  ['Graphic novel', /graphic novel|comics?\b|manga/],
  ['Poetry', /poetry|poems|gedichte|lyrik/],
  ['Biography', /biograph|memoir|autobiograph|biografie/],
  ['Self-help', /self-help|personal development|ratgeber|persönlichkeitsentwicklung/],
  ['Non-fiction', /non-?fiction|sachbuch/],
]

export const GENRES = GENRE_RULES.map(([name]) => name)

const MAX_GENRES = 3

/** Shelf genres for a list of subjects or categories, most specific first. */
export function genresFromSubjects(subjects: string[]): string[] {
  const text = subjects.map((s) => s.toLowerCase())
  const found: string[] = []
  for (const [name, re] of GENRE_RULES) {
    if (text.some((s) => re.test(s))) found.push(name)
    if (found.length === MAX_GENRES) break
  }
  return found
}

/** Every genre in use on the shelf plus the standard ones, for suggestions. */
export function genreSuggestions(used: Iterable<string>) {
  const all = new Set(GENRES)
  for (const g of used) all.add(g)
  return [...all].sort((a, b) => a.localeCompare(b))
}
