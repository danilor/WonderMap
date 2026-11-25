import { parseDocument, serializeDocument } from '../model/document';
import type { MapDocument } from '../model/types';

/** What the library shows for each saved map. */
export interface MapSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
  thumbnail: string | null;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function call(method: string, path: string, body?: unknown): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the WonderMap server. Is it running?', 0);
  }
  if (!response.ok) {
    let message = `The server answered ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // keep the generic message
    }
    throw new ApiError(message, response.status);
  }
  return response;
}

export async function listMaps(): Promise<MapSummary[]> {
  return (await call('GET', '/maps')).json() as Promise<MapSummary[]>;
}

export async function loadMap(id: string): Promise<MapDocument> {
  return parseDocument(await (await call('GET', `/maps/${encodeURIComponent(id)}`)).json());
}

/** Saves a map. `thumbnail` (a data URL) is optional; the server keeps the previous one when it is left out. */
export async function saveMap(doc: MapDocument, thumbnail?: string): Promise<void> {
  await call('PUT', `/maps/${encodeURIComponent(doc.id)}`, { map: serializeDocument(doc), thumbnail });
}

export async function deleteMap(id: string): Promise<void> {
  await call('DELETE', `/maps/${encodeURIComponent(id)}`);
}
