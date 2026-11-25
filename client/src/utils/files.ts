/** Turns a map name into something safe to use as a file name. */
export function fileSlug(name: string): string {
  return name.trim().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'wondermap';
}

export const PROJECT_EXTENSION = '.wondermap.json';

export function projectFileName(name: string): string {
  return `${fileSlug(name)}${PROJECT_EXTENSION}`;
}

/** Hands a blob to the browser's download bar. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15_000);
}

export function downloadText(text: string, filename: string, mime = 'application/json'): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}
