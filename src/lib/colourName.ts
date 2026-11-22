/**
 * Plain colour names for the spine swatches (T-0019), so a screen reader says
 * "Dark red" instead of a hex code.
 */

function parse(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** One plain name for a colour, e.g. "Dark red", "Light blue", "Grey", "Cream". */
export function colourName(hex: string): string {
  const [r, g, b] = parse(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const chroma = max - min
  const light = (max + min) / 2

  let hue = 0
  if (chroma > 0) {
    if (max === r) hue = ((g - b) / chroma) % 6
    else if (max === g) hue = (b - r) / chroma + 2
    else hue = (r - g) / chroma + 4
    hue *= 60
    if (hue < 0) hue += 360
  }

  // HSL saturation: how much colour there is for its lightness
  const sat = chroma === 0 ? 0 : chroma / (1 - Math.abs(2 * light - 1))
  const warm = hue < 68 || hue >= 340

  const prefix = light < 0.22 ? 'dark ' : light > 0.72 ? 'light ' : ''
  let name: string
  if (light > 0.8 && chroma < 0.25 && hue >= 30 && hue <= 65) name = 'cream'
  else if (chroma < 0.1) {
    if (light < 0.12) name = 'black'
    else if (light > 0.93) name = 'white'
    else name = prefix + 'grey'
  }
  // muted warm colours (dusty brown-red, tan, taupe) are what people call brown (T-0019 review, M1)
  else if (warm && sat < 0.35 && light >= 0.15 && light <= 0.6) name = light < 0.22 ? 'dark brown' : 'brown'
  else if (hue < 15 || hue >= 340) name = prefix + 'red'
  else if (hue < 45) name = light < 0.45 ? (light < 0.15 ? 'dark brown' : 'brown') : prefix + 'orange'
  else if (hue < 68) name = light < 0.3 ? (light < 0.15 ? 'dark brown' : 'brown') : prefix + 'yellow'
  else if (hue < 160) name = prefix + 'green'
  else if (hue < 195) name = prefix + 'teal'
  else if (hue < 255) name = prefix + 'blue'
  else if (hue < 290) name = prefix + 'purple'
  else name = prefix + 'pink'
  return name.charAt(0).toUpperCase() + name.slice(1)
}

/**
 * Names for a row of swatches: no two the same (a later one gets " 2", " 3"),
 * and ", dominant" after the first when `dominantFirst` is set.
 */
export function swatchNames(hexes: string[], dominantFirst: boolean): string[] {
  const seen = new Map<string, number>()
  return hexes.map((hex, i) => {
    const base = colourName(hex)
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    const name = count > 1 ? `${base} ${count}` : base
    return dominantFirst && i === 0 ? `${name}, dominant` : name
  })
}
