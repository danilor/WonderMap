import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/medievalsharp/400.css';
import '@fontsource/uncial-antiqua/400.css';
import '@fontsource/almendra/400.css';
import '@fontsource/almendra/700.css';
import '@fontsource/almendra/400-italic.css';
import '@fontsource/pirata-one/400.css';
import '@fontsource/metamorphous/400.css';
import { defineFont } from '../kit/define';

/**
 * Fonts available to map labels. To add one: `npm i -w illustrations @fontsource/<name>`,
 * import the weights you need above and register it here (the CSS family name comes from the package docs).
 */
export const fonts = [
  defineFont({ id: 'cinzel', name: 'Cinzel', family: 'Cinzel', weights: [400, 700], styles: ['normal'] }),
  defineFont({ id: 'fell', name: 'IM Fell English', family: 'IM Fell English', weights: [400], styles: ['normal', 'italic'] }),
  defineFont({ id: 'almendra', name: 'Almendra', family: 'Almendra', weights: [400, 700], styles: ['normal', 'italic'] }),
  defineFont({ id: 'medieval', name: 'MedievalSharp', family: 'MedievalSharp', weights: [400], styles: ['normal'] }),
  defineFont({ id: 'uncial', name: 'Uncial Antiqua', family: 'Uncial Antiqua', weights: [400], styles: ['normal'] }),
  defineFont({ id: 'pirata', name: 'Pirata One', family: 'Pirata One', weights: [400], styles: ['normal'] }),
  defineFont({ id: 'metamorphous', name: 'Metamorphous', family: 'Metamorphous', weights: [400], styles: ['normal'] }),
] as const;

export const fontById = new Map<string, (typeof fonts)[number]>(fonts.map((f) => [f.id, f]));

/** CSS `font` shorthand for a font id (falls back to a serif stack). */
export function fontCss(id: string, size: number, weight = 400, italic = false): string {
  const f = fontById.get(id);
  const family = f ? `"${f.family}", ` : '';
  return `${italic ? 'italic ' : ''}${weight} ${size}px ${family}Georgia, "Times New Roman", serif`;
}

/** Resolves once every registered face is ready for canvas text (call before measuring/drawing labels or exporting). */
export async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const jobs: Promise<unknown>[] = [];
  for (const f of fonts) {
    for (const style of f.styles) {
      for (const weight of f.weights) {
        jobs.push(document.fonts.load(`${style === 'italic' ? 'italic ' : ''}${weight} 16px "${f.family}"`).catch(() => []));
      }
    }
  }
  await Promise.all(jobs);
}
