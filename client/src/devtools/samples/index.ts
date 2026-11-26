import { documentToJson } from '../../model/document';
import type { MapDocument } from '../../model/types';
import type { BuildResult } from './MapBuilder';
import { buildAvatar } from './maps/avatar';
import { buildMiddleEarth } from './maps/middleEarth';
import { buildWesteros } from './maps/westeros';

/** The example maps that are made by code. Each `slug` is also in pages/home/examples.ts, which is what the title screen shows. */
export interface SampleGenerator {
  slug: string;
  build: () => BuildResult;
}

export const sampleGenerators: readonly SampleGenerator[] = [
  { slug: 'avatar', build: buildAvatar },
  { slug: 'westeros', build: buildWesteros },
  { slug: 'middle-earth', build: buildMiddleEarth },
];

export interface GeneratedSample {
  doc: MapDocument;
  /** The text of the .wondermap.json file. */
  json: string;
  warnings: string[];
}

export function generateSample(slug: string): GeneratedSample {
  const generator = sampleGenerators.find((g) => g.slug === slug);
  if (!generator) throw new Error(`There is no generated sample "${slug}".`);
  const { doc, warnings } = generator.build();
  return { doc, json: documentToJson(doc), warnings };
}
