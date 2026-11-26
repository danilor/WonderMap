/** Remembers where things were put, so that later things keep their distance. */

interface Entry {
  x: number;
  y: number;
  radius: number;
  owner: number;
}

/** Points on a coarse grid: "is anything closer than this?" without looking at every point. */
export class PointHash {
  private readonly cell: number;
  private readonly buckets = new Map<number, Entry[]>();
  private largest = 0;

  constructor(cell: number) {
    this.cell = cell;
  }

  private key(i: number, j: number): number {
    return (i + 4096) * 16384 + (j + 4096);
  }

  add(x: number, y: number, radius: number, owner: number): void {
    const key = this.key(Math.floor(x / this.cell), Math.floor(y / this.cell));
    const list = this.buckets.get(key);
    if (list) list.push({ x, y, radius, owner });
    else this.buckets.set(key, [{ x, y, radius, owner }]);
    this.largest = Math.max(this.largest, radius);
  }

  /** Is a point of another owner closer than the two radii added together? */
  collides(x: number, y: number, radius: number, owner: number): boolean {
    const reach = Math.ceil((radius + this.largest) / this.cell);
    const gx = Math.floor(x / this.cell);
    const gy = Math.floor(y / this.cell);
    for (let i = gx - reach; i <= gx + reach; i++) {
      for (let j = gy - reach; j <= gy + reach; j++) {
        const list = this.buckets.get(this.key(i, j));
        if (!list) continue;
        for (const e of list) if (e.owner !== owner && Math.hypot(e.x - x, e.y - y) < e.radius + radius) return true;
      }
    }
    return false;
  }
}

/** A (tilted) rectangle that scatters keep clear of: around a town, under a name. */
export interface Keepout {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
  cos: number;
  sin: number;
  /** Chance that a symbol inside is dropped (1 = always). */
  chance: number;
}

export function makeKeepout(cx: number, cy: number, halfW: number, halfH: number, rotation = 0, chance = 1): Keepout {
  return { cx, cy, halfW, halfH, cos: Math.cos(rotation), sin: Math.sin(rotation), chance };
}

/** The strongest chance of being dropped among the keepouts that contain the point (0 when there are none). */
export function keepoutAt(keepouts: readonly Keepout[], x: number, y: number): number {
  let strongest = 0;
  for (const k of keepouts) {
    const dx = x - k.cx;
    const dy = y - k.cy;
    const lx = dx * k.cos + dy * k.sin;
    const ly = -dx * k.sin + dy * k.cos;
    if (Math.abs(lx) <= k.halfW && Math.abs(ly) <= k.halfH && k.chance > strongest) strongest = k.chance;
  }
  return strongest;
}
