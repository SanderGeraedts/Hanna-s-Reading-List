/**
 * The continent of each country on the world map (D-0037), for the travel
 * badges. Natural Earth's continents (where the map's names come from), with
 * North America taking in Central America, the Caribbean and Greenland.
 * Russia, Turkey and Kazakhstan count for Europe and Asia, Egypt for Africa
 * and Asia; Fr. S. Antarctic Lands counts for none. continents.test.ts keeps
 * the list in step with MAP_COUNTRIES.
 */

export type Continent = 'Europe' | 'Asia' | 'Africa' | 'North America' | 'South America' | 'Oceania'

export const CONTINENTS: readonly Continent[] = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania']

const LISTS: Record<Continent, readonly string[]> = {
  Europe: [
    'Albania', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herz.', 'Bulgaria', 'Croatia', 'Czechia',
    'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland',
    'Italy', 'Kazakhstan', 'Kosovo', 'Latvia', 'Lithuania', 'Luxembourg', 'Macedonia', 'Moldova',
    'Montenegro', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania', 'Russia', 'Serbia',
    'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Turkey', 'Ukraine', 'United Kingdom',
  ],
  Asia: [
    'Afghanistan', 'Armenia', 'Azerbaijan', 'Bangladesh', 'Bhutan', 'Brunei', 'Cambodia', 'China',
    'Cyprus', 'Egypt', 'Georgia', 'India', 'Indonesia', 'Iran', 'Iraq', 'Israel', 'Japan', 'Jordan',
    'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon', 'Malaysia', 'Mongolia', 'Myanmar',
    'N. Cyprus', 'Nepal', 'North Korea', 'Oman', 'Pakistan', 'Palestine', 'Philippines', 'Qatar',
    'Russia', 'Saudi Arabia', 'South Korea', 'Sri Lanka', 'Syria', 'Taiwan', 'Tajikistan', 'Thailand',
    'Timor-Leste', 'Turkey', 'Turkmenistan', 'United Arab Emirates', 'Uzbekistan', 'Vietnam', 'Yemen',
  ],
  Africa: [
    'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon',
    'Central African Rep.', 'Chad', 'Congo', "Côte d'Ivoire", 'Dem. Rep. Congo', 'Djibouti', 'Egypt',
    'Eq. Guinea', 'Eritrea', 'eSwatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea',
    'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali',
    'Mauritania', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'S. Sudan',
    'Senegal', 'Sierra Leone', 'Somalia', 'Somaliland', 'South Africa', 'Sudan', 'Tanzania', 'Togo',
    'Tunisia', 'Uganda', 'W. Sahara', 'Zambia', 'Zimbabwe',
  ],
  'North America': [
    'Bahamas', 'Belize', 'Canada', 'Costa Rica', 'Cuba', 'Dominican Rep.', 'El Salvador', 'Greenland',
    'Guatemala', 'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 'Panama', 'Puerto Rico',
    'Trinidad and Tobago', 'United States of America',
  ],
  'South America': [
    'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Falkland Is.', 'Guyana',
    'Paraguay', 'Peru', 'Suriname', 'Uruguay', 'Venezuela',
  ],
  Oceania: ['Australia', 'Fiji', 'New Caledonia', 'New Zealand', 'Papua New Guinea', 'Solomon Is.', 'Vanuatu'],
}

const BY_COUNTRY = new Map<string, Continent[]>()
for (const c of CONTINENTS) for (const country of LISTS[c]) BY_COUNTRY.set(country, [...(BY_COUNTRY.get(country) ?? []), c])

/** The continents a map country (its world-atlas name) lies on: one, two for four big countries, none for an unknown name. */
export const continentsOf = (country: string): Continent[] => BY_COUNTRY.get(country) ?? []
