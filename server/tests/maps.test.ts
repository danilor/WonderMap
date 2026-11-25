import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';

const ID = 'map_abcdef12';
const thumbnail = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';

const makeMap = (patch: Record<string, unknown> = {}) => ({
  schema: 1,
  id: ID,
  name: 'Aldoria',
  kind: 'world',
  width: 2400,
  height: 1600,
  terrain: { cell: 4, cols: 600, rows: 400, ids: [], data: '' },
  symbols: [],
  paths: [],
  labels: [],
  createdAt: '2025-01-01T00:00:00.000Z',
  ...patch,
});

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), 'wondermap-test-'));
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describe('health', () => {
  it('answers', async () => {
    const res = await request(createApp({ dataDir })).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, name: 'wondermap' });
  });
});

describe('maps API', () => {
  it('starts with an empty library', async () => {
    const res = await request(createApp({ dataDir })).get('/api/maps');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('saves, lists, loads and deletes a map', async () => {
    const app = createApp({ dataDir });

    const saved = await request(app).put(`/api/maps/${ID}`).send({ map: makeMap(), thumbnail });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ id: ID, name: 'Aldoria', width: 2400, height: 1600, thumbnail });

    const list = await request(app).get('/api/maps');
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ id: ID, name: 'Aldoria' });

    const loaded = await request(app).get(`/api/maps/${ID}`);
    expect(loaded.status).toBe(200);
    expect(loaded.body).toEqual(makeMap());

    const removed = await request(app).delete(`/api/maps/${ID}`);
    expect(removed.status).toBe(204);
    expect((await request(app).get(`/api/maps/${ID}`)).status).toBe(404);
    expect((await request(app).get('/api/maps')).body).toEqual([]);
  });

  it('keeps the thumbnail and creation date when a later save has none', async () => {
    const app = createApp({ dataDir });
    const first = await request(app).put(`/api/maps/${ID}`).send({ map: makeMap(), thumbnail });
    const second = await request(app).put(`/api/maps/${ID}`).send({ map: makeMap({ name: 'Renamed' }) });
    expect(second.body.thumbnail).toBe(thumbnail);
    expect(second.body.name).toBe('Renamed');
    expect(second.body.createdAt).toBe(first.body.createdAt);
    expect(second.body.updatedAt >= first.body.updatedAt).toBe(true);
  });

  it('lists the most recently saved map first', async () => {
    const app = createApp({ dataDir });
    await request(app).put('/api/maps/map_00000001').send({ map: makeMap({ id: 'map_00000001', name: 'Old' }) });
    await new Promise((resolve) => setTimeout(resolve, 15));
    await request(app).put('/api/maps/map_00000002').send({ map: makeMap({ id: 'map_00000002', name: 'New' }) });
    const list = await request(app).get('/api/maps');
    expect(list.body.map((m: { name: string }) => m.name)).toEqual(['New', 'Old']);
  });

  it('survives overlapping saves of the same map', async () => {
    const app = createApp({ dataDir });
    const saves = Array.from({ length: 8 }, (_, i) => request(app).put(`/api/maps/${ID}`).send({ map: makeMap({ name: `Version ${i}` }) }));
    const results = await Promise.all(saves);
    expect(results.every((r) => r.status === 200)).toBe(true);
    const loaded = await request(app).get(`/api/maps/${ID}`);
    expect(loaded.status).toBe(200);
    expect(await readdir(path.join(dataDir, 'maps'))).toHaveLength(2);
  });

  it('rejects ids that could escape the data folder', async () => {
    const app = createApp({ dataDir });
    expect((await request(app).get('/api/maps/short')).status).toBe(400);
    expect((await request(app).get('/api/maps/..%2F..%2Fsecret1')).status).toBe(400);
    expect((await request(app).put('/api/maps/bad.id.with.dots').send({ map: makeMap() })).status).toBe(400);
  });

  it('rejects invalid bodies', async () => {
    const app = createApp({ dataDir });
    const put = (body: unknown) => request(app).put(`/api/maps/${ID}`).send(body as object);
    expect((await put({})).status).toBe(400);
    expect((await put({ map: makeMap({ id: 'map_another1' }) })).status).toBe(400);
    expect((await put({ map: makeMap({ name: '' }) })).status).toBe(400);
    expect((await put({ map: makeMap({ width: -5 }) })).status).toBe(400);
    expect((await put({ map: makeMap({ terrain: null }) })).status).toBe(400);
    expect((await put({ map: makeMap(), thumbnail: 'http://evil.example/x.png' })).status).toBe(400);
    const broken = await request(app).put(`/api/maps/${ID}`).set('Content-Type', 'application/json').send('{"map":');
    expect(broken.status).toBe(400);
  });

  it('answers unknown maps and routes with 404', async () => {
    const app = createApp({ dataDir });
    expect((await request(app).get(`/api/maps/${ID}`)).status).toBe(404);
    expect((await request(app).delete(`/api/maps/${ID}`)).status).toBe(404);
    expect((await request(app).get('/api/nothing')).status).toBe(404);
  });
});
