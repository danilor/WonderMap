import { symbolById } from '@wondermap/illustrations';
import type { ResolvedBrush, ResolvedSymbol } from '@wondermap/illustrations';
import { combineSeed, createRng } from '@wondermap/illustrations/kit';
import type { NewSymbol } from '../model/ops';
import type { MapSymbol } from '../model/types';

/**
 * Scatter brushes sprinkle many symbols (a forest, a mountain range…) while you drag.
 *
 * The brush works on a fixed lattice: every lattice cell owns one candidate symbol whose look and
 * jitter come from a hash of the cell, so sweeping over the same spot twice never adds a second layer
 * and the result does not depend on how fast you drag.
 */

export interface ScatterSettings {
  brush: ResolvedBrush;
  /** User scale multiplier (also stretches the spacing). */
  scale: number;
  randomScale: boolean;
  randomFlip: boolean;
  randomVariant: boolean;
  width: number;
  height: number;
  /** Is there land under this point? Used to honour `placement` hints. */
  landAt(x: number, y: number): boolean;
  /** Fixes the look of the whole patch. Omitted in the editor, where every stroke gets a fresh one. */
  seed?: number;
}

interface Candidate {
  def: ResolvedSymbol;
  weight: number;
}

export class ScatterSession {
  private readonly cell: number;
  private readonly seed: number;
  private readonly candidates: Candidate[];
  private readonly totalWeight: number;
  private readonly attempted = new Set<number>();
  /** Spatial hash of the assets of this brush that are already on the map. */
  private readonly grid = new Map<number, Array<{ x: number; y: number }>>();
  private readonly assets: ReadonlySet<string>;
  private readonly settings: ScatterSettings;

  constructor(settings: ScatterSettings, existing: readonly MapSymbol[]) {
    this.settings = settings;
    this.seed = settings.seed ?? (Math.random() * 0xffffffff) >>> 0;
    const { brush } = settings;
    this.cell = Math.max(8, brush.spacing * settings.scale);
    this.candidates = brush.items.flatMap((item) => {
      const def = symbolById.get(item.symbol);
      return def && item.weight > 0 ? [{ def, weight: item.weight }] : [];
    });
    this.totalWeight = this.candidates.reduce((sum, c) => sum + c.weight, 0);
    this.assets = new Set(this.candidates.map((c) => c.def.id));
    for (const s of existing) if (this.assets.has(s.asset)) this.remember(s.x, s.y);
  }

  private bucket(x: number, y: number): number {
    return (Math.floor(x / this.cell) + 4096) * 8192 + (Math.floor(y / this.cell) + 4096);
  }

  private remember(x: number, y: number): void {
    const key = this.bucket(x, y);
    const list = this.grid.get(key);
    if (list) list.push({ x, y });
    else this.grid.set(key, [{ x, y }]);
  }

  private crowded(x: number, y: number): boolean {
    const limit = this.cell * 0.45;
    const gx = Math.floor(x / this.cell);
    const gy = Math.floor(y / this.cell);
    for (let i = gx - 1; i <= gx + 1; i++) {
      for (let j = gy - 1; j <= gy + 1; j++) {
        const list = this.grid.get((i + 4096) * 8192 + (j + 4096));
        if (list) for (const p of list) if (Math.hypot(p.x - x, p.y - y) < limit) return true;
      }
    }
    return false;
  }

  /** Symbols for the cells that the brush disc at `(cx, cy)` newly covers. */
  fill(cx: number, cy: number, radius: number): NewSymbol[] {
    if (!this.candidates.length) return [];
    const { settings, cell } = this;
    const { brush } = settings;
    const out: NewSymbol[] = [];
    const i0 = Math.floor((cx - radius) / cell) - 1;
    const i1 = Math.floor((cx + radius) / cell) + 1;
    const j0 = Math.floor((cy - radius) / cell) - 1;
    const j1 = Math.floor((cy + radius) / cell) + 1;

    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const key = (i + 4096) * 8192 + (j + 4096);
        if (this.attempted.has(key)) continue;
        const rng = createRng(combineSeed(this.seed, i, j));
        const x = (i + 0.5 + (rng.next() - 0.5) * 2 * brush.jitter) * cell;
        const y = (j + 0.5 + (rng.next() - 0.5) * 2 * brush.jitter) * cell;
        if (Math.hypot(x - cx, y - cy) > radius) continue;
        this.attempted.add(key);

        let pick = rng.next() * this.totalWeight;
        let chosen = this.candidates[0]!;
        for (const c of this.candidates) {
          pick -= c.weight;
          if (pick <= 0) {
            chosen = c;
            break;
          }
        }
        const scaleMix = settings.randomScale ? rng.next() : 0.5;
        const flip = brush.flip && settings.randomFlip && rng.chance(0.5);
        const variant = settings.randomVariant ? rng.int(0, chosen.def.variants - 1) : 0;
        const tilt = chosen.def.rotatable ? (rng.next() - 0.5) * 0.7 : 0;
        const keep = rng.chance(0.9);

        if (!keep || x < 0 || y < 0 || x > settings.width || y > settings.height) continue;
        const { placement } = chosen.def;
        if (placement !== 'any' && settings.landAt(x, y) !== (placement === 'land')) continue;
        if (this.crowded(x, y)) continue;

        this.remember(x, y);
        const [minScale, maxScale] = brush.scale;
        out.push({
          asset: chosen.def.id,
          x,
          y,
          scale: (minScale + (maxScale - minScale) * scaleMix) * settings.scale,
          rotation: tilt,
          flip,
          variant,
        });
      }
    }
    return out;
  }
}
