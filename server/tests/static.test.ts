import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';

let root: string;
let dataDir: string;
let clientDist: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'wondermap-static-'));
  dataDir = path.join(root, 'data');
  clientDist = path.join(root, 'dist');
  await mkdir(path.join(clientDist, 'assets'), { recursive: true });
  await writeFile(path.join(clientDist, 'index.html'), '<!doctype html><title>WonderMap</title>');
  await writeFile(path.join(clientDist, 'assets', 'index-abc123.js'), 'console.log(1)');
  await writeFile(path.join(clientDist, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('serving the built client', () => {
  it('serves the app shell and revalidates it, so a new build is picked up', async () => {
    const app = createApp({ dataDir, clientDist });
    for (const url of ['/', '/index.html']) {
      const res = await request(app).get(url);
      expect(res.status).toBe(200);
      expect(res.text).toContain('WonderMap');
      expect(res.headers['cache-control']).toBe('no-cache');
    }
  });

  it('caches hashed build files for good and revalidates the other static files', async () => {
    const app = createApp({ dataDir, clientDist });
    expect((await request(app).get('/assets/index-abc123.js')).headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect((await request(app).get('/favicon.svg')).headers['cache-control']).toBe('no-cache');
  });

  it('answers client-side routes with the app shell, but unknown API calls with JSON', async () => {
    const app = createApp({ dataDir, clientDist });
    const route = await request(app).get('/editor/anything');
    expect(route.status).toBe(200);
    expect(route.text).toContain('WonderMap');
    expect(route.headers['cache-control']).toBe('no-cache');
    const api = await request(app).get('/api/nothing');
    expect(api.status).toBe(404);
    expect(api.body).toEqual({ error: 'Not found' });
  });

  it('serves no client when none is given', async () => {
    expect((await request(createApp({ dataDir })).get('/')).status).toBe(404);
  });
});
