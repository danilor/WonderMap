/**
 * The example maps the title screen offers: client/public/samples/<slug>.wondermap.json and <slug>.jpg.
 * The first is a hand-painted file; the others are written as code (see devtools/samples/ and `npm run samples`).
 */
export interface ExampleMap {
  /** Names the files samples/<slug>.wondermap.json and samples/<slug>.jpg, and the test id of its card. */
  slug: string;
  name: string;
  /** What the card says under the name. */
  blurb: string;
}

export const exampleMaps: readonly ExampleMap[] = [
  { slug: 'aldoria', name: 'Aldoria', blurb: 'The original sample world: one continent with cities, roads, forests and monsters of the deep.' },
  { slug: 'avatar', name: 'The Four Nations', blurb: 'The world of Avatar: The Last Airbender, from the Fire Nation islands to the poles.' },
  { slug: 'westeros', name: 'Westeros & Essos', blurb: 'The world of Game of Thrones, from the Wall to Valyria and the Free Cities beyond the Narrow Sea.' },
  { slug: 'middle-earth', name: 'Middle-earth', blurb: 'The world of The Lord of the Rings, from the Shire to Mount Doom.' },
];
