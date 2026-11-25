import { expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

/** The parts of a saved map (the server's JSON) that the tests look at. */
export interface StoredMap {
  id: string;
  name: string;
  width: number;
  height: number;
  themeId: string;
  symbols: Array<{ id: string; asset: string; x: number; y: number }>;
  labels: Array<{ id: string; text: string; style: string; curve: number }>;
  paths: Array<{ id: string; style: string; points: number[][] }>;
  terrain: { ids: string[]; rle: string };
}

/** The maps on the server. Everything a test creates is deleted again when the test is over. */
export class Library {
  private readonly created = new Set<string>();
  private readonly request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  track(id: string): string {
    this.created.add(id);
    return id;
  }

  async get(id: string): Promise<StoredMap> {
    const response = await this.request.get(`/api/maps/${id}`);
    expect(response.ok(), `GET /api/maps/${id}`).toBe(true);
    return (await response.json()) as StoredMap;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.request.get(`/api/maps/${id}`)).ok();
  }

  /** Waits for the autosave to deliver a map that satisfies `until`, and returns it. */
  async saved(id: string, until: (map: StoredMap) => boolean = () => true): Promise<StoredMap> {
    let latest: StoredMap | undefined;
    await expect
      .poll(
        async () => {
          latest = await this.get(id);
          return until(latest);
        },
        { timeout: 20_000, message: 'the autosave should reach the server' },
      )
      .toBe(true);
    return latest!;
  }

  async cleanup(): Promise<void> {
    for (const id of this.created) await this.request.delete(`/api/maps/${id}`);
  }
}
