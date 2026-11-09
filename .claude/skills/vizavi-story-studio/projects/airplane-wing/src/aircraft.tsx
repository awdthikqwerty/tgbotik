// Airliner model in plane coordinates: +x nose, +y up, +z right wing. Units ~ metres.
import React, { useMemo } from "react";
import * as THREE from "three";
import { toon, gradientMap, fuselageGeometry, PL } from "./toon";
import { ctex } from "./post/paint";
import { rng } from "./lib";

export type WingP = {
  side: 1 | -1; span: number; rootChord: number; tipChord: number; sweep: number; x0: number; y0: number; z0: number;
  rootThick: number; tipThick: number; dihedral: number; flex: number; segments: number;
};
export const MAIN: Omit<WingP, "side" | "flex"> = { span: 19, rootChord: 9.5, tipChord: 2.4, sweep: 9.5, x0: 4.5, y0: -1.1, z0: 1.9, rootThick: 1.25, tipThick: 0.3, dihedral: 0.07, segments: 26 };
const TAIL: Omit<WingP, "side" | "flex"> = { span: 7.5, rootChord: 5.0, tipChord: 1.8, sweep: 4.5, x0: -15.5, y0: 0.6, z0: 0.9, rootThick: 0.5, tipThick: 0.16, dihedral: 0.05, segments: 6 };
const L = THREE.MathUtils.lerp;

/** Wing section at span fraction s: leading edge x, chord, thickness, height (with bending), z, local slope dy/d|z|. */
export const station = (p: WingP, s: number) => ({
  xLE: p.x0 - p.sweep * s, chord: L(p.rootChord, p.tipChord, s), th: L(p.rootThick, p.tipThick, s),
  y: p.y0 + p.flex * s * s + p.dihedral * p.span * s, z: p.side * (p.z0 + p.span * s),
  slope: (2 * p.flex * s + p.dihedral * p.span) / p.span,
});
export const mainWing = (side: 1 | -1, flex: number): WingP => ({ ...MAIN, side, flex });

// airfoil ring: upper surface TE -> LE, lower surface LE -> TE (NACA-like thickness, slight camber)
const U = [1, 0.88, 0.72, 0.52, 0.34, 0.2, 0.09, 0.025, 0, 0.025, 0.09, 0.2, 0.34, 0.52, 0.72, 0.88];
const R = U.length;
const tn = (u: number) => (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4) / 0.1;
const HEAT: [number, number, number][] = [[0.3, 0.6, 1], [0.35, 0.9, 0.65], [1, 0.88, 0.3], [1, 0.35, 0.2]];
const heat = (v: number, out: THREE.Color) => {
  const x = Math.min(0.999, Math.max(0, v)) * 3, i = Math.floor(x), f = x - i;
  return out.setRGB(L(HEAT[i][0], HEAT[i + 1][0], f), L(HEAT[i][1], HEAT[i + 1][1], f), L(HEAT[i][2], HEAT[i + 1][2], f));
};

function wingGeo(n: number) {
  const g = new THREE.BufferGeometry();
  const nv = (n + 1) * R + 1;
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
  const idx: number[] = [];
  for (let k = 0; k < n; k++) for (let j = 0; j < R; j++) {
    const a = k * R + j, b = k * R + ((j + 1) % R), c = (k + 1) * R + ((j + 1) % R), d = (k + 1) * R + j;
    idx.push(a, b, c, a, c, d);
  }
  const tip = (n + 1) * R;
  for (let j = 0; j < R; j++) idx.push(n * R + j, n * R + ((j + 1) % R), tip);
  g.setIndex(idx);
  return g;
}
const tmpC = new THREE.Color(), tmpH = new THREE.Color();
function fillWing(g: THREE.BufferGeometry, p: WingP, stress: number, base: THREE.Color) {
  const pos = g.attributes.position as THREE.BufferAttribute, col = g.attributes.color as THREE.BufferAttribute;
  const n = p.segments;
  for (let k = 0; k <= n; k++) {
    const s = k / n, st = station(p, s);
    const cs = 1 / Math.sqrt(1 + st.slope * st.slope), sn = st.slope * cs;
    for (let j = 0; j < R; j++) {
      const u = U[j], t = tn(u) * st.th * 0.5, camber = st.th * 0.1 * Math.sin(Math.PI * u);
      const dy = j <= 8 ? t + camber : -t * 0.7 + camber;
      pos.setXYZ(k * R + j, st.xLE - u * st.chord, st.y + dy * cs, st.z - p.side * dy * sn);
      tmpC.copy(base);
      if (u > 0.76) tmpC.multiplyScalar(0.88); // flaps / ailerons
      else if (u < 0.03) tmpC.multiplyScalar(0.9); // leading-edge slats
      if (stress > 0) tmpC.lerp(heat(Math.pow(1 - s, 0.9) * stress, tmpH), Math.min(1, stress * 1.5));
      col.setXYZ(k * R + j, tmpC.r, tmpC.g, tmpC.b);
    }
  }
  const st = station(p, 1);
  pos.setXYZ((n + 1) * R, st.xLE - st.chord * 0.4, st.y, st.z);
  col.setXYZ((n + 1) * R, base.r, base.g, base.b);
  pos.needsUpdate = true; col.needsUpdate = true;
  g.computeVertexNormals(); g.computeBoundingSphere();
}

const wingMat = () => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap(), side: THREE.DoubleSide });
const WING_BASE = new THREE.Color("#eef1f6");

export const WingSurface: React.FC<{ p: WingP; stress?: number; color?: THREE.Color }> = ({ p, stress = 0, color = WING_BASE }) => {
  const geo = useMemo(() => wingGeo(p.segments), [p.segments]);
  const mat = useMemo(wingMat, []);
  fillWing(geo, p, stress, color);
  return <mesh geometry={geo} material={mat} />;
};

// ---------- engine ----------
const nacelleGeo = (() => {
  const pts = [[0.02, -3.3], [0.45, -2.95], [0.78, -2.35], [0.88, -2.3], [1.2, -1.35], [1.36, 0.1], [1.36, 1.3], [1.3, 2.05], [1.16, 2.38], [1.0, 2.3], [0.97, 1.95]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, 32);
  g.rotateZ(-Math.PI / 2);
  return g;
})();
const fanTex = () => ctex("fanTex", 512, 512, (g) => {
  g.fillStyle = "#1c2130"; g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    g.save(); g.translate(256, 256); g.rotate(a);
    g.fillStyle = i % 2 ? "#7d8698" : "#6c7486";
    g.beginPath(); g.moveTo(40, -8); g.quadraticCurveTo(160, -40, 250, -10); g.lineTo(250, 22); g.quadraticCurveTo(150, 8, 40, 14); g.closePath(); g.fill();
    g.restore();
  }
  g.fillStyle = "#e9edf3"; g.beginPath(); g.arc(256, 256, 62, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#141824"; g.lineWidth = 12; g.beginPath(); // spinner spiral makes the rotation readable
  for (let k = 0; k <= 40; k++) { const a = k * 0.16, r = 4 + k * 1.4; const x = 256 + Math.cos(a) * r, y = 256 + Math.sin(a) * r; k ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
});
const pylonGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(2.2, -0.75); s.lineTo(-1.8, -0.75); s.lineTo(-3.6, 0.3); s.lineTo(0.4, 0.3); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.38, bevelEnabled: false }); g.translate(0, 0, -0.19); return g;
})();

/** Nacelle + pylon in the local frame of the wing section it hangs from (origin = wing underside near the LE). */
export const Engine: React.FC<{ t: number; shake?: number }> = ({ t, shake = 0 }) => {
  const tex = useMemo(fanTex, []);
  return <group position={[0, shake * Math.sin(t * 31) * 0.04, 0]}>
    <mesh geometry={pylonGeo} material={toon("#d5dbe5")} />
    <group position={[1.3, -1.95, 0]}>
      <mesh geometry={nacelleGeo}><meshToonMaterial color="#e3e8f0" gradientMap={gradientMap()} side={THREE.DoubleSide} /></mesh>
      <mesh position={[2.28, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[1.08, 0.12, 8, 32]} /><primitive object={toon("#aeb6c4")} attach="material" /></mesh>
      <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.375, 1.375, 0.5, 32, 1, true]} /><meshToonMaterial color="#1b3a73" gradientMap={gradientMap()} side={THREE.DoubleSide} /></mesh>
      <mesh position={[1.96, 0, 0]} rotation={[t * 7, Math.PI / 2, 0]}><circleGeometry args={[0.99, 40]} /><meshBasicMaterial map={tex} /></mesh>
    </group>
  </group>;
};

/** Engine attached to a (bending) wing at span fraction s: follows the section height and slope. */
export const EngineOnWing: React.FC<{ p: WingP; s?: number; t: number; shake?: number }> = ({ p, s = 0.3, t, shake }) => {
  const st = station(p, s);
  return <group position={[st.xLE + 0.4, st.y - st.th * 0.32, st.z]} rotation={[-p.side * Math.atan(st.slope), 0, 0]}>
    <Engine t={t} shake={shake} />
  </group>;
};

const wingletGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(0.3, 0); s.lineTo(-2.1, 0); s.lineTo(-2.7, 2.3); s.lineTo(-1.9, 2.3); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false }); g.translate(0, 0, -0.07); return g;
})();
export const Winglet: React.FC<{ p: WingP }> = ({ p }) => {
  const st = station(p, 1);
  return <group position={[st.xLE, st.y, st.z]} rotation={[-p.side * Math.atan(st.slope) + p.side * 0.28, 0, 0]}>
    <mesh geometry={wingletGeo} material={toon("#1b3a73", { side: THREE.DoubleSide })} />
  </group>;
};

// ---------- surface detail: flap hinge / spar lines that follow the bending wing ----------
const surfPt = (p: WingP, s: number, u: number): [number, number, number] => {
  const st = station(p, s), cs = 1 / Math.sqrt(1 + st.slope * st.slope), sn = st.slope * cs;
  const dy = tn(u) * st.th * 0.5 + st.th * 0.1 * Math.sin(Math.PI * u) + 0.03;
  return [st.xLE - u * st.chord, st.y + dy * cs, st.z - p.side * dy * sn];
};
const LINE_MAT = new THREE.MeshBasicMaterial({ color: "#8f9ab0" });
const Seg: React.FC<{ a: [number, number, number]; b: [number, number, number]; r?: number }> = ({ a, b, r = 0.035 }) => {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return <mesh position={va.clone().add(vb).multiplyScalar(0.5)} quaternion={q} material={LINE_MAT}><cylinderGeometry args={[r, r, va.distanceTo(vb), 5]} /></mesh>;
};
export const WingLines: React.FC<{ p: WingP }> = ({ p }) => {
  const runs: [number, number, number][] = [[0.76, 0.06, 0.74], [0.8, 0.77, 0.97], [0.12, 0.05, 0.96]];
  const segs: React.ReactNode[] = [];
  runs.forEach(([u, s0, s1], r) => { for (let i = 0; i < 8; i++) { const sa = s0 + ((s1 - s0) * i) / 8, sb = s0 + ((s1 - s0) * (i + 1)) / 8; segs.push(<Seg key={`${r}-${i}`} a={surfPt(p, sa, u)} b={surfPt(p, sb, u)} />); } });
  for (const s of [0.4, 0.75]) segs.push(<Seg key={`c${s}`} a={surfPt(p, s, 0.76)} b={surfPt(p, s, 0.99)} />);
  return <group>{segs}</group>;
};

/** Complete main wing: surface, winglet, engine. */
export const MainWing: React.FC<{ side: 1 | -1; flex: number; stress?: number; t: number; engine?: boolean; shake?: number }> = ({ side, flex, stress = 0, t, engine = true, shake }) => {
  const p = mainWing(side, flex);
  return <group>
    <WingSurface p={p} stress={stress} />
    {stress < 0.2 && <WingLines p={p} />}
    <Winglet p={p} />
    {engine && <EngineOnWing p={p} t={t} shake={shake} />}
  </group>;
};

// ---------- fuselage & tail ----------
const finShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(-9, 1.8); s.lineTo(-16.5, 1.8); s.lineTo(-21.6, 9.6); s.lineTo(-19, 10.2); s.lineTo(-13.5, 4.8); s.closePath(); return s;
})();
const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.55, bevelEnabled: false });
const windowsX = Array.from({ length: 22 }, (_, i) => -8 + i * 1.0);

/** Small flat panel lying on the fuselage surface (cockpit glazing). */
const NosePane: React.FC<{ x: number; th: number; w: number; h: number }> = ({ x, th, w, h }) => {
  const a = x - (PL.L / 2 - 7.5); const k = a / 7.5;
  const r = PL.R * Math.sqrt(Math.max(0, 1 - k * k * 0.985)) + 0.03;
  const slope = Math.atan((PL.R * 0.985 * k) / (7.5 * Math.sqrt(Math.max(0.05, 1 - k * k * 0.985)))); // nose curvature
  return <group rotation={[th, 0, 0]}>
    <mesh position={[x, r, 0]} rotation={[0, 0, -slope]}><boxGeometry args={[w, 0.06, h]} /><meshBasicMaterial color="#1a2748" /></mesh>
  </group>;
};

export const Fuselage: React.FC = () => {
  const body = useMemo(() => fuselageGeometry(0), []);
  return <group>
    <mesh geometry={body}><meshToonMaterial vertexColors gradientMap={gradientMap()} /></mesh>
    <mesh geometry={finGeo} position={[0, PL.R * 0.2, -0.28]} material={toon("#1b3a73")} />
    {[0.34, -0.34].map((dz, i) => <mesh key={i} position={[-16.8, 6.4, dz]} rotation={[0, i ? Math.PI : 0, 0]}><circleGeometry args={[1.1, 24]} /><meshBasicMaterial color="#ff8a2a" /></mesh>)}
    {([1, -1] as const).map((sd) => <group key={sd}>
      <mesh position={[3.6, -0.32, sd * 2.6]}><boxGeometry args={[21, 0.3, 0.14]} /><meshBasicMaterial color="#ff8a2a" /></mesh>
      <mesh position={[3.6, -0.62, sd * 2.55]}><boxGeometry args={[21, 0.16, 0.14]} /><meshBasicMaterial color="#1b3a73" /></mesh>
      {windowsX.map((x, i) => <mesh key={i} position={[x, 0.55, sd * 2.645]} rotation={[0, sd === 1 ? 0 : Math.PI, 0]} scale={[0.8, 1.15, 1]}><circleGeometry args={[0.3, 16]} /><meshBasicMaterial color="#27406f" /></mesh>)}
      <mesh position={[13.2, 0.1, sd * 2.66]} rotation={[0, sd === 1 ? 0 : Math.PI, 0]}><planeGeometry args={[0.9, 1.8]} /><meshBasicMaterial color="#c9d1df" /></mesh>
    </group>)}
    {[-0.62, -0.2, 0.2, 0.62].map((th, i) => <NosePane key={i} x={18.6} th={th} w={0.75} h={0.62} />)}
    <mesh position={[0.2, -2.05, 0]} scale={[7.2, 1.0, 2.25]}><sphereGeometry args={[1, 24, 12]} /><meshToonMaterial color="#c3cbda" gradientMap={gradientMap()} /></mesh>
    {([1, -1] as const).map((sd) => <WingSurface key={sd} p={{ ...TAIL, side: sd, flex: 0 }} />)}
  </group>;
};

/** Jagged stump left at the root after a (hypothetical) separation. */
export const Stump: React.FC = () => {
  const p = { ...mainWing(-1, 0), span: 1.6, tipChord: 8.8, sweep: 0.8, tipThick: 1.15, segments: 3 };
  return <group>
    <WingSurface p={p} />
    {Array.from({ length: 12 }, (_, i) => { const r = rng(40 + i); return <mesh key={i} position={[4.3 - r() * 8.6, -1.0 + (r() - 0.5) * 1.0, -3.45 - r() * 0.35]} rotation={[r() * 2, r() * 2, r() * 2]}><boxGeometry args={[0.5 + r() * 0.8, 0.2, 0.4]} /><meshBasicMaterial color={i % 3 ? "#3a3f52" : "#ff8a1f"} /></mesh>; })}
  </group>;
};

/** Crack lines spreading along the left wing root (0..1). */
export const Cracks: React.FC<{ k: number }> = ({ k }) => {
  if (k <= 0) return null;
  const p = mainWing(-1, 0);
  return <group>{Array.from({ length: 9 }, (_, i) => {
    const r = rng(77 + i), s = 0.08 + r() * 0.06, st = station(p, s), u = 0.1 + (i / 9) * 0.8;
    const len = 0.9 * Math.min(1, k * 1.6 - i * 0.08);
    if (len <= 0) return null;
    return <mesh key={i} position={[st.xLE - u * st.chord, st.y + st.th * 0.5 * tn(u) + 0.04, st.z]} rotation={[0, (r() - 0.5) * 1.2, 0]}>
      <boxGeometry args={[0.07, 0.04, len]} /><meshBasicMaterial color="#120d1d" />
    </mesh>;
  })}</group>;
};

export type PlaneState = { flexL?: number; flexR?: number; stressL?: number; stressR?: number; leftOff?: boolean; cracks?: number; body?: boolean; engines?: boolean; shake?: number; leftWing?: boolean };
export const Airliner: React.FC<PlaneState & { t: number }> = ({ t, flexL = 1, flexR = 1, stressL = 0, stressR = 0, leftOff = false, cracks = 0, body = true, engines = true, shake = 0, leftWing = true }) => (
  <group>
    {body && <Fuselage />}
    <MainWing side={1} flex={flexR} stress={stressR} t={t} engine={engines} shake={shake} />
    {leftWing && !leftOff && <MainWing side={-1} flex={flexL} stress={stressL} t={t} engine={engines} shake={shake} />}
    {leftOff && body && <Stump />}
    {!leftOff && <Cracks k={cracks} />}
  </group>
);
