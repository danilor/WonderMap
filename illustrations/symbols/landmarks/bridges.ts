import { defineSymbol } from '../../kit/define';
import { ellipse, linearGradient, shape } from '../../kit/draw';
import type { Ctx2D, Rng, SymbolDef, Vec2 } from '../../kit/types';

const INK = '#2a2015';

function riverBand(ctx: Ctx2D, w: number, h: number, half: number, rand: Rng): void {
  const cx = w / 2;
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i <= 8; i++) {
    const y = (i / 8) * h;
    left.push([cx - half + rand.range(-2.4, 2.4), y]);
    right.push([cx + half + rand.range(-2.4, 2.4), y]);
  }
  const fade = (c: string, a: number): CanvasGradient =>
    linearGradient(ctx, 0, 0, 0, h, [[0, `rgba(${c},0)`], [0.2, `rgba(${c},${a})`], [0.8, `rgba(${c},${a})`], [1, `rgba(${c},0)`]]);
  shape(ctx, [...left, ...right.slice().reverse()], { fill: fade('74,150,184', 1), smooth: true });
  ctx.save();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = fade('42,32,21', 0.75);
  for (const side of [left, right]) {
    shape(ctx, side, { stroke: fade('42,32,21', 0.75), width: 1.6, closed: false, smooth: true });
  }
  ctx.strokeStyle = 'rgba(214,240,250,0.55)';
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 9; i++) {
    const x = cx + rand.range(-half * 0.8, half * 0.8);
    const y = rand.range(h * 0.12, h * 0.88);
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.quadraticCurveTo(x, y - 1.6, x + 3, y);
    ctx.stroke();
  }
  ctx.restore();
}

function chasm(ctx: Ctx2D, w: number, h: number, half: number, rand: Rng): void {
  const cx = w / 2;
  const left: Vec2[] = [];
  const right: Vec2[] = [];
  for (let i = 0; i <= 8; i++) {
    const y = (i / 8) * h;
    left.push([cx - half + rand.range(-3, 3), y]);
    right.push([cx + half + rand.range(-3, 3), y]);
  }
  const fade = (c: string, a: number): CanvasGradient =>
    linearGradient(ctx, 0, 0, 0, h, [[0, `rgba(${c},0)`], [0.2, `rgba(${c},${a})`], [0.8, `rgba(${c},${a})`], [1, `rgba(${c},0)`]]);
  shape(ctx, [...left, ...right.slice().reverse()], { fill: fade('40,32,34', 1), smooth: true });
  shape(ctx, left, { stroke: fade('42,32,21', 0.9), width: 2.2, closed: false });
  shape(ctx, right, { stroke: fade('42,32,21', 0.9), width: 2.2, closed: false });
}

/** Strips of a stone parapet or wall following the bridge profile. */
function ribbon(ctx: Ctx2D, top: (x: number) => number, bottom: (x: number) => number, x0: number, x1: number, fill: string | CanvasGradient, stroke = INK): void {
  const pts: Vec2[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push([x, top(x)]);
  }
  for (let i = n; i >= 0; i--) {
    const x = x0 + ((x1 - x0) * i) / n;
    pts.push([x, bottom(x)]);
  }
  shape(ctx, pts, { fill, stroke, width: 1.1 });
}

/** Adds the curve `y(x)` to the current path, one point every 2px from `x0` to `x1`. */
function curve(ctx: Ctx2D, x0: number, x1: number, y: (x: number) => number): void {
  for (let x = x0; x <= x1; x += 2) {
    if (x === x0) ctx.moveTo(x, y(x));
    else ctx.lineTo(x, y(x));
  }
}

function stoneBridge(ctx: Ctx2D, w: number, h: number, rand: Rng): void {
  riverBand(ctx, w, h, 22, rand);
  ctx.save();
  ctx.translate(w / 2, h / 2 + 2);
  const L = 56;
  const hw = 7;
  const z = (x: number): number => 3 + 14 * (1 - (x / L) ** 2);
  const back = (x: number): number => -hw - z(x);
  const front = (x: number): number => hw - z(x);
  const yb = 15;
  ribbon(ctx, (x) => back(x) - 5, back, -L, L, '#a79f8c');
  ribbon(ctx, back, front, -L, L, '#cdc2a6');
  ctx.strokeStyle = 'rgba(42,32,21,0.22)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let x = -L + 4; x < L; x += 5.5) {
    ctx.moveTo(x, back(x));
    ctx.lineTo(x, front(x) - 5);
  }
  ctx.stroke();
  const face = linearGradient(ctx, -L, 0, L, 0, [['#c9bea3'], ['#b7ab91'], ['#a99d85']].map((c, i) => [i / 2, c[0]!] as [number, string]));
  ribbon(ctx, (x) => front(x) - 5, () => yb, -L, L, face);
  ctx.strokeStyle = 'rgba(42,32,21,0.28)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let r = 0; r < 6; r++) {
    const off = r * 4.2;
    for (let x = -L + 2; x < L - 2; x += 1) {
      if (x % 1 !== 0) continue;
    }
    ctx.moveTo(-L + 1, yb - off);
    ctx.lineTo(L - 1, yb - off);
  }
  for (let x = -L + 3; x < L; x += 7) {
    for (let r = 0; r < 6; r++) {
      const off = r * 4.2;
      const xx = x + (r % 2) * 3.5;
      ctx.moveTo(xx, yb - off);
      ctx.lineTo(xx, yb - off - 4.2);
    }
  }
  ctx.stroke();
  ribbon(ctx, (x) => front(x) - 6.6, (x) => front(x) - 5, -L, L, '#e2d8bc');
  const arch = (cx: number, r: number, water: boolean): void => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - r, yb + 1);
    ctx.lineTo(cx - r, yb);
    ctx.ellipse(cx, yb, r, r * 0.95, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(cx + r, yb + 1);
    ctx.closePath();
    ctx.fillStyle = linearGradient(ctx, 0, yb - r, 0, yb + 1, water ? ['#1f1a12', '#2d4f60', '#4a93b4'] : ['#1f1a12', '#3a3126']);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e2d8bc';
    ctx.beginPath();
    ctx.ellipse(cx, yb, r + 1.8, r * 0.95 + 1.8, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.ellipse(cx, yb, r + 3.2, r * 0.95 + 3.2, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, yb, r, r * 0.95, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
  arch(0, 15, true);
  arch(-41, 7, false);
  arch(41, 7, false);
  for (const s of [-1, 1]) {
    ribbon(ctx, () => front(s * L) - 9, () => front(s * L) + 1, s * L - 3, s * L + 3, '#d0c5a8');
  }
  ctx.restore();
}

function woodBridge(ctx: Ctx2D, w: number, h: number, rand: Rng): void {
  riverBand(ctx, w, h, 24, rand);
  ctx.save();
  ctx.translate(w / 2, h / 2 + 2);
  const L = 56;
  const z = (x: number): number => 6 + 5 * (1 - (x / L) ** 2);
  const back = (x: number): number => -6.5 - z(x);
  const front = (x: number): number => 6.5 - z(x);
  const wood = '#a47a4c';
  const post = (x: number, y0: number, y1: number, width = 3): void => {
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.strokeStyle = INK;
    ctx.lineWidth = width + 1.5;
    ctx.stroke();
    ctx.strokeStyle = wood;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(217,178,124,0.7)';
    ctx.lineWidth = width * 0.3;
    ctx.stroke();
  };
  for (const x of [-30, -15, 0, 15, 30]) post(x, front(x) + 1, 15, 3.2);
  for (const x of [-22.5, -7.5, 7.5, 22.5]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x - 7.5, front(x - 7.5) + 5);
    ctx.lineTo(x + 7.5, 13);
    ctx.stroke();
    ctx.strokeStyle = '#8f6840';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  for (let x = -L + 6; x <= L - 6; x += 12) post(x, back(x), back(x) - 8, 2.2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  curve(ctx, -L + 6, L - 6, (x) => back(x) - 7);
  ctx.stroke();
  ctx.strokeStyle = '#8f6840';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ribbon(ctx, back, front, -L, L, '#b98d58');
  ctx.strokeStyle = 'rgba(42,32,21,0.55)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let x = -L + 3; x < L; x += 4.6) {
    ctx.moveTo(x, back(x));
    ctx.lineTo(x, front(x));
  }
  ctx.stroke();
  ribbon(ctx, front, (x) => front(x) + 4.2, -L, L, '#7f5a38');
  for (let x = -L + 6; x <= L - 6; x += 12) post(x, front(x), front(x) - 9, 2.4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  curve(ctx, -L + 6, L - 6, (x) => front(x) - 8);
  ctx.stroke();
  ctx.strokeStyle = '#a47a4c';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function ropeBridge(ctx: Ctx2D, w: number, h: number, rand: Rng): void {
  chasm(ctx, w, h, 28, rand);
  ctx.save();
  ctx.translate(w / 2, h / 2 + 2);
  const L = 56;
  const deckZ = (x: number): number => 9 - 8 * (1 - (x / L) ** 2);
  const back = (x: number): number => -5 - deckZ(x);
  const front = (x: number): number => 5 - deckZ(x);
  const hand = (x: number, y: number): number => y - 15 + 11 * (1 - (x / L) ** 2);
  const rope = (f: (x: number) => number): void => {
    ctx.beginPath();
    curve(ctx, -L, L, f);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.strokeStyle = '#c9a979';
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  rope((x) => hand(x, back(x)));
  ctx.strokeStyle = 'rgba(42,32,21,0.8)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let x = -L + 7; x < L; x += 9) {
    ctx.moveTo(x, back(x));
    ctx.lineTo(x, hand(x, back(x)));
  }
  ctx.stroke();
  ribbon(ctx, back, front, -L, L, '#b98d58');
  ctx.strokeStyle = 'rgba(42,32,21,0.6)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (let x = -L + 2.5; x < L; x += 4.2) {
    ctx.moveTo(x, back(x));
    ctx.lineTo(x, front(x));
  }
  ctx.stroke();
  ribbon(ctx, front, (x) => front(x) + 2.6, -L, L, '#7f5a38');
  ctx.strokeStyle = 'rgba(42,32,21,0.8)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let x = -L + 7; x < L; x += 9) {
    ctx.moveTo(x, front(x));
    ctx.lineTo(x, hand(x, front(x)));
  }
  ctx.stroke();
  rope((x) => hand(x, front(x)));
  for (const s of [-1, 1]) {
    const x = s * (L + 1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, front(x) + 3);
    ctx.lineTo(x, hand(x, front(x)) - 2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.8;
    ctx.stroke();
    ctx.strokeStyle = '#8f6840';
    ctx.lineWidth = 3.2;
    ctx.stroke();
  }
  ctx.restore();
  ellipse(ctx, w / 2 - 44, h / 2 + 14, 5, 2.5, { fill: 'rgba(0,0,0,0.12)' });
}

function bridge(id: string, name: string, order: number, draw: (ctx: Ctx2D, w: number, h: number, rand: Rng) => void): SymbolDef {
  return defineSymbol({
    id,
    name,
    category: 'landmarks',
    size: [128, 72],
    anchor: [0.5, 0.5],
    order,
    placement: 'any',
    rotatable: true,
    tags: ['bridge', 'crossing', 'river'],
    draw(d) {
      draw(d.ctx, d.w, d.h, d.rand);
    },
  });
}

export default [
  bridge('landmark.bridge.stone', 'Stone Bridge', 110, stoneBridge),
  bridge('landmark.bridge.wood', 'Wooden Bridge', 111, woodBridge),
  bridge('landmark.bridge.rope', 'Rope Bridge', 112, ropeBridge),
];
