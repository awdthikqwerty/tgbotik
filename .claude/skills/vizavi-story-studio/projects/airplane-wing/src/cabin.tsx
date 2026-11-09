// Cabin interior in plane coordinates (floor y = -1.05, walls |z| ~ 2.5). Seats face +x.
import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { toon, gradientMap } from "./toon";
import { CAST, MAX, MAX_EXPR, personTexture, CARD_ASPECT, type PersonSpec, type Expr, type Pose } from "./characters";
import { noise } from "./lib";

export const ROWS = 26;
export const rowX = (i: number) => -7.4 + i * 0.86;
export const SEAT_Z = [0.8, 1.32, 1.84];
export const MAX_ROW = 10;
export const MAX_SEAT: [number, number, number] = [rowX(MAX_ROW), -0.45, 1.84];
const FLOOR = -1.05, X0 = -8.2, X1 = 15.2;

const box = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0) => {
  const g = new THREE.BoxGeometry(w, h, d); if (rz) g.rotateZ(rz); g.translate(x, y, z); return g;
};

function seatGeos() {
  const fabric: THREE.BufferGeometry[] = [], cover: THREE.BufferGeometry[] = [], plastic: THREE.BufferGeometry[] = [], metal: THREE.BufferGeometry[] = [];
  for (let i = 0; i < ROWS; i++) {
    const x = rowX(i);
    for (const sd of [1, -1]) for (const zc of SEAT_Z) {
      const z = sd * zc;
      fabric.push(box(0.5, 0.16, 0.48, x + 0.04, -0.53, z));
      fabric.push(box(0.12, 0.78, 0.48, x - 0.23, -0.07, z, 0.12));
      cover.push(box(0.125, 0.24, 0.42, x - 0.205, 0.2, z, 0.12));
      plastic.push(box(0.04, 0.3, 0.36, x - 0.31, -0.02, z, 0.12)); // tray table on the seat back
      metal.push(box(0.36, 0.38, 0.4, x - 0.02, -0.82, z));
    }
    for (const sd of [1, -1]) for (const az of [0.54, 1.06, 1.58, 2.1]) plastic.push(box(0.44, 0.06, 0.07, x - 0.02, -0.3, sd * az));
  }
  const m = (a: THREE.BufferGeometry[]) => mergeGeometries(a.map((g) => g.toNonIndexed()))!;
  return { fabric: m(fabric), cover: m(cover), plastic: m(plastic), metal: m(metal) };
}

/** Strip extruded along x from a (y, z) polyline. */
function profileStrip(pts: [number, number][], x0: number, x1: number) {
  const pos: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ya, za] = pts[i], [yb, zb] = pts[i + 1];
    pos.push(x0, ya, za, x1, ya, za, x1, yb, zb, x0, ya, za, x1, yb, zb, x0, yb, zb);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
const rounded = <T extends THREE.Path>(p: T, cx: number, cy: number, w: number, h: number, r: number) => {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  p.moveTo(x0 + r, y0); p.lineTo(x1 - r, y0); p.quadraticCurveTo(x1, y0, x1, y0 + r); p.lineTo(x1, y1 - r);
  p.quadraticCurveTo(x1, y1, x1 - r, y1); p.lineTo(x0 + r, y1); p.quadraticCurveTo(x0, y1, x0, y1 - r); p.lineTo(x0, y0 + r); p.quadraticCurveTo(x0, y0, x0 + r, y0);
  return p;
};
const WIN = { w: 0.44, h: 0.6, cy: 0.06 };
function windowPanel(pitch: number) {
  const s = new THREE.Shape(); s.moveTo(-pitch / 2, -0.55); s.lineTo(pitch / 2, -0.55); s.lineTo(pitch / 2, 0.55); s.lineTo(-pitch / 2, 0.55); s.closePath();
  s.holes.push(rounded(new THREE.Path(), 0, WIN.cy, WIN.w + 0.16, WIN.h + 0.16, 0.2));
  const bezel = rounded(new THREE.Shape(), 0, WIN.cy, WIN.w + 0.16, WIN.h + 0.16, 0.2);
  bezel.holes.push(rounded(new THREE.Path(), 0, WIN.cy, WIN.w, WIN.h, 0.17));
  return { wall: new THREE.ShapeGeometry(s), bezel: new THREE.ShapeGeometry(bezel, 8) };
}

const WALL = "#ece5d6", BIN = "#f4efe6", FABRIC = "#9b3a48", COVER = "#f3ead8";

export const CabinSet: React.FC<{ lightPulse?: number }> = ({ lightPulse = 0 }) => {
  const seats = useMemo(seatGeos, []);
  const pitch = 0.86;
  const panel = useMemo(() => windowPanel(pitch), []);
  const strips = useMemo(() => {
    const side = (sd: number) => ({
      lower: profileStrip([[FLOOR, sd * 2.22], [-0.05, sd * 2.5]], X0, X1),
      upper: profileStrip([[1.05, sd * 2.46], [1.36, sd * 2.36]], X0, X1),
      ceil: profileStrip([[1.98, sd * 1.5], [2.22, sd * 0.95], [2.3, 0]], X0, X1),
    });
    return [side(1), side(-1)];
  }, []);
  const mat = useMemo(() => ({
    wall: toon(WALL, { side: THREE.DoubleSide }), bin: toon(BIN, { side: THREE.DoubleSide }), fabric: toon(FABRIC), cover: toon(COVER), plastic: toon("#cfc9bf"), metal: toon("#5d6273"),
    floor: toon("#4d5370"), aisle: toon("#7a3a4c"), bezel: toon("#d9d3c7", { side: THREE.DoubleSide }), shade: toon("#c6bfb0", { side: THREE.DoubleSide }),
  }), []);
  const winXs = useMemo(() => Array.from({ length: ROWS + 1 }, (_, i) => rowX(i) + 0.08), []);
  return <group>
    <mesh position={[(X0 + X1) / 2, FLOOR - 0.05, 0]} material={mat.floor}><boxGeometry args={[X1 - X0, 0.1, 4.6]} /></mesh>
    <mesh position={[(X0 + X1) / 2, FLOOR + 0.006, 0]} material={mat.aisle}><boxGeometry args={[X1 - X0, 0.01, 0.62]} /></mesh>
    {strips.map((s, i) => <group key={i}>
      <mesh geometry={s.lower} material={mat.wall} />
      <mesh geometry={s.upper} material={mat.wall} />
      <mesh geometry={s.ceil} material={mat.bin} />
    </group>)}
    {([1, -1] as const).map((sd) => <group key={sd}>
      {/* wall band with windows, tilted to follow the fuselage */}
      {winXs.map((x, i) => <group key={i} position={[x, 0.5, sd * 2.49]} rotation={[sd * 0.06, sd === 1 ? Math.PI : 0, 0]}>
        <mesh geometry={panel.wall} material={mat.wall} />
        <mesh geometry={panel.bezel} material={mat.bezel} position={[0, 0, 0.02]} />
        <mesh position={[0, WIN.cy + WIN.h / 2 - 0.06, -0.03]} material={mat.shade}><planeGeometry args={[WIN.w, 0.13]} /></mesh>
      </group>)}
      {/* overhead bins + service units */}
      <mesh position={[(X0 + X1) / 2, 1.67, sd * 1.93]} material={mat.bin}><boxGeometry args={[X1 - X0, 0.6, 0.86]} /></mesh>
      <mesh position={[(X0 + X1) / 2, 1.38, sd * 1.88]} material={mat.plastic}><boxGeometry args={[X1 - X0, 0.04, 0.76]} /></mesh>
      {Array.from({ length: 15 }, (_, k) => <mesh key={k} position={[X0 + 0.8 + k * 1.6, 1.67, sd * 1.495]}><boxGeometry args={[0.03, 0.56, 0.01]} /><meshBasicMaterial color="#9b968c" /></mesh>)}
      {Array.from({ length: ROWS }, (_, k) => <mesh key={k} position={[rowX(k) + 0.2, 1.355, sd * 1.75]}><boxGeometry args={[0.12, 0.012, 0.12]} /><meshBasicMaterial color={lightPulse > 0.5 && k % 3 === 0 ? "#ffd27a" : "#e8e1cf"} /></mesh>)}
      <mesh position={[(X0 + X1) / 2, 2.0, sd * 1.46]}><boxGeometry args={[X1 - X0, 0.05, 0.08]} /><meshBasicMaterial color="#fff2d6" /></mesh>
    </group>)}
    <mesh position={[X1, 0.6, 0]} material={mat.wall}><boxGeometry args={[0.05, 3.4, 5]} /></mesh>
    <mesh position={[X1 - 0.03, 0.4, 0]}><boxGeometry args={[0.02, 2.1, 0.9]} /><meshBasicMaterial color="#25356a" /></mesh>
    <mesh position={[X0, 0.6, 0]} material={mat.wall}><boxGeometry args={[0.05, 3.4, 5]} /></mesh>
    <mesh geometry={seats.fabric} material={mat.fabric} />
    <mesh geometry={seats.cover} material={mat.cover} />
    <mesh geometry={seats.plastic} material={mat.plastic} />
    <mesh geometry={seats.metal} material={mat.metal} />
  </group>;
};

/** Flat ink character card, seated: bottom edge on the cushion, turned toward the camera (limited yaw). */
export const Seated: React.FC<{ person: PersonSpec; ex: Expr; pose: Pose; at: [number, number, number]; cam: [number, number, number]; h?: number; jitter?: number; t: number; seed?: number; lookYaw?: number }> = ({
  person, ex, pose, at, cam, h = 1.18, jitter = 0, t, seed = 0, lookYaw = 0,
}) => {
  const tex = personTexture(person, ex, pose, lookYaw);
  const dx = cam[0] - at[0], dz = cam[2] - at[2];
  let yaw = Math.atan2(dx, dz); // card normal (+z) toward camera
  const fwd = Math.PI / 2; // facing +x
  const lim = 1.0; yaw = Math.max(fwd - lim, Math.min(fwd + lim, yaw));
  const jx = jitter * noise(t * 17, seed) * 0.025, jy = jitter * Math.abs(noise(t * 13, seed + 3)) * 0.035;
  return <mesh position={[at[0] + 0.06 + jx, at[1] + h / 2 + jy, at[2]]} rotation={[0, yaw, jitter * noise(t * 9, seed + 5) * 0.03]}>
    <planeGeometry args={[h * CARD_ASPECT, h]} />
    <meshBasicMaterial map={tex} transparent alphaTest={0.5} toneMapped={false} side={THREE.DoubleSide} />
  </mesh>;
};

const extra = (id: string, base: PersonSpec, top: string, topShade: string, hair?: string): PersonSpec => ({ ...base, id, top, topShade, ...(hair ? { hair } : {}) });
export const PAX: { row: number; seat: number; sd: 1 | -1; sp: PersonSpec }[] = [
  { row: 11, seat: 2, sd: 1, sp: CAST.anna }, { row: 11, seat: 1, sd: 1, sp: CAST.ivan },
  { row: 9, seat: 0, sd: -1, sp: CAST.lena }, { row: 9, seat: 1, sd: -1, sp: CAST.tim },
  { row: 12, seat: 0, sd: -1, sp: extra("p1", CAST.anna, "#2fae8a", "#228466", "#b5652e") },
  { row: 13, seat: 2, sd: 1, sp: extra("p2", CAST.tim, "#e86a3a", "#c2512a") },
  { row: 14, seat: 1, sd: -1, sp: extra("p3", CAST.ivan, "#6a5acd", "#5245a8", "#3a2a20") },
  { row: 15, seat: 0, sd: 1, sp: extra("p4", CAST.lena, "#f2c33a", "#cf9f22", "#2a1d1a") },
  { row: 8, seat: 2, sd: 1, sp: extra("p5", CAST.tim, "#d84a6a", "#b23552", "#5a3a22") },
  { row: 16, seat: 2, sd: -1, sp: extra("p6", CAST.anna, "#3a8ad8", "#2b6bb0", "#d89a3c") },
  { row: 7, seat: 1, sd: -1, sp: extra("p7", CAST.ivan, "#8a9a5c", "#6f7d47") },
  { row: 17, seat: 1, sd: 1, sp: extra("p8", CAST.lena, "#e0705a", "#bb5644", "#6a4127") },
];

export const Passengers: React.FC<{ cam: [number, number, number]; scare: number; t: number }> = ({ cam, scare, t }) => (
  <>{PAX.map((p, i) => {
    const e = scare > 0.4 ? (i % 2 ? MAX_EXPR.scared : MAX_EXPR.startled) : MAX_EXPR.calm;
    return <Seated key={i} person={p.sp} ex={e.ex} pose={scare > 0.4 ? "grip" : "rest"} at={[rowX(p.row), -0.45, p.sd * SEAT_Z[p.seat]]} cam={cam} jitter={scare} t={t} seed={i * 3} />;
  })}</>
);

export const MaxSeated: React.FC<{ expr: string; cam: [number, number, number]; jitter: number; t: number; look?: number }> = ({ expr, cam, jitter, t, look = 0 }) => {
  const e = MAX_EXPR[expr] ?? MAX_EXPR.calm;
  return <Seated person={MAX} ex={e.ex} pose={e.pose} at={MAX_SEAT} cam={cam} jitter={jitter} t={t} seed={42} lookYaw={look} />;
};
