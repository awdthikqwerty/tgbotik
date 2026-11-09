import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { W, H, clamp, lerp, mix3, noise, rng } from "./lib";
import { personTexture, CARD_ASPECT, PersonSpec, Expr, Pose } from "./characters";
import { fuselageGeometry, makeWingGeometry, fillWing, WING, WingParams, toon, inkMat, makeCloudGeometry, PL } from "./toon";

export type Vec3 = [number, number, number];
export type CamState = { pos: Vec3; look: Vec3; fov?: number; roll?: number; shake?: number; seed?: number; t?: number };

const SUB_SHIFT = 150; // image content moves up so the subtitle band stays clear of the subject

/** Drives the R3F camera from a pure state object every render. */
export const Cam: React.FC<CamState> = ({ pos, look, fov = 50, roll = 0, shake = 0, seed = 0, t = 0 }) => {
  const { camera } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const s = shake;
    const sx = s * (noise(t * 9, seed) * 0.06 + noise(t * 23, seed + 1) * 0.03);
    const sy = s * (noise(t * 8, seed + 2) * 0.06 + noise(t * 27, seed + 3) * 0.03);
    cam.position.set(pos[0] + sx, pos[1] + sy, pos[2]);
    cam.up.set(0, 1, 0);
    cam.lookAt(look[0], look[1], look[2]);
    const r = roll + s * noise(t * 7, seed + 5) * 0.012;
    if (r) cam.rotateZ(r);
    cam.fov = fov; cam.aspect = W / H;
    cam.setViewOffset(W, H, 0, SUB_SHIFT, W, H);
    cam.updateProjectionMatrix();
  });
  return null;
};

// ---------- sky ----------
export type SkyPalette = { top: string; mid: string; horizon: string; below?: string };
export const SKY_DAY: SkyPalette = { top: "#2b6ee0", mid: "#6fb4ff", horizon: "#ffe2c4", below: "#cfe3ff" };
export const SKY_GOLD: SkyPalette = { top: "#3a52b8", mid: "#ff9c7a", horizon: "#ffd9a0", below: "#f7c9b0" };
export const SKY_DUSK: SkyPalette = { top: "#10142e", mid: "#3a3f6a", horizon: "#b8654e", below: "#2a2440" };
export const SKY_STORM: SkyPalette = { top: "#1c2238", mid: "#4a5778", horizon: "#9aa3b8", below: "#505a74" };
export const Sky: React.FC<{ p: SkyPalette; radius?: number }> = ({ p, radius = 3000 }) => {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(radius, 32, 20);
    const pos = g.attributes.position; const col = new Float32Array(pos.count * 3);
    const top = new THREE.Color(p.top), mid = new THREE.Color(p.mid), hor = new THREE.Color(p.horizon), below = new THREE.Color(p.below ?? p.horizon); const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / radius;
      if (y >= 0) { const k = Math.pow(y, 0.55); c.copy(hor).lerp(mid, Math.min(1, k * 1.8)).lerp(top, Math.max(0, (k - 0.45) / 0.55)); }
      else c.copy(hor).lerp(below, Math.min(1, -y * 3));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [p.top, p.mid, p.horizon, p.below, radius]);
  return <mesh geometry={geo}><meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>;
};

// ---------- clouds ----------
const cloudGeos: THREE.BufferGeometry[] = [];
const cloudGeo = (i: number) => (cloudGeos[i] ??= makeCloudGeometry(100 + i * 17));
export const CloudField: React.FC<{ t: number; speed?: number; y?: number; count?: number; range?: number; seed?: number; tint?: string; scale?: number; ySpread?: number; zMin?: number; zMax?: number }> = ({
  t, speed = 70, y = -90, count = 60, range = 900, seed = 1, tint = "#ffffff", scale = 1, ySpread = 18, zMin = -500, zMax = 500,
}) => {
  const items = useMemo(() => { const r = rng(seed); return Array.from({ length: count }, () => ({ x: r() * range, z: zMin + r() * (zMax - zMin), y: y + (r() - 0.5) * ySpread, s: (9 + r() * 14) * scale, v: Math.floor(r() * 6), ry: r() * Math.PI })); }, [seed, count, range, y, scale, ySpread, zMin, zMax]);
  const mat = useMemo(() => toon("#ffffff", { vertexColors: true, color: tint } as any), [tint]);
  return <group>{items.map((it, i) => {
    const x = (((it.x - speed * t) % range) + range) % range - range / 2;
    return <mesh key={i} geometry={cloudGeo(it.v)} material={mat} position={[x, it.y, it.z]} scale={[it.s, it.s * 0.9, it.s]} rotation={[0, it.ry, 0]} />;
  })}</group>;
};

// ---------- cards (flat ink characters) ----------
export const Card: React.FC<{ person: PersonSpec; expr?: Expr; pose?: Pose; yaw?: number; height?: number; position: Vec3; rotY?: number; rotZ?: number; tint?: string; flip?: boolean }> = ({
  person, expr, pose = "rest", yaw = 0, height = 1.9, position, rotY = 0, rotZ = 0, tint = "#ffffff", flip = false,
}) => {
  const tex = personTexture(person, expr, pose, yaw);
  return <mesh position={position} rotation={[0, rotY, rotZ]} scale={[flip ? -1 : 1, 1, 1]}>
    <planeGeometry args={[height * CARD_ASPECT, height]} />
    <meshBasicMaterial map={tex} transparent alphaTest={0.03} color={tint} toneMapped={false} side={THREE.DoubleSide} />
  </mesh>;
};

// ---------- wing ----------
export const WingMesh: React.FC<{ params?: Partial<WingParams>; flex: number; stress?: number; holo?: boolean; ink?: boolean; color?: [number, number, number] }> = ({ params, flex, stress = 0, holo = false, ink = true, color }) => {
  const p = useMemo(() => ({ ...WING, ...params }), [params]);
  const geo = useMemo(() => makeWingGeometry(p.segments ?? 22), [p.segments]);
  const hull = useMemo(() => makeWingGeometry(p.segments ?? 22), [p.segments]);
  fillWing(geo, { ...p, flex, stress }, color);
  fillWing(hull, { ...p, flex, inflate: 0.12 }, color);
  return <group>
    {holo ? <>
      <mesh geometry={geo}><meshBasicMaterial color="#35d0ff" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={geo}><meshBasicMaterial color="#9cf0ff" wireframe transparent opacity={0.8} /></mesh>
    </> : <>
      <mesh geometry={geo}><meshToonMaterial vertexColors gradientMap={toon("#fff").gradientMap} /></mesh>
      {ink && <mesh geometry={hull} material={inkMat} />}
    </>}
  </group>;
};

// ---------- airplane ----------
const finShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(-9, 1.8); s.lineTo(-16.5, 1.8); s.lineTo(-21.6, 9.6); s.lineTo(-19, 10.2); s.lineTo(-13.5, 4.8); s.closePath(); return s;
})();
export const Plane: React.FC<{ flexL?: number; flexR?: number; hideLeft?: boolean; holo?: boolean; stressL?: number; stressR?: number; showStump?: boolean }> = ({
  flexL = 0, flexR = 0, hideLeft = false, holo = false, stressL = 0, stressR = 0, showStump = true,
}) => {
  const body = useMemo(() => fuselageGeometry(0), []);
  const bodyHull = useMemo(() => fuselageGeometry(0.14), []);
  const fin = useMemo(() => new THREE.ExtrudeGeometry(finShape, { depth: 0.55, bevelEnabled: false }), []);
  const finHull = useMemo(() => new THREE.ExtrudeGeometry(finShape, { depth: 0.55 + 0.3, bevelEnabled: false }), []);
  const windows = useMemo(() => Array.from({ length: 19 }, (_, i) => -10 + i * 1.5), []);
  const M = (c: string) => (holo ? <meshBasicMaterial color="#35d0ff" transparent opacity={0.25} depthWrite={false} /> : <primitive object={toon(c)} attach="material" />);
  const engineY = (flex: number) => -2.35 + flex * 0.035;
  const engine = (side: 1 | -1, flex: number) => (
    <group position={[5.2, engineY(flex), side * 7.3]}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.35, 1.35, 4.8, 24]} />{M("#c9d1df")}</mesh>
      {!holo && <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.47, 1.47, 4.92, 24]} /><meshBasicMaterial color="#17122b" side={THREE.BackSide} /></mesh>}
      <mesh position={[2.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[1.28, 0.3, 10, 24]} />{M("#ff8a2a")}</mesh>
      {!holo && <mesh position={[2.45, 0, 0]} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[1.05, 20]} /><meshBasicMaterial color="#1a1f33" /></mesh>}
      {!holo && <mesh position={[2.55, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.45, 0.9, 12]} /><meshBasicMaterial color="#8892a8" /></mesh>}
      <mesh position={[0.4, 1.35, 0]}><boxGeometry args={[2.6, 1.1, 0.5]} />{M("#aeb8cc")}</mesh>
    </group>
  );
  return <group>
    {holo ? <>
      <mesh geometry={body}><meshBasicMaterial color="#35d0ff" transparent opacity={0.18} depthWrite={false} /></mesh>
      <mesh geometry={body}><meshBasicMaterial color="#9cf0ff" wireframe transparent opacity={0.45} /></mesh>
    </> : <>
      <mesh geometry={body}><meshToonMaterial vertexColors gradientMap={toon("#fff").gradientMap} /></mesh>
      <mesh geometry={bodyHull} material={inkMat} />
    </>}
    <mesh geometry={fin} position={[0, PL.R * 0.2, -0.28]}>{M("#1b3a73")}</mesh>
    {!holo && <mesh geometry={finHull} position={[0, PL.R * 0.2, -0.43]} material={inkMat} />}
    {!holo && <mesh position={[-16.8, 6.4, 0.34]}><circleGeometry args={[1.1, 20]} /><meshBasicMaterial color="#ff8a2a" /></mesh>}
    {!holo && <mesh position={[-16.8, 6.4, -0.34]} rotation={[0, Math.PI, 0]}><circleGeometry args={[1.1, 20]} /><meshBasicMaterial color="#ff8a2a" /></mesh>}
    {!holo && ([1, -1] as const).map((sd) => (
      <group key={sd}>
        <mesh position={[4, -0.3, sd * 2.52]}><boxGeometry args={[24, 0.32, 0.12]} /><meshBasicMaterial color="#ff8a2a" /></mesh>
        {windows.map((x, i) => <mesh key={i} position={[x, 0.55, sd * 2.64]} rotation={[0, sd === 1 ? 0 : Math.PI, 0]} scale={[1, 1.3, 1]}><circleGeometry args={[0.3, 14]} /><meshBasicMaterial color="#27406f" /></mesh>)}
        <mesh position={[18.3, 0.9, sd * 2.0]} rotation={[0, sd === 1 ? 0.55 : Math.PI - 0.55, 0]}><planeGeometry args={[2.4, 0.9]} /><meshBasicMaterial color="#1c2c52" side={THREE.DoubleSide} /></mesh>
      </group>
    ))}
    {/* tailplanes */}
    <WingMesh params={{ side: 1, span: 7.5, rootChord: 5.2, tipChord: 1.8, sweep: 4.5, x0: -15.5, y0: 0.5, z0: 0.9, rootThick: 0.5, tipThick: 0.18, dihedral: 0.05, segments: 6 }} flex={0} holo={holo} />
    <WingMesh params={{ side: -1, span: 7.5, rootChord: 5.2, tipChord: 1.8, sweep: 4.5, x0: -15.5, y0: 0.5, z0: 0.9, rootThick: 0.5, tipThick: 0.18, dihedral: 0.05, segments: 6 }} flex={0} holo={holo} />
    <WingMesh params={{ side: 1 }} flex={flexR} stress={stressR} holo={holo} />
    {!hideLeft && <WingMesh params={{ side: -1 }} flex={flexL} stress={stressL} holo={holo} />}
    {hideLeft && showStump && <group>
      <WingMesh params={{ side: -1, span: 2.2, tipChord: 8.2, tipThick: 1.0, sweep: 0.8 }} flex={0} holo={holo} />
      {!holo && Array.from({ length: 9 }, (_, i) => { const r = rng(40 + i); return <mesh key={i} position={[4.5 - r() * 9, -1.0 + (r() - 0.5) * 1.1, -4.0 - r() * 0.5]} rotation={[r() * 2, r() * 2, r() * 2]}><boxGeometry args={[0.7 + r() * 0.9, 0.25, 0.5]} /><meshBasicMaterial color={i % 2 ? "#ff8a1f" : "#4a4f63"} /></mesh>; })}
    </group>}
    {!hideLeft && engine(-1, flexL)}
    {engine(1, flexR)}
  </group>;
};

/** Cylinder between two points (cables, arrows). */
export const Beam: React.FC<{ a: Vec3; b: Vec3; r?: number; color?: string; basic?: boolean; opacity?: number }> = ({ a, b, r = 0.08, color = "#ffd84a", basic = true, opacity = 1 }) => {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb); const mid = va.clone().add(vb).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  return <mesh position={mid} quaternion={q}><cylinderGeometry args={[r, r, Math.max(0.001, len), 8]} />
    {basic ? <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} /> : <primitive object={toon(color)} attach="material" />}
  </mesh>;
};
export const Arrow: React.FC<{ base: Vec3; dir?: Vec3; length: number; color?: string; width?: number; opacity?: number }> = ({ base, dir = [0, 1, 0], length, color = "#6dff9a", width = 0.22, opacity = 1 }) => {
  if (length < 0.05) return null;
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  const head = Math.min(length * 0.4, width * 6);
  return <group position={base} quaternion={q}>
    <mesh position={[0, (length - head) / 2, 0]}><cylinderGeometry args={[width, width, length - head, 10]} /><meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} /></mesh>
    <mesh position={[0, length - head / 2, 0]}><coneGeometry args={[width * 2.4, head, 12]} /><meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} /></mesh>
  </group>;
};

export const Lights: React.FC<{ sun?: string; sunI?: number; sky?: string; ground?: string; hemiI?: number; sunPos?: Vec3 }> = ({ sun = "#fff1d6", sunI = 2.4, sky = "#b8d4ff", ground = "#8a94b8", hemiI = 1.3, sunPos = [-30, 60, 40] }) => (
  <>
    <hemisphereLight args={[sky, ground, hemiI]} />
    <directionalLight position={sunPos} intensity={sunI} color={sun} />
  </>
);
export { clamp, lerp, mix3 };
