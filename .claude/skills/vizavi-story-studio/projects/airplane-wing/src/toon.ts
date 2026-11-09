import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "./lib";

// ---------- toon material helpers ----------
let _grad: THREE.DataTexture | null = null;
export function gradientMap() {
  if (_grad) return _grad;
  const data = new Uint8Array([70, 130, 200, 255]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  _grad = tex; return tex;
}
const matCache = new Map<string, THREE.Material>();
export function toon(color: string, extra: Partial<THREE.MeshToonMaterialParameters> = {}) {
  const key = color + JSON.stringify(extra);
  let m = matCache.get(key);
  if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), ...extra }); matCache.set(key, m); }
  return m;
}
export const INK = "#17122b";
export const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

// ---------- fuselage ----------
export const PL = { R: 2.7, L: 44 };
export function fuselageGeometry(inflate = 0) {
  const R = PL.R + inflate, L = PL.L + inflate * 2;
  const pts: THREE.Vector2[] = [];
  const steps = 70;
  for (let i = 0; i <= steps; i++) {
    const a = -L / 2 + (L * i) / steps;
    let r = R;
    const noseStart = L / 2 - 7.5;
    const tailStart = -L / 2 + 15;
    if (a > noseStart) { const t = (a - noseStart) / 7.5; r = R * Math.sqrt(Math.max(0, 1 - t * t * 0.985)); }
    else if (a < tailStart) { const t = (tailStart - a) / 15; const s = t * t * (3 - 2 * t); r = R * (1 - 0.8 * s); }
    pts.push(new THREE.Vector2(Math.max(0.02, r), a));
  }
  const g = new THREE.LatheGeometry(pts, 40);
  g.rotateZ(-Math.PI / 2);
  if (inflate === 0) {
    const pos = g.attributes.position; const col = new Float32Array(pos.count * 3);
    const top = new THREE.Color("#f4f7fd"), belly = new THREE.Color("#a9b6cf"); const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / PL.R;
      const k = THREE.MathUtils.smoothstep(-y, 0.2, 0.55);
      c.copy(top).lerp(belly, k); col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  }
  return g;
}

// ---------- wing ----------
export type WingParams = {
  side: 1 | -1; span: number; rootChord: number; tipChord: number; sweep: number; x0: number; y0: number; z0: number;
  rootThick: number; tipThick: number; flex: number; inflate?: number; stress?: number; segments?: number; dihedral?: number;
};
export const WING: WingParams = { side: 1, span: 19, rootChord: 9.5, tipChord: 2.6, sweep: 9, x0: 4.5, y0: -1.0, z0: 1.8, rootThick: 1.15, tipThick: 0.3, flex: 0, dihedral: 0.07 };
const RING = 5;
export function wingVertexCount(segments: number) { return (segments * RING * 2 + RING) * 3; }
export function makeWingGeometry(segments = 22) {
  const g = new THREE.BufferGeometry();
  const n = wingVertexCount(segments);
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  return g;
}
const heat = (v: number): [number, number, number] => {
  const a: [number, number, number][] = [[0.25, 0.55, 1], [0.35, 0.9, 0.7], [1, 0.9, 0.3], [1, 0.35, 0.2]];
  const x = Math.min(0.999, Math.max(0, v)) * 3; const i = Math.floor(x); const t = x - i;
  return [a[i][0] + (a[i + 1][0] - a[i][0]) * t, a[i][1] + (a[i + 1][1] - a[i][1]) * t, a[i][2] + (a[i + 1][2] - a[i][2]) * t];
};
export function wingDeflection(p: WingParams, s: number) { return p.flex * s * s + (p.dihedral ?? 0) * p.span * s; }
export function fillWing(g: THREE.BufferGeometry, p: WingParams, base: [number, number, number] = [0.93, 0.95, 0.98]) {
  const N = p.segments ?? 22; const inf = p.inflate ?? 0;
  const pos = g.attributes.position as THREE.BufferAttribute, col = g.attributes.color as THREE.BufferAttribute;
  const rings: THREE.Vector3[][] = [];
  const centers: THREE.Vector3[] = [];
  for (let k = 0; k <= N; k++) {
    const s = k / N;
    const chord = THREE.MathUtils.lerp(p.rootChord, p.tipChord, s) + inf * 2;
    const th = THREE.MathUtils.lerp(p.rootThick, p.tipThick, s) + inf * 2;
    const xLE = p.x0 - p.sweep * s + inf;
    const z = p.side * (p.z0 + p.span * s + (k === N ? inf : 0) - (k === 0 ? inf : 0));
    const y = p.y0 + wingDeflection(p, s);
    const pts = [
      new THREE.Vector3(xLE, y, z),
      new THREE.Vector3(xLE - chord * 0.28, y + th / 2, z),
      new THREE.Vector3(xLE - chord, y + th * 0.08, z),
      new THREE.Vector3(xLE - chord, y - th * 0.08, z),
      new THREE.Vector3(xLE - chord * 0.28, y - th / 2, z),
    ];
    rings.push(pts); centers.push(new THREE.Vector3(xLE - chord * 0.4, y, z));
  }
  let vi = 0;
  const tmpN = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), mid = new THREE.Vector3();
  const stress = p.stress ?? 0;
  const push = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, ctr: THREE.Vector3, s: number) => {
    e1.subVectors(b, a); e2.subVectors(c, a); tmpN.crossVectors(e1, e2);
    mid.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(ctr);
    const flip = tmpN.dot(mid) < 0;
    const tri = flip ? [a, c, b] : [a, b, c];
    const hv = stress > 0 ? heat(Math.pow(1 - s, 0.9) * stress) : null;
    const cc: [number, number, number] = hv ? [THREE.MathUtils.lerp(base[0], hv[0], Math.min(1, stress * 1.6)), THREE.MathUtils.lerp(base[1], hv[1], Math.min(1, stress * 1.6)), THREE.MathUtils.lerp(base[2], hv[2], Math.min(1, stress * 1.6))] : base;
    for (const v of tri) { pos.setXYZ(vi, v.x, v.y, v.z); col.setXYZ(vi, cc[0], cc[1], cc[2]); vi++; }
  };
  for (let k = 0; k < N; k++) {
    const s = (k + 0.5) / N;
    for (let j = 0; j < RING; j++) {
      const j2 = (j + 1) % RING;
      const a = rings[k][j], b = rings[k][j2], c = rings[k + 1][j2], d = rings[k + 1][j];
      const ctr = centers[k];
      push(a, b, c, ctr, s); push(a, c, d, ctr, s);
    }
  }
  const tipC = centers[N];
  for (let j = 0; j < RING; j++) push(tipC, rings[N][j], rings[N][(j + 1) % RING], new THREE.Vector3(tipC.x, tipC.y, tipC.z - p.side * 5), 1);
  g.computeVertexNormals();
  pos.needsUpdate = true; col.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}

// ---------- clouds ----------
export function makeCloudGeometry(seed: number) {
  const r = rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  const n = 6 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1) - 0.5;
    const rad = (1.2 + r() * 0.9) * (1 - Math.abs(t) * 0.9);
    const g = new THREE.SphereGeometry(rad, 14, 10);
    g.scale(1, 0.78, 0.95);
    g.translate(t * 5.2, (r() - 0.3) * 0.5 + (1 - Math.abs(t) * 2) * 0.35, (r() - 0.5) * 1.3);
    const pos = g.attributes.position; const col = new Float32Array(pos.count * 3);
    const lo = new THREE.Color("#aebfe0"), hi = new THREE.Color("#ffffff"); const c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const h = (pos.getY(k) + 1) / 2.6;
      c.copy(lo).lerp(hi, THREE.MathUtils.smoothstep(h, 0.05, 0.55)); col.set([c.r, c.g, c.b], k * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.deleteAttribute("uv");
    parts.push(g);
  }
  return mergeGeometries(parts)!;
}
