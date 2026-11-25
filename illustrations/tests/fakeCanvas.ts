import { setCanvasFactory } from '../kit';

/**
 * A recording stand-in for `CanvasRenderingContext2D`, so art can be exercised in Node (no browser, no DOM).
 *
 * It draws nothing. Instead it
 *  - throws on the arguments a real browser rejects (negative radii, bad gradient stops, empty image data…),
 *  - collects arguments a browser silently ignores but that always mean a bug (NaN, Infinity, "rgba(NaN, …)"),
 *  - counts paint calls (a symbol that never paints is blank) and hashes the whole call log, so a test can prove
 *    that the same seed always produces the same drawing.
 */

export interface Probe {
  /** Every call and property write. */
  calls: number;
  /** Calls that put pixels on the canvas (fill, stroke, drawImage…). */
  paints: number;
  /** Human-readable descriptions of NaN / Infinity / broken color arguments. */
  problems: string[];
  /** FNV-1a hash of the full call log. */
  hash: number;
}

const METHODS = new Set([
  'arc',
  'arcTo',
  'beginPath',
  'bezierCurveTo',
  'clearRect',
  'clip',
  'closePath',
  'createConicGradient',
  'createImageData',
  'createLinearGradient',
  'createPattern',
  'createRadialGradient',
  'drawImage',
  'ellipse',
  'fill',
  'fillRect',
  'fillText',
  'getImageData',
  'getLineDash',
  'getTransform',
  'isPointInPath',
  'isPointInStroke',
  'lineTo',
  'measureText',
  'moveTo',
  'putImageData',
  'quadraticCurveTo',
  'rect',
  'reset',
  'resetTransform',
  'restore',
  'roundRect',
  'rotate',
  'save',
  'scale',
  'setLineDash',
  'setTransform',
  'stroke',
  'strokeRect',
  'strokeText',
  'transform',
  'translate',
]);

const PAINTS = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'drawImage', 'putImageData']);
const COLOR_PROPS = new Set(['fillStyle', 'strokeStyle', 'shadowColor']);
const BROKEN_COLOR = /NaN|undefined|Infinity|null|\[object/;

/** Which argument positions must not be negative (browsers throw `IndexSizeError`). */
const RADII: Record<string, readonly number[]> = { arc: [2], arcTo: [4], ellipse: [2, 3], createRadialGradient: [2, 5] };

let probe: Probe = freshProbe();

function freshProbe(): Probe {
  return { calls: 0, paints: 0, problems: [], hash: 0x811c9dc5 };
}

function mix(text: string): void {
  let h = probe.hash;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  probe.hash = h >>> 0;
}

const hasNonFinite = (value: unknown): boolean =>
  typeof value === 'number' ? !Number.isFinite(value) : Array.isArray(value) ? value.some(hasNonFinite) : false;

const show = (value: unknown): string =>
  typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' ? String(value) : Array.isArray(value) ? `[${value.map(show)}]` : typeof value;

function record(name: string, args: readonly unknown[]): void {
  probe.calls++;
  if (PAINTS.has(name)) probe.paints++;
  mix(`${name}(${args.map(show).join(',')})`);
  if (args.some(hasNonFinite)) probe.problems.push(`${name}(${args.map(show).join(', ')})`);
}

class FakeGradient {
  addColorStop(offset: number, color: string): void {
    record('addColorStop', [offset, color]);
    if (!(offset >= 0 && offset <= 1)) throw new RangeError(`IndexSizeError: color stop offset ${offset} is outside 0..1`);
    if (BROKEN_COLOR.test(color)) probe.problems.push(`addColorStop color "${color}"`);
  }
}

class FakePattern {
  setTransform(): void {}
}

function rejectNegativeRadii(name: string, args: readonly unknown[]): void {
  for (const at of RADII[name] ?? []) {
    if (typeof args[at] === 'number' && (args[at] as number) < 0) throw new RangeError(`IndexSizeError: ${name} got a negative radius (${args[at]})`);
  }
}

function callMethod(name: string, args: unknown[]): unknown {
  record(name, args);
  rejectNegativeRadii(name, args);
  switch (name) {
    case 'createLinearGradient':
    case 'createRadialGradient':
    case 'createConicGradient':
      if (args.some(hasNonFinite)) throw new TypeError(`${name}: non-finite value (${args.map(show).join(', ')})`);
      return new FakeGradient();
    case 'createPattern':
      return new FakePattern();
    case 'createImageData':
    case 'getImageData': {
      const first = args[0];
      const [w, h] = typeof first === 'object' && first !== null ? [(first as ImageData).width, (first as ImageData).height] : name === 'createImageData' ? [args[0], args[1]] : [args[2], args[3]];
      const width = Math.abs(Number(w));
      const height = Math.abs(Number(h));
      if (!(width > 0 && height > 0)) throw new RangeError(`IndexSizeError: ${name} with an empty size`);
      return { data: new Uint8ClampedArray(Math.floor(width) * Math.floor(height) * 4), width: Math.floor(width), height: Math.floor(height) };
    }
    case 'drawImage': {
      const source = args[0] as { width?: number; height?: number } | undefined;
      if (source && source.width === 0) throw new Error('InvalidStateError: drawImage from an empty canvas');
      return undefined;
    }
    case 'measureText':
      return { width: String(args[0]).length * 7, actualBoundingBoxLeft: 0, actualBoundingBoxRight: String(args[0]).length * 7, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 };
    case 'getTransform':
      return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    case 'getLineDash':
      return [];
    case 'isPointInPath':
    case 'isPointInStroke':
      return false;
    default:
      return undefined;
  }
}

export interface FakeCanvas {
  width: number;
  height: number;
  getContext(kind: string): CanvasRenderingContext2D | null;
  toDataURL(): string;
}

function makeContext(canvas: FakeCanvas): CanvasRenderingContext2D {
  const wrappers = new Map<string, (...args: unknown[]) => unknown>();
  const state = new Map<string, unknown>([
    ['canvas', canvas],
    ['fillStyle', '#000000'],
    ['strokeStyle', '#000000'],
    ['globalAlpha', 1],
    ['lineWidth', 1],
    ['globalCompositeOperation', 'source-over'],
    ['filter', 'none'],
  ]);
  return new Proxy({} as CanvasRenderingContext2D, {
    get(_, prop) {
      if (typeof prop !== 'string') return undefined;
      if (METHODS.has(prop)) {
        let fn = wrappers.get(prop);
        if (!fn) {
          fn = (...args) => callMethod(prop, args);
          wrappers.set(prop, fn);
        }
        return fn;
      }
      return state.get(prop);
    },
    set(_, prop, value) {
      if (typeof prop !== 'string') return true;
      probe.calls++;
      mix(`${prop}=${show(value)}`);
      if (hasNonFinite(value)) probe.problems.push(`${prop} = ${show(value)}`);
      else if (COLOR_PROPS.has(prop) && typeof value === 'string' && BROKEN_COLOR.test(value)) probe.problems.push(`${prop} = "${value}"`);
      state.set(prop, value);
      return true;
    },
  });
}

function createFakeCanvas(width: number, height: number): FakeCanvas {
  const canvas: FakeCanvas = {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,',
  };
  const ctx = makeContext(canvas);
  return canvas;
}

/** Minimal `Path2D`: art code only builds paths with it. Calls are recorded like context calls. */
class FakePath2D {
  constructor(_path?: unknown) {}
}
for (const name of ['addPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'arcTo', 'ellipse', 'rect', 'roundRect']) {
  (FakePath2D.prototype as unknown as Record<string, unknown>)[name] = function (...args: unknown[]): void {
    record(`path.${name}`, args);
    rejectNegativeRadii(name, args);
  };
}

/** Makes `createCanvas()` (and `new Path2D()`) work without a DOM. Call once per test file. */
export function installFakeCanvas(): void {
  setCanvasFactory((width, height) => createFakeCanvas(width, height) as unknown as HTMLCanvasElement);
  (globalThis as { Path2D?: unknown }).Path2D = FakePath2D;
}

/** Runs `paint` against a fresh fake canvas and reports what it did. Errors thrown by `paint` propagate. */
export function runOnFakeCanvas(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void): Probe {
  probe = freshProbe();
  const canvas = createFakeCanvas(width, height);
  paint(canvas.getContext('2d')!);
  return probe;
}
