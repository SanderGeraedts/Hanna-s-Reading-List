import { speciesById } from './species'
import type { Species } from './species'
import { STAGE_WORD } from './creature'
import type { Pet } from './creature'
import { albumLabel } from './words'
import type { ShareSpec, ShareTile } from '../shareImage'
import { creatureStill } from '#/components/creatures/stillPaths'

/**
 * Share pictures for the book creatures (T-0032 Design §9). Reuses
 * `renderShareImage(spec)` / `shareChallenge(spec)` from `shareImage.ts`.
 */

/** A single-tile "poster" layout with the pet's still and the pet card's text. */
export function petCardShare(pet: Pet): ShareSpec {
  const sp = speciesById(pet.species)
  return {
    title: `${pet.name} says hi!`,
    subtitle: `Level ${pet.level} · ${STAGE_WORD[pet.stage]} · ${albumLabel(sp)}`,
    columns: 1,
    aspect: 1.4,
    tiles: [
      {
        label: pet.name,
        caption: `Level ${pet.level} · ${STAGE_WORD[pet.stage]}`,
        cover: creatureStill(pet.species, pet.stage, pet.shiny),
        on: true,
        color: sp.palette.body ?? '#3a2e26',
      },
    ],
  }
}

/** Every species in one grid; silhouette for species she hasn't found. */
export function albumShare(
  species: readonly Species[],
  found: ReadonlySet<string>,
  shinyFound: ReadonlySet<string>,
  phone = false,
): ShareSpec {
  const tiles: ShareTile[] = species.map((s) => ({
    label: s.name,
    cover: creatureStill(s.id, 'grown'),
    on: found.has(s.id),
    color: s.palette.body,
  }))
  return {
    title: 'My book creatures',
    subtitle: `${found.size} of ${species.length} found · ${shinyFound.size} shiny ✨`,
    columns: phone ? 3 : 5,
    aspect: 1,
    tiles,
  }
}
