import { useSyncExternalStore } from 'react';

/** Tiny hash router: `#/editor/abc?x=1` → `{ path: ['editor','abc'], params }`. No dependency needed for three pages. */
export interface Route {
  path: string[];
  params: URLSearchParams;
  raw: string;
}

let cached: Route | null = null;

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart = '/', query = ''] = raw.split('?');
  return {
    path: pathPart.split('/').filter(Boolean).map(decodeURIComponent),
    params: new URLSearchParams(query),
    raw,
  };
}

function snapshot(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  if (!cached || cached.raw !== raw) cached = parse(window.location.hash);
  return cached;
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function navigate(to: string, replace = false): void {
  const target = to.startsWith('#') ? to : `#${to}`;
  if (replace) {
    window.history.replaceState(null, '', target);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

/** Replace query parameters without adding a history entry. */
export function setParams(route: Route, patch: Record<string, string | null>): void {
  const next = new URLSearchParams(route.params);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === '') next.delete(k);
    else next.set(k, v);
  }
  const qs = next.toString();
  navigate(`/${route.path.map(encodeURIComponent).join('/')}${qs ? `?${qs}` : ''}`, true);
}
