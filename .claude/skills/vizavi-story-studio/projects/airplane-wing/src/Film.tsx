import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { W, H, FPS, EV, TOTAL_FRAMES, timingData, shotAt, clamp, lerp, smooth, easeOut, easeInOut, noise, prog, rng } from "./lib";
import { loadFonts } from "./fonts";
import { CAST, MAX, MAX_EXPR } from "./characters";
import { Cam, Sky, CloudField, Card, WingMesh, Plane, Beam, Arrow, Lights, SKY_DAY, SKY_GOLD, SKY_STORM, SKY_DUSK, type CamState, type Vec3, type SkyPalette } from "./parts";

const RIG_SKY: SkyPalette = { top: "#aab6cc", mid: "#cfd8e6", horizon: "#eef1f6", below: "#c9ced8" };
const TECH_BG = "#07142b";

type PlaneState = { flexL?: number; flexR?: number; roll?: number; pitch?: number; yaw?: number; pos?: Vec3; hideLeft?: boolean; holo?: boolean; stressL?: number; stressR?: number };
type Cfg = { cam: CamState; sky: SkyPalette; plane?: PlaneState; speed?: number; extra?: React.ReactNode; set: string; cloudY?: number };

const wob = (t: number, a: number, f = 1, seed = 0) => a * noise(t * f, seed);
const dolly = (a: Vec3, b: Vec3, u: number): Vec3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];

// ---------- cabin ----------
const windowShape = (cx: number, cy: number, w: number, h: number, r: number) => {
  const s = new THREE.Path();
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r);
  s.quadraticCurveTo(x1, y1, x1 - r, y1); s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
};
const CabinWall: React.FC<{ win: [number, number, number, number] }> = ({ win }) => {
  const geo = useMemo(() => {
    const sh = new THREE.Shape(); sh.moveTo(-6, -9); sh.lineTo(6, -9); sh.lineTo(6, 9); sh.lineTo(-6, 9); sh.closePath();
    sh.holes.push(windowShape(win[0], win[1], win[2], win[3], 0.35));
    return new THREE.ShapeGeometry(sh);
  }, [win[0], win[1], win[2], win[3]]);
  const ring = useMemo(() => {
    const sh = new THREE.Shape(windowShape(win[0], win[1], win[2] + 0.34, win[3] + 0.34, 0.5).getPoints(24));
    sh.holes.push(windowShape(win[0], win[1], win[2], win[3], 0.35));
    return new THREE.ShapeGeometry(sh);
  }, [win[0], win[1], win[2], win[3]]);
  return <group>
    <mesh geometry={geo}><meshBasicMaterial color="#e9e2d3" /></mesh>
    <mesh geometry={ring} position={[0, 0, 0.01]}><meshBasicMaterial color="#c2c8d6" /></mesh>
    <mesh position={[0, 3.2, 0.02]}><planeGeometry args={[12, 0.5]} /><meshBasicMaterial color="#cfc6b4" /></mesh>
    <mesh position={[0, -1.6, 0.02]}><planeGeometry args={[12, 0.14]} /><meshBasicMaterial color="#9aa3b8" /></mesh>
  </group>;
};

const PAX: { k: string; x: number; y: number; h: number }[] = [
  { k: "anna", x: -1.55, y: -1.9, h: 2.2 }, { k: "ivan", x: 1.7, y: -2.0, h: 2.3 },
];

const Cabin: React.FC<{ cam: CamState; t: number; tl: number; set: string; expr: string; shake: number; blur?: number; paxScare: number; zoom?: number; maxX?: number }> = ({ cam, t, tl, expr, shake, paxScare, maxX = -0.75 }) => {
  const q = useMemo(() => {
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...cam.pos), new THREE.Vector3(...cam.look), new THREE.Vector3(0, 1, 0));
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [cam.pos.join(), cam.look.join()]);
  const sx = shake * (noise(t * 11, 3) * 0.05 + noise(t * 29, 4) * 0.02);
  const sy = shake * (noise(t * 10, 5) * 0.05 + noise(t * 31, 6) * 0.02);
  const me = MAX_EXPR[expr] ?? MAX_EXPR.calm;
  const wobble = shake * noise(t * 13, 8) * 0.04;
  return <group position={cam.pos} quaternion={q}>
    <group position={[sx, sy, 0]} rotation={[0, 0, wobble]}>
      <group position={[0, 0, -5]}><CabinWall win={[0.35, 0.8, 2.1, 2.9]} /></group>
      <mesh position={[maxX - 0.1, -1.4, -4.9]}><planeGeometry args={[1.9, 3.4]} /><meshBasicMaterial color="#2b4f9a" /></mesh>
      <Card person={MAX} expr={me.ex} pose={me.pose} yaw={0.5} height={2.6} position={[maxX, -1.25 + noise(t * 2, 1) * 0.01 + shake * noise(t * 17, 2) * 0.04, -4.6]} flip />
      {PAX.map((p, i) => (
        <group key={p.k} position={[0, 0, -3.1]}>
          <mesh position={[p.x, p.y - 0.6, -0.02]}><planeGeometry args={[1.5, 2.2]} /><meshBasicMaterial color="#2b4f9a" /></mesh>
          <Card person={CAST[p.k]} expr={paxScare > 0.4 ? MAX_EXPR.scared.ex : MAX_EXPR.calm.ex} pose={paxScare > 0.4 ? "grip" : "rest"} yaw={0} height={p.h}
            position={[p.x + paxScare * noise(t * 19, i + 9) * 0.05, p.y + paxScare * noise(t * 23, i + 2) * 0.06, 0]} flip={i === 1} />
        </group>
      ))}
    </group>
  </group>;
};

// ---------- shot configuration ----------
function cfgFor(id: string, t: number, tl: number, u: number): Cfg {
  const calm = Math.sin(t * 0.9) * 0.5 + 0.5;
  switch (id) {
    case "s1a": return { set: "exterior", sky: SKY_DAY, cam: { pos: dolly([46, 9, 50], [40, 9, 46], u), look: [0, 0, 0], fov: 46 }, plane: { flexR: 0.8 + calm * 0.6, flexL: 0.8 + calm * 0.6, pitch: 0.02 }, speed: 70 };
    case "s1b": return { set: "cabin", sky: SKY_DAY, cam: { pos: [3.2, 0.5, 1.3], look: [-0.2, -0.1, 8], fov: 52 }, plane: { flexR: 1 + calm * 0.5, hideLeft: true, pitch: 0.02 }, speed: 60 };
    case "s1c": return { set: "cabin", sky: SKY_DAY, cam: { pos: dolly([3.2, 0.5, 1.3], [3.3, 0.55, 2.0], easeOut(u)), look: [-0.2, -0.1, 8], fov: 52 - u * 6 }, plane: { flexR: 1.2 + wob(t, 0.3, 6), hideLeft: true }, speed: 60 };
    case "s2a": return { set: "cabin", sky: SKY_STORM, cam: { pos: [3.2, 0.5, 1.3], look: [-0.2, -0.1, 8], fov: 52 }, plane: { flexR: 2 + wob(t, 1.2, 4), hideLeft: true, roll: wob(t, 0.05, 3) }, speed: 90 };
    case "s2b": return { set: "cabin", sky: SKY_STORM, cam: { pos: dolly([3.4, 0.6, 1.5], [3.0, 0.4, 1.2], u), look: [-0.9, -0.5, 8], fov: 48 }, plane: { flexR: 2.5 + u * 3 + wob(t, 0.5, 5), hideLeft: true, roll: wob(t, 0.04, 3) }, speed: 90 };
    case "s2c": return { set: "cabin", sky: SKY_STORM, cam: { pos: [3.2, 0.5, 1.3], look: [-0.2, -0.1, 8], fov: 40 }, plane: { flexR: 4 + wob(t, 0.8, 5), hideLeft: true }, speed: 90 };
    case "s2d": return { set: "exterior", sky: SKY_STORM, cam: { pos: dolly([8, 6, 38], [4, 9, 34], u), look: [-2, 1, 10], fov: 48, shake: 0.6, seed: 2, t }, plane: { flexR: 4 + u * 2.5 + wob(t, 1, 5), flexL: 4 + u * 2.5, roll: wob(t, 0.05, 3), stressR: u * 0.4, stressL: u * 0.4 }, speed: 110 };
    case "s3a": return { set: "hypo", sky: SKY_DUSK, cam: { pos: [Math.cos(0.5 + u * 1.3) * 24, 7, -Math.sin(0.5 + u * 1.3) * 24 - 3], look: [2, -1, -6], fov: 44 }, plane: { flexL: 3 + u * 5, flexR: 3 + u * 2, stressL: 0.2 + u * 0.8 }, speed: 50 };
    case "s3b": {
      const br = clamp((t - EV.wingBreak) / 3);
      return { set: "hypo", sky: SKY_DUSK, cam: { pos: [Math.cos(1.2 + u * 1.8) * 26, 5, -Math.sin(1.2 + u * 1.8) * 26 - 2], look: [2, 0, -6 - br * 8], fov: 46 - br * 4, shake: 1, seed: 7, t }, plane: { flexL: 8, flexR: 3, stressL: 1, hideLeft: t >= EV.wingBreak, roll: -br * 0.25 }, speed: 50 };
    }
    case "s4a": return { set: "tech", sky: SKY_DUSK, cam: { pos: dolly([-18, 22, 36], [-8, 16, 40], u), look: [0, 0, 0], fov: 46 }, plane: { holo: true } };
    case "s4b": return { set: "tech", sky: SKY_DUSK, cam: { pos: dolly([-8, 16, 40], [6, 20, 36], u), look: [0, 0, 0], fov: 46 }, plane: { holo: true, hideLeft: t > EV.lossOfLift + 1.5 } };
    case "s4c": return { set: "tech", sky: SKY_DUSK, cam: { pos: dolly([6, 20, 36], [26, 14, 30], u), look: [0, 0, 0], fov: 50 }, plane: { holo: true, hideLeft: true, roll: -easeInOut(u) * 0.9 } };
    case "s4e": {
      const f = clamp((t - EV.catastrophe) / 8);
      return { set: "hypo", sky: SKY_STORM, cam: { pos: dolly([60, 14, 70], [80, -10, 60], u), look: [0, -f * 14, 0], fov: 42, shake: 0.5, seed: 5, t }, plane: { hideLeft: true, roll: -0.8 - f * 3.2, pitch: -f * 0.6, pos: [0, -f * 14, 0] }, speed: 120 };
    }
    case "s4f": return { set: "tech", sky: SKY_DUSK, cam: { pos: dolly([26, 14, 30], [-10, 18, 40], u), look: [0, 0, 0], fov: 50 }, plane: { holo: true, hideLeft: true, roll: -0.9 + u * 0.15 } };
    case "s5a": return { set: "rig", sky: RIG_SKY, cam: { pos: dolly([4, 14, 52], [-2, 12, 40], u), look: [0, -3, 8], fov: 50 } };
    case "s5b": {
      const b = easeInOut(prog(t, EV.bendTest, EV.bendTest + 5));
      return { set: "rig", sky: RIG_SKY, cam: { pos: dolly([32, 10, 34], [22, 6, 44], u), look: [0, 0, 9], fov: 46 }, plane: { flexR: b * 4 } };
    }
    case "s5c": {
      const b = easeInOut(prog(t, EV.bendTest, EV.bendTest + 5));
      return { set: "rig", sky: RIG_SKY, cam: { pos: dolly([-4, 5, 14], [-2, 4, 9], u), look: [4, 0, 4], fov: 40 }, plane: { flexR: b * 4, stressR: b } };
    }
    case "s5d": {
      const b = easeInOut(prog(t, EV.bendTest, EV.bendTest + 5));
      return { set: "rig", sky: RIG_SKY, cam: { pos: dolly([-6, 20, 34], [8, 18, 36], u), look: [0, 0, 11], fov: 46 }, plane: { flexR: b * 5, stressR: b } };
    }
    case "s5e": return { set: "rig", sky: RIG_SKY, cam: { pos: dolly([16, 5, 30], [10, 5, 26], u), look: [3, 0, 12], fov: 48 }, plane: { flexR: 5, stressR: 0.8 } };
    case "s6a": return { set: "cabin", sky: SKY_GOLD, cam: { pos: [3.2, 0.5, 1.3], look: [-0.2, -0.1, 8], fov: 52 }, plane: { flexR: 1.4 + calm * 1.2, hideLeft: true }, speed: 50 };
    case "s6b": return { set: "exterior", sky: SKY_GOLD, cam: { pos: dolly([26, 3, 34], [18, 5, 30], u), look: [0, 0, 8], fov: 42 }, plane: { flexR: 1.4 + calm * 1.2, flexL: 1.4 + calm * 1.2 }, speed: 50 };
    case "s6c": return { set: "cabin", sky: SKY_GOLD, cam: { pos: [3.2, 0.5, 1.3], look: [-0.2, -0.1, 8], fov: 42 }, plane: { flexR: 1.2 + calm * 0.8, hideLeft: true }, speed: 50 };
    default: return { set: "exterior", sky: SKY_GOLD, cam: { pos: dolly([22, 4, 34], [70, 24, 120], easeInOut(u)), look: [0, 0, 6], fov: 40 }, plane: { flexR: 1 + calm, flexL: 1 + calm, pitch: 0.03 }, speed: 40 };
  }
}

// ---------- 3D worlds ----------
const Debris: React.FC<{ t: number }> = ({ t }) => {
  const d = t - EV.wingBreak; if (d < 0) return null;
  const items = useMemo(() => Array.from({ length: 26 }, (_, i) => { const r = rng(90 + i); return { v: [-4 + r() * 10, r() * 7 - 3, -8 - r() * 14] as Vec3, rot: [r() * 6, r() * 6, r() * 6] as Vec3, s: 0.3 + r() * 0.9, c: i % 3 ? "#ff8a1f" : "#eef1f8" }; }), []);
  return <>{items.map((p, i) => <mesh key={i} position={[4.5 + p.v[0] * d * 0.5, p.v[1] * d * 0.4 - d * d * 0.5, -4 + p.v[2] * d * 0.5]} rotation={[p.rot[0] * d * 0.6, p.rot[1] * d * 0.6, p.rot[2]]}>
    <boxGeometry args={[p.s, p.s * 0.2, p.s * 0.6]} /><meshBasicMaterial color={p.c} />
  </mesh>)}</>;
};

const Smoke: React.FC<{ t: number }> = ({ t }) => {
  const d = Math.max(0, t - EV.catastrophe);
  return <>{Array.from({ length: 24 }, (_, i) => {
    const age = (d * 0.8 + i * 0.37) % 6;
    return <mesh key={i} position={[-4 - age * 7, 0.5 + age * 0.2 + noise(i, 3), -4.5 + noise(i, 4)]} scale={0.8 + age * 0.7}>
      <icosahedronGeometry args={[1.1, 1]} /><meshBasicMaterial color={i % 3 ? "#3a3f52" : "#ff8a1f"} transparent opacity={clamp(1 - age / 6) * 0.8} />
    </mesh>;
  })}</>;
};

const Rig: React.FC<{ b: number; t: number; scene: string }> = ({ b, t }) => {
  const tipY = -1 + b * 4 + 1.33;
  const loads = Array.from({ length: 8 }, (_, i) => i);
  return <group>
    <mesh position={[0, -14.5, 10]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[160, 160]} /><meshBasicMaterial color="#b9bfca" /></mesh>
    <gridHelper args={[160, 40, "#9aa3b4", "#a8afbd"]} position={[0, -14.45, 10]} />
    <mesh position={[4.5, -1.2, -2.4]}><boxGeometry args={[16, 14, 4.8]} /><meshBasicMaterial color="#4b566d" /></mesh>
    <mesh position={[4.5, -1.2, -0.05]}><boxGeometry args={[14, 11, 0.3]} /><meshBasicMaterial color="#ffb02e" /></mesh>
    <mesh position={[4.5, -9, 10]}><boxGeometry args={[3.2, 10, 3.2]} /><meshBasicMaterial color="#3a4358" /></mesh>
    <mesh position={[-9, 6, 9]}><boxGeometry args={[0.6, 40, 0.6]} /><meshBasicMaterial color="#6a748c" /></mesh>
    <mesh position={[18, 6, 9]}><boxGeometry args={[0.6, 40, 0.6]} /><meshBasicMaterial color="#6a748c" /></mesh>
    <Beam a={[-1.5, -14.4, 21.5]} b={[-1.5, tipY, 21.5]} r={0.35} color="#ffd84a" />
    <Beam a={[-1.5, -14.4, 21.5]} b={[-1.5, Math.min(-6, tipY - 3), 21.5]} r={0.7} color="#5a6580" />
    {loads.map((i) => { const z = 4 + i * 2.1; const s = (z - 1.8) / 19; return <Arrow key={i} base={[-1.2 - s * 3, -1 + b * 4 * s * s + 2.4, z]} length={Math.max(0.01, b * (3.5 - s * 2.2))} color="#ff6a5a" width={0.28} />; })}
    {loads.map((i) => { const z = 3 + i * 2.2; const s = (z - 1.8) / 19; const hot = Math.max(0, Math.sin(t * 6 - i) * 0.5 + 0.5) * b;
      return <mesh key={i} position={[-0.8 - s * 3, -1 + b * 4 * s * s + 1.7 + 0.6 * (1 - s), z]}><sphereGeometry args={[0.32, 10, 10]} /><meshBasicMaterial color={new THREE.Color("#3aff8a").lerp(new THREE.Color("#ff4a4a"), hot)} /></mesh>; })}
    {(["engA", "engB"] as const).map((k, i) => <Card key={k} person={CAST[k]} pose="rest" expr={{ eyes: 1, mouth: "neutral", brow: 0.2 }} height={3.2} position={[14 + i * 3.4, -12.8, 14 - i * 2]} />)}
    <mesh position={[22, -11.5, 12]}><boxGeometry args={[5, 4.4, 3]} /><meshBasicMaterial color="#2a334a" /></mesh>
    <mesh position={[19.4, -11.4, 12]}><planeGeometry args={[0.01, 0.01]} /><meshBasicMaterial color="#000" /></mesh>
  </group>;
};

const TechLift: React.FC<{ t: number }> = ({ t }) => {
  const left = 1 - smooth(EV.lossOfLift, EV.lossOfLift + 2, t);
  const grow = smooth(EV.physicsStart, EV.physicsStart + 1.2, t);
  const zs = [4, 7, 10, 13, 16, 19];
  return <group>
    {zs.map((z) => <Arrow key={"r" + z} base={[5 - (z - 2) * 0.45, 0.5, z]} length={Math.max(0.01, grow * (4.2 - (z - 4) * 0.12))} color="#6dff9a" width={0.4} />)}
    {zs.map((z) => <Arrow key={"l" + z} base={[5 - (z - 2) * 0.45, 0.5, -z]} length={Math.max(0.01, grow * left * (4.2 - (z - 4) * 0.12))} color="#6dff9a" width={0.4} />)}
    <gridHelper args={[160, 32, "#2d6fb3", "#1a3d6e"]} position={[0, -14, 0]} />
  </group>;
};

const World: React.FC<{ cfg: Cfg; t: number; tl: number; frame: number }> = ({ cfg, t, tl, frame }) => {
  const p = cfg.plane ?? {};
  const set = cfg.set;
  const rot: [number, number, number] = [p.roll ?? 0, p.yaw ?? 0, p.pitch ?? 0];
  const lightCfg = set === "rig" ? { sunI: 2.2, sky: "#eef2fa", ground: "#b4bac8" } : set === "tech" ? { sunI: 1.4, sky: "#4a7fd0", ground: "#1a2a50" } : cfg.sky === SKY_STORM ? { sunI: 1.4, sky: "#8a98b8", ground: "#4a5470" } : cfg.sky === SKY_DUSK ? { sunI: 1.8, sky: "#9a8ac0", ground: "#4a3a60", sun: "#ffb27a" } : cfg.sky === SKY_GOLD ? { sunI: 2.6, sun: "#ffd29a" } : {};
  const camShake = cfg.cam.shake ? cfg.cam : { ...cfg.cam, shake: 0 };
  const worldShake: Vec3 = set === "cabin" ? [wob(t, 0.12 * (cfg.sky === SKY_STORM ? 1 : 0.1), 14, 1), wob(t, 0.12 * (cfg.sky === SKY_STORM ? 1 : 0.1), 12, 2), 0] : [0, 0, 0];
  return <>
    {set === "tech" ? <color attach="background" args={[TECH_BG]} /> : <Sky p={cfg.sky} />}
    <Lights {...lightCfg} />
    {set !== "rig" && set !== "tech" && <CloudField t={t} speed={cfg.speed ?? 60} y={set === "hypo" && cfg.sky === SKY_STORM ? -120 : -40} count={set === "cabin" ? 34 : 50} range={700} zMin={-420} zMax={420} tint={cfg.sky === SKY_STORM ? "#b9c2d6" : cfg.sky === SKY_DUSK ? "#c8b4d8" : "#ffffff"} seed={3} />}
    {set === "tech" && <>
      <gridHelper args={[160, 32, "#2d6fb3", "#1a3d6e"]} position={[0, -14, 0]} />
      <group position={[0, 0, 0]} rotation={rot}><Plane holo hideLeft={p.hideLeft} showStump /><TechLift t={t} /></group>
    </>}
    {set === "cabin" && <group position={worldShake}>
      <WingMesh params={{ side: 1 }} flex={p.flexR ?? 1} stress={p.stressR ?? 0} />
    </group>}
    {(set === "exterior" || set === "hypo") && <group position={p.pos ?? [0, 0, 0]} rotation={rot}>
      <Plane flexL={p.flexL} flexR={p.flexR} hideLeft={p.hideLeft} stressL={p.stressL} stressR={p.stressR} />
      {set === "hypo" && cfg.sky === SKY_STORM && <Smoke t={t} />}
    </group>}
    {set === "hypo" && p.hideLeft && cfg.sky === SKY_DUSK && <>
      <group position={[4.5, -1, -4]}><Debris t={t} /></group>
      <group position={[0, 0, 0]}>
        {(() => { const d = Math.max(0, t - EV.wingBreak); return <group position={[-d * 5, -d * d * 1.8, -d * 12]} rotation={[d * 2.2, d * 1.4, d * 0.8]}><WingMesh params={{ side: -1 }} flex={8} stress={1} /></group>; })()}
      </group>
    </>}
    {set === "rig" && <Rig b={Math.min(1, (p.flexR ?? 0) / 4)} t={t} scene="rig" />}
    {set === "rig" && <group position={[0, 0, 0]}><WingMesh params={{ side: 1 }} flex={p.flexR ?? 0} stress={p.stressR ?? 0} /></group>}
    {set === "cabin" ? <>
      <Cam {...camShake} shake={0} />
    </> : <Cam {...camShake} t={t} />}
  </>;
};

// ---------- HTML overlays ----------
const FONT = "Montserrat, sans-serif";
const labels: Record<string, { tag: string; sub?: string; col?: string }> = {
  s1a: { tag: "ВЫСОТА 10 000 м", sub: "обычный рейс" },
  s2d: { tag: "ИЗГИБ КРЫЛА В ПОЛЁТЕ — НОРМА", col: "#6dff9a" },
  s3a: { tag: "ГИПОТЕЗА", sub: "не реальный случай", col: "#ffb340" },
  s3b: { tag: "ГИПОТЕЗА", sub: "катастрофическое разрушение", col: "#ff6a5a" },
  s4a: { tag: "ПОДЪЁМНАЯ СИЛА", sub: "оба крыла", col: "#6dff9a" },
  s4b: { tag: "ЛЕВОЕ КРЫЛО: 0", sub: "подъёмная сила пропала", col: "#ff6a5a" },
  s4c: { tag: "РЕЗКИЙ КРЕН", col: "#ff6a5a" },
  s4e: { tag: "ГИПОТЕТИЧЕСКИЙ СЦЕНАРИЙ", col: "#ffb340" },
  s4f: { tag: "НЕ СЛЕДСТВИЕ ОБЫЧНОЙ ТУРБУЛЕНТНОСТИ", col: "#ffb340" },
  s5a: { tag: "ИСПЫТАНИЕ НА ПРОЧНОСТЬ", sub: "инженерный стенд", col: "#35d0ff" },
  s5b: { tag: "ИЗГИБ ПОД НАГРУЗКОЙ", col: "#35d0ff" },
  s5c: { tag: "КОРЕНЬ КРЫЛА", col: "#35d0ff" },
  s5d: { tag: "НАГРУЗКА ПО РАЗМАХУ", col: "#35d0ff" },
  s5e: { tag: "ДАТЧИКИ НАГРУЗКИ", col: "#35d0ff" },
};

const Tag: React.FC<{ tag: string; sub?: string; col?: string; f: number }> = ({ tag, sub, col = "#ffffff", f }) => {
  const a = easeOut(f / 8);
  return <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: a, transform: `translateY(${(1 - a) * -30}px)`, fontFamily: FONT }}>
    <div style={{ background: "rgba(8,12,28,0.78)", border: `4px solid ${col}`, borderRadius: 18, padding: "16px 34px", color: col, fontSize: 44, fontWeight: 900, letterSpacing: 2, textAlign: "center", boxShadow: "0 8px 30px rgba(0,0,0,.35)" }}>{tag}</div>
    {sub && <div style={{ marginTop: 12, color: "#fff", fontSize: 32, fontWeight: 700, textShadow: "0 3px 10px rgba(0,0,0,.7)" }}>{sub}</div>}
  </div>;
};

const Cockpit: React.FC<{ t: number; u: number }> = ({ t, u }) => {
  const roll = -5 - u * 40 + wob(t, 6, 4, 2);
  const shake = [wob(t, 6, 14, 3), wob(t, 6, 12, 4)];
  const blink = Math.sin(t * 14) > 0;
  const exprA = MAX_EXPR.scared.ex;
  const person = (k: string, left: number) => {
    const sp = CAST[k];
    return <div key={k} style={{ position: "absolute", left, top: 880, width: 380, height: 700 }}>
      <PersonCanvas k={k} ex={exprA} />
    </div>;
  };
  return <AbsoluteFill style={{ background: "#0d1020", overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, transform: `translate(${shake[0]}px,${shake[1]}px)` }}>
      <div style={{ position: "absolute", left: 120, top: 200, width: 840, height: 620, borderRadius: 40, overflow: "hidden", border: "16px solid #232842", background: "#000" }}>
        <div style={{ position: "absolute", left: -600, top: -600, width: 2040, height: 1820, transform: `rotate(${roll}deg)`, background: "linear-gradient(180deg,#3a82e8 0%,#9fd0ff 49.5%,#2e6a3c 50.5%,#1d4a29 100%)" }} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 870, width: 840, height: 400, background: "#161a2e", borderRadius: 30 }} />
      {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ position: "absolute", left: 170 + i * 130, top: 920, width: 100, height: 100, borderRadius: 50, background: i % 2 === 0 && blink ? "#ff4a4a" : "#2a3350", border: "6px solid #3b4468" }} />)}
      <div style={{ position: "absolute", left: 340, top: 1070, width: 400, height: 150, borderRadius: 18, background: "#0a0e1c", border: "6px solid #3b4468", color: blink ? "#ff5a4a" : "#7a2a2a", fontFamily: FONT, fontWeight: 900, fontSize: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>КРЕН</div>
      {person("pilotA", 150)}{person("pilotB", 550)}
    </div>
  </AbsoluteFill>;
};

import { personTexture } from "./characters";
const PersonCanvas: React.FC<{ k: string; ex: any }> = ({ k, ex }) => {
  const url = useMemo(() => (personTexture(CAST[k], ex, "grip", 0).image as HTMLCanvasElement).toDataURL(), [k]);
  return <img src={url} style={{ width: "100%", height: "100%", objectFit: "contain" }} />;
};

const Subtitles: React.FC<{ t: number }> = ({ t }) => {
  const chunks = useMemo(() => {
    const out: { s: number; e: number; words: { w: string; s: number; e: number; k: boolean }[] }[] = [];
    for (const seg of timingData.segments) {
      let cur: typeof out[number]["words"] = [];
      const flush = () => { if (cur.length) { out.push({ s: cur[0].s, e: cur[cur.length - 1].e, words: cur }); cur = []; } };
      for (const w of seg.words) {
        cur.push(w);
        const len = cur.reduce((a, x) => a + x.w.length + 1, 0);
        if (/[.!?…]$/.test(w.w) || (len > 18 && cur.length >= 2) || cur.length >= 4) flush();
      }
      flush();
    }
    for (let i = 0; i < out.length - 1; i++) out[i].e = Math.min(out[i].e + 0.35, out[i + 1].s);
    return out;
  }, []);
  const c = chunks.find((x) => t >= x.s - 0.05 && t < x.e);
  if (!c) return null;
  return <div style={{ position: "absolute", left: 60, right: 60, top: 1290, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 22px", fontFamily: FONT, fontWeight: 900, fontSize: 78, lineHeight: 1.18, textAlign: "center" }}>
    {c.words.map((w, i) => {
      const on = t >= w.s;
      return <span key={i} style={{ color: w.k ? "#ffd84a" : "#fff", opacity: 1, transform: `scale(${t >= w.s && t < w.s + 0.12 ? 1.08 : 1})`, textShadow: "0 0 0 #000, -4px -4px 0 #101426, 4px -4px 0 #101426, -4px 4px 0 #101426, 4px 4px 0 #101426, 0 8px 18px rgba(0,0,0,.6)", WebkitTextStroke: "2px #101426", paintOrder: "stroke fill" as any }}>{w.w}</span>;
    })}
  </div>;
};

const TitleCard: React.FC<{ t: number }> = ({ t }) => {
  const a = easeOut((t - EV.titleCard) / 0.7);
  if (a <= 0) return null;
  return <AbsoluteFill style={{ background: `rgba(7,12,30,${0.55 * a})`, alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
    <div style={{ marginTop: -300, transform: `scale(${0.9 + 0.1 * a})`, opacity: a, textAlign: "center", color: "#fff", fontWeight: 900, fontSize: 104, lineHeight: 1.1, padding: "0 70px", textShadow: "0 6px 30px rgba(0,0,0,.7)" }}>
      <div style={{ color: "#ffd84a" }}>ОНО СОЗДАНО,</div><div>ЧТОБЫ ВЫДЕРЖИВАТЬ</div>
    </div>
  </AbsoluteFill>;
};

// ---------- film ----------
export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  void loadFonts();
  const t = frame / FPS;
  const { shot, f, u, tl, dur } = shotAt(frame);
  const cfg = cfgFor(shot.id, t, tl, u);
  const trans = shot.transition;
  const whip = trans === "whip" ? 1 - easeOut(f / 7) : 0;
  const flash = trans === "flash" ? 1 - clamp(f / 8) : 0;
  const glitch = trans === "glitch" && f < 9;
  const iris = trans === "iris" ? easeOut(f / 14) : 1;
  const lab = labels[shot.id];
  const shake = shot.scene === "S2" ? 1 : 0;
  const scared = t > EV.turbStart && t < EV.calmReturn - 3 ? 1 : 0;
  const expr = shot.id === "s1b" ? "calm" : shot.id === "s1c" ? "curious" : shot.id === "s2a" ? "startled" : shot.id === "s2b" ? "scared" : shot.id === "s2c" ? "worried" : shot.id === "s6a" ? "calm" : shot.id === "s6c" ? "happy" : "relieved";
  const cabinShake = shot.id === "s2a" || shot.id === "s2b" || shot.id === "s2c" ? 1 : shot.id === "s1c" ? 0.3 * smooth(0, 0.5, tl) : 0;
  return <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
    <AbsoluteFill style={{ transform: `translateX(${whip * 140}px)`, filter: `blur(${whip * 18}px)${glitch ? " hue-rotate(40deg) saturate(1.6)" : ""}`, clipPath: iris < 1 ? `circle(${iris * 1500}px at 50% 45%)` : undefined }}>
      {shot.set === "cockpit" ? <Cockpit t={t} u={u} /> : <ThreeCanvas width={W} height={H} gl={{ antialias: true }} camera={{ fov: 50, near: 0.1, far: 6000, position: [0, 0, 20] }}>
        <World cfg={cfg} t={t} tl={tl} frame={frame} />
        {cfg.set === "cabin" && <Cabin cam={cfg.cam} t={t} tl={tl} set={cfg.set} expr={expr} shake={cabinShake} paxScare={cabinShake} />}
      </ThreeCanvas>}
      {glitch && <AbsoluteFill style={{ mixBlendMode: "screen", background: "linear-gradient(90deg, rgba(255,0,80,.25), rgba(0,255,255,.25))", transform: `translateX(${(f % 3 - 1) * 24}px)` }} />}
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,.45) 100%)" }} />
    {lab && <Tag {...lab} f={f} />}
    {shot.set !== "cockpit" && shot.id === "s4d" ? null : null}
    {flash > 0 && <AbsoluteFill style={{ background: `rgba(255,255,255,${flash * 0.9})` }} />}
    {Math.abs(t - EV.wingBreak) < 0.15 && <AbsoluteFill style={{ background: `rgba(255,255,255,${1 - Math.abs(t - EV.wingBreak) / 0.15})` }} />}
    <Subtitles t={t} />
    <TitleCard t={t} />
  </AbsoluteFill>;
};
