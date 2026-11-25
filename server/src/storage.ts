import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isValidId } from './validation.ts';
import type { SavePayload } from './validation.ts';

/** What the library page needs to show a map without loading it. */
export interface MapMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  thumbnail: string | null;
}

/**
 * Maps live in `<dataDir>/maps/<id>.json` with a small `<id>.meta.json` next to it for the library list.
 * Files are written to a temporary name first and renamed, so a crash never leaves a half-written map.
 */
export class MapStorage {
  readonly dir: string;
  private readonly locks = new Map<string, Promise<unknown>>();

  constructor(dataDir: string) {
    this.dir = path.join(dataDir, 'maps');
  }

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  private file(id: string, kind: 'map' | 'meta'): string {
    if (!isValidId(id)) throw new Error(`Invalid map id "${id}"`);
    return path.join(this.dir, kind === 'map' ? `${id}.json` : `${id}.meta.json`);
  }

  /** Runs `job` after earlier jobs for the same map have finished (autosaves can overlap). */
  private exclusive<T>(id: string, job: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(id) ?? Promise.resolve();
    const next = previous.then(job, job);
    const tail = next.catch(() => undefined);
    this.locks.set(id, tail);
    void tail.then(() => {
      if (this.locks.get(id) === tail) this.locks.delete(id);
    });
    return next;
  }

  async list(): Promise<MapMeta[]> {
    await this.init();
    const names = await readdir(this.dir);
    const metas: MapMeta[] = [];
    for (const name of names) {
      if (!name.endsWith('.meta.json')) continue;
      try {
        const meta = JSON.parse(await readFile(path.join(this.dir, name), 'utf8')) as MapMeta;
        if (isValidId(meta.id)) metas.push(meta);
      } catch {
        // A damaged meta file only hides that map from the list; the map file itself is untouched.
      }
    }
    return metas.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** The stored map exactly as it was saved, or `null`. */
  async read(id: string): Promise<string | null> {
    try {
      return await readFile(this.file(id, 'map'), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async write(id: string, payload: SavePayload): Promise<MapMeta> {
    return this.exclusive(id, async () => {
      await this.init();
      const { map, thumbnail } = payload;
      const now = new Date().toISOString();
      const previous = await this.readMeta(id);
      const meta: MapMeta = {
        id,
        name: map.name.trim(),
        width: map.width,
        height: map.height,
        createdAt: previous?.createdAt ?? (typeof map.createdAt === 'string' ? map.createdAt : now),
        updatedAt: now,
        thumbnail: thumbnail ?? previous?.thumbnail ?? null,
      };
      await this.atomicWrite(this.file(id, 'map'), JSON.stringify(map));
      await this.atomicWrite(this.file(id, 'meta'), JSON.stringify(meta));
      return meta;
    });
  }

  async remove(id: string): Promise<boolean> {
    return this.exclusive(id, async () => {
      const existed = (await this.read(id)) !== null;
      await rm(this.file(id, 'map'), { force: true });
      await rm(this.file(id, 'meta'), { force: true });
      return existed;
    });
  }

  private async readMeta(id: string): Promise<MapMeta | null> {
    try {
      return JSON.parse(await readFile(this.file(id, 'meta'), 'utf8')) as MapMeta;
    } catch {
      return null;
    }
  }

  private async atomicWrite(target: string, content: string): Promise<void> {
    const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temp, content, 'utf8');
    try {
      await rename(temp, target);
    } catch (error) {
      await rm(temp, { force: true });
      throw error;
    }
  }
}
