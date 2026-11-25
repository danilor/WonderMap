/** Request validation. The server treats map documents as opaque JSON; it only checks what it needs to store them safely. */

/** Ids become file names, so they must never contain path separators or dots. */
export const ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

export const isValidId = (id: unknown): id is string => typeof id === 'string' && ID_PATTERN.test(id);

export interface SavePayload {
  map: Record<string, unknown> & { id: string; name: string; width: number; height: number };
  thumbnail: string | null;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const MAX_THUMBNAIL_CHARS = 600_000;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isSize = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 100_000;

/** Checks the body of `PUT /api/maps/:id`: `{ map, thumbnail? }`. */
export function parseSavePayload(body: unknown, id: string): Parsed<SavePayload> {
  if (!isObject(body)) return { ok: false, error: 'Body must be a JSON object' };
  const { map, thumbnail } = body;
  if (!isObject(map)) return { ok: false, error: '"map" must be an object' };
  if (map.id !== id) return { ok: false, error: '"map.id" must match the URL' };
  if (typeof map.schema !== 'number') return { ok: false, error: '"map.schema" must be a number' };
  if (typeof map.name !== 'string' || !map.name.trim() || map.name.length > 120) return { ok: false, error: '"map.name" must be 1-120 characters' };
  if (!isSize(map.width) || !isSize(map.height)) return { ok: false, error: '"map.width" and "map.height" must be positive numbers' };
  if (!isObject(map.terrain)) return { ok: false, error: '"map.terrain" must be an object' };
  if (thumbnail !== undefined && thumbnail !== null) {
    if (typeof thumbnail !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(thumbnail) || thumbnail.length > MAX_THUMBNAIL_CHARS) {
      return { ok: false, error: '"thumbnail" must be a base64 image data URL' };
    }
  }
  return {
    ok: true,
    value: { map: map as SavePayload['map'], thumbnail: typeof thumbnail === 'string' ? thumbnail : null },
  };
}
