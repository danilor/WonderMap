/**
 * A fingerprint of everything that decides what the pictures in ASSETS.md look like: the illustrations, the engine code that
 * draws them, and the sample scenes of `assetImages.ts`. ASSETS.md records it, so a test notices when they changed and the
 * pictures need to be made again (`npm run assets`).
 */

/** Interactive-only engine modules are left out: they never change a pixel of the pictures. */
const sources = import.meta.glob(
  [
    '../../../illustrations/**/*.ts',
    '../engine/**/*.ts',
    '../model/**/*.ts',
    '../tools/scatter.ts',
    '../utils/backdrop.ts',
    './assetCatalog.ts',
    './assetImages.ts',
    '../../public/samples/aldoria.wondermap.json',
    '!**/*.test.ts',
    '!**/tests/**',
    '!**/node_modules/**',
    '!../engine/{camera,picking,MapRenderer}.ts',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

/** The files the fingerprint covers (paths relative to this file), so a test can tell when a move of code makes the globs miss it. */
export function artSourceFiles(): string[] {
  return Object.keys(sources).sort();
}

/** SHA-256 (hex) of the sources, independent of line endings and of the order the files were found in. */
export async function artHash(): Promise<string> {
  const text = Object.keys(sources)
    .sort()
    .map((key) => `${key}\n${sources[key]!.replace(/\r\n/g, '\n')}\n`)
    .join('\0');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
