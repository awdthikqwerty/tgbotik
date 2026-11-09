import React, { useEffect, useMemo } from "react";
import { AbsoluteFill, getInputProps, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { W, H, FPS, EV, timingData, shotAt, clamp, lerp, smooth, easeOut, easeInOut, noise, prog, rng } from "./lib";
import { loadFonts } from "./fonts";
import { Cam, Arrow, type CamState, type Vec3 } from "./parts";
import { Airliner, MainWing, mainWing, station, type PlaneState } from "./aircraft";
import { PAL, Skyscape, SkyDome, useNoInk, type Pal } from "./env";
import { CabinSet, Passengers, MaxSeated, rowX, MAX_SEAT } from "./cabin";
import { Cockpit } from "./cockpit";
import { Hangar } from "./rig";
import { InkPass } from "./post/ink";
import { ctex } from "./post/paint";
import { InfoCard, Badge, WingFlexDiagram, LoadGauge, RollArrow, Chip, FONT } from "./explain";

type Kind = "ext" | "cabin" | "cockpit" | "rig" | "lab";
type Spec = { kind: Kind; cam: CamState; pal: Pal; plane?: PlaneState; speed?: number; roll?: number; pitch?: number; pos?: Vec3; extra?: string };
const D = (a: Vec3, b: Vec3, u: number): Vec3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const wob = (t: number, a: number, f = 1, s = 0) => a * noise(t * f, s);

// ---------- story curves ----------
export const loadAt = (t: number) => t < EV.bendTest ? 0 : t < EV.loads ? easeInOut(prog(t, EV.bendTest + 0.3, EV.bendTest + 5.3)) : 1 + 0.5 * easeInOut(prog(t, EV.loads + 0.2, EV.loads + 4.6));
const bankAt = (t: number) => (t < EV.rollStart ? 0 : 75 * easeInOut(prog(t, EV.rollStart, EV.rollStart + 3.4)) + 40 * prog(t, EV.rollStart + 3.4, EV.catastrophe));
const leftLift = (t: number) => 1 - smooth(EV.lossOfLift, EV.lossOfLift + 1.2, t);

function spec(id: string, t: number, u: number, tl: number): Spec {
  const calm = Math.sin(t * 1.1);
  switch (id) {
    case "s1a": return { kind: "ext", pal: PAL.day, cam: { pos: D([42, 8, 50], [34, 6, 42], easeInOut(u)), look: [0, -1, 3], fov: 38 }, plane: { flexL: 1 + calm * 0.3, flexR: 1 + calm * 0.3 } };
    case "s1b": return { kind: "cabin", pal: PAL.day, cam: { pos: D([2.4, 0.66, 0.1], [2.25, 0.62, 0.25], u), look: [1.2, 0.22, 1.95], fov: 50 }, plane: { flexR: 1 + calm * 0.3, flexL: 1 } };
    case "s1c": return { kind: "cabin", pal: PAL.day, cam: { pos: D([2.25, 0.62, 0.25], [1.95, 0.5, 0.95], easeOut(u)), look: [1.2, 0.3, 1.92], fov: 48, shake: t > EV.crack ? 0.6 : 0, seed: 3, t }, plane: { flexR: 1.4 + wob(t, 0.4, 6), flexL: 1.4 } };
    case "s2a": return { kind: "cabin", pal: PAL.storm, cam: { pos: [rowX(18), 1.1, 0.05], look: [rowX(8), 0.05, 0.35], fov: 54, shake: 1.2, seed: 5, t }, plane: { flexR: 2.4 + wob(t, 1.2, 4), flexL: 2.4 + wob(t, 1.2, 4, 2) } };
    case "s2b": return { kind: "cabin", pal: PAL.storm, extra: "window", cam: { pos: [1.27, 0.6, 1.72], look: [0.2, -0.6, 8], fov: 64, shake: 0.7, seed: 6, t }, plane: { flexR: 2.2 + 2.8 * easeInOut(u) + wob(t, 0.6, 5), flexL: 3 } };
    case "s2c": return { kind: "cabin", pal: PAL.storm, cam: { pos: [1.95, 0.45, 1.2], look: [1.2, 0.33, 1.92], fov: 46, shake: 0.9, seed: 7, t }, plane: { flexR: 4, flexL: 4 } };
    case "s2d": return { kind: "ext", pal: PAL.storm, cam: { pos: D([-11, 5.2, 4.8], [-9.5, 5.6, 4.2], u), look: [1, 0, 14], fov: 58, shake: 0.5, seed: 2, t }, plane: { flexR: 4.2 + wob(t, 1.4, 4), flexL: 4.2 + wob(t, 1.4, 4, 3), shake: 1 }, speed: 90 };
    case "s3a": { const a = 0.55 + u * 0.8; return { kind: "ext", pal: PAL.dusk, extra: "hypo", cam: { pos: [Math.cos(a) * 19, 7.5, -Math.sin(a) * 19 - 5], look: [1, -1, -9], fov: 44 }, plane: { flexL: 3 + 5 * u, flexR: 3, stressL: 0.3 + 0.7 * u, cracks: u }, speed: 40 }; }
    case "s3b": return { kind: "ext", pal: PAL.dusk, extra: "break", cam: { pos: D([24, 9, -36], [28, 8, -42], u), look: [-3, -1, -12], fov: 46, shake: t > EV.wingBreak ? 1.2 * clamp(1 - (t - EV.wingBreak) / 1.5) : 0, seed: 9, t }, plane: { flexL: 8, flexR: 3, stressL: 1, cracks: 1, leftOff: t >= EV.wingBreak }, roll: -0.35 * Math.min(1, ((Math.max(0, t - EV.wingBreak)) / 1.3) ** 2), speed: 40 };
    case "s4a": case "s4b": { const k = id === "s4a" ? u : 1; return { kind: "lab", pal: PAL.lab, cam: { pos: D([-150, 30, 0], [-140, 27, 0], id === "s4a" ? u : 1), look: [0, 4, 0], fov: 30 }, plane: { flexL: 1.2, flexR: 1.2, leftOff: t > EV.lossOfLift + 0.6 }, extra: "lift" + k }; }
    case "s4c": return { kind: "lab", pal: PAL.lab, cam: { pos: [-140, 27, 0], look: [0, 4, 0], fov: 30 }, plane: { flexR: 1.4, leftOff: true }, roll: -(bankAt(t) * Math.PI) / 180, extra: "lift" };
    case "s4d": return { kind: "cockpit", pal: PAL.day, cam: tl < 2.4 ? { pos: [0.98, 0.4, 0.62], look: [0.38, 0.22, -0.55], fov: 54, shake: 1, seed: 4, t } : { pos: [-0.8, 0.66, 0.02], look: [2.6, 0.32, 0], fov: 62, shake: 1, seed: 4, t }, roll: (bankAt(t) * Math.PI) / 180, extra: tl < 2.4 ? "captain" : "pov" };
    case "s4e": { const f = prog(t, EV.catastrophe - 1.2, EV.catastrophe + 4.5); const pos: Vec3 = [0, -f * 34, 0]; return { kind: "ext", pal: PAL.storm, extra: "fall", cam: { pos: [95, 24 - f * 20, 120], look: [0, pos[1] - 2, 0], fov: 30, shake: 0.4, seed: 8, t }, plane: { leftOff: true, flexR: 2 }, roll: -1.3 - f * 3.4, pitch: -f * 0.7, pos, speed: 120 }; }
    case "s4f": return { kind: "ext", pal: PAL.day, cam: { pos: D([30, -5, 44], [26, -4, 40], u), look: [0, 0, 3], fov: 40 }, plane: { flexL: 2 + wob(t, 0.8, 3), flexR: 2 + wob(t, 0.8, 3, 1), shake: 0.6 }, speed: 70 };
    case "s5a": return { kind: "rig", pal: PAL.lab, cam: { pos: D([58, 11, 64], [50, 9, 56], u), look: [-2, 2, 0], fov: 46 } };
    case "s5b": return { kind: "rig", pal: PAL.lab, cam: { pos: D([26, -3.5, 36], [22, -3, 33], u), look: [-4, 2.5, 12], fov: 50 } };
    case "s5c": return { kind: "rig", pal: PAL.lab, extra: "stress", cam: { pos: D([10, 2.8, 7.5], [8.5, 2.4, 6.8], u), look: [0, -0.4, 3.5], fov: 46 } };
    case "s5d": return { kind: "rig", pal: PAL.lab, extra: "stress", cam: { pos: D([38, 33, 30], [30, 34, 34], u), look: [-2, 0, 7], fov: 48 } };
    case "s5e": return { kind: "rig", pal: PAL.lab, cam: { pos: D([35.5, -4.1, 36], [34.6, -4.3, 35], u), look: [29.6, -4.9, 29.4], fov: 50 } };
    case "s6a": return { kind: "cabin", pal: PAL.gold, cam: { pos: D([2.4, 0.66, 0.1], [2.3, 0.62, 0.2], u), look: [1.2, 0.22, 1.95], fov: 50 }, plane: { flexR: 1.6 + calm * 0.7, flexL: 1.6 } };
    case "s6b": return { kind: "ext", pal: PAL.gold, cam: { pos: D([-12, 4.2, 5.2], [-10.5, 4.6, 4.8], u), look: [2, -0.5, 14], fov: 56 }, plane: { flexR: 2 + Math.sin(t * 1.6) * 0.9, flexL: 2 + Math.sin(t * 1.6) * 0.9 }, speed: 50 };
    case "s6c": return { kind: "cabin", pal: PAL.gold, cam: { pos: [2.0, 0.5, 1.12], look: [1.2, 0.34, 1.92], fov: 48 }, plane: { flexR: 1.6 + calm * 0.6, flexL: 1.6 } };
    default: return { kind: "ext", pal: PAL.gold, cam: { pos: D([26, 5, 36], [120, 46, 200], easeInOut(u)), look: [0, 0, 0], fov: 38 }, plane: { flexL: 1.3 + calm * 0.3, flexR: 1.3 + calm * 0.3 }, speed: 45 };
  }
}

// ---------- hypothetical-break effects ----------
const puffTex = () => ctex("puff", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.6, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const Trail: React.FC<{ t: number; t0: number; color: string; n?: number; spread?: number; speed?: number; size?: number; at?: Vec3 }> = ({ t, t0, color, n = 36, spread = 1, speed = 22, size = 2.4, at = [0, -1, -3.6] }) => {
  const tex = useMemo(puffTex, []);
  const ref = useNoInk();
  const d = t - t0;
  if (d <= 0) return null;
  return <group ref={ref}>{Array.from({ length: n }, (_, i) => {
    const age = (d * 1.0 + i * 0.09) % (n * 0.09);
    if (age > d) return null;
    const r = rng(i + 3);
    return <sprite key={i} position={[at[0] - age * speed, at[1] + age * 0.6 * spread + (r() - 0.5) * age, at[2] - age * 1.2 * spread + (r() - 0.5) * age]} scale={[size + age * 3.2, size + age * 3.2, 1]}>
      <spriteMaterial map={tex} color={color} transparent opacity={0.85 * clamp(1 - age / (n * 0.09))} depthWrite={false} />
    </sprite>;
  })}</group>;
};
const Debris: React.FC<{ t: number }> = ({ t }) => {
  const d = t - EV.wingBreak;
  const items = useMemo(() => Array.from({ length: 22 }, (_, i) => { const r = rng(90 + i); return { v: [-6 - r() * 10, r() * 6 - 2, -2 - r() * 8] as Vec3, s: 0.25 + r() * 0.7, c: i % 3 ? "#3a3f52" : "#eef1f8", w: r() * 8 }; }), []);
  if (d < 0) return null;
  return <>{items.map((p, i) => <mesh key={i} position={[p.v[0] * d, -1 + p.v[1] * d - 4 * d * d, -3.6 + p.v[2] * d]} rotation={[p.w * d, p.w * d * 0.7, p.w]}>
    <boxGeometry args={[p.s, p.s * 0.25, p.s * 0.7]} /><meshBasicMaterial color={p.c} />
  </mesh>)}</>;
};
/** Separated left wing (with its engine) tumbling away, pivoting around its own middle. */
const LooseWing: React.FC<{ t: number }> = ({ t }) => {
  const d = t - EV.wingBreak;
  if (d < 0) return null;
  const c: Vec3 = [0, -0.4, -11];
  const off: Vec3 = [-(d * 9 + 7 * d * d), 2.2 * d - 3.2 * d * d, -(1.5 * d + 1.6 * d * d)];
  return <group position={[c[0] + off[0], c[1] + off[1], c[2] + off[2]]} rotation={[-d * 1.9, d * 0.7, d * 1.1]}>
    <group position={[-c[0], -c[1], -c[2]]}><MainWing side={-1} flex={6 - Math.min(5, d * 4)} stress={1} t={t} /></group>
  </group>;
};

// ---------- lab (rear-view diagram) ----------
const Lab: React.FC<{ s: Spec; t: number }> = ({ s, t }) => {
  const grid = useNoInk();
  const ll = leftLift(t);
  const pR = mainWing(1, s.plane?.flexR ?? 1.2), pL = mainWing(-1, s.plane?.flexL ?? 1.2);
  const grow = smooth(EV.physicsStart, EV.physicsStart + 1.0, t);
  const pulse = 1 + (t > EV.imbalance ? 0.08 * Math.sin(t * 7) : 0);
  const arrows = (p: typeof pR, k: number, col: string) => [0.2, 0.45, 0.7, 0.92].map((sp) => {
    const st = station(p, sp);
    return <Arrow key={sp} base={[st.xLE - st.chord * 0.4, st.y + st.th * 0.5 + 0.3, st.z]} length={9.5 * k * (1.1 - sp * 0.45)} color={col} width={0.55} />;
  });
  return <>
    <SkyDome pal={s.pal} />
    <group ref={grid}><gridHelper args={[400, 40, "#2f6fc0", "#1b3a6e"]} position={[0, -28, 0]} /></group>
    <group rotation={[s.roll ?? 0, 0, 0]}>
      <Airliner t={t} {...s.plane} />
      {arrows(pR, grow * pulse, "#3ee07a")}
      {!s.plane?.leftOff && arrows(pL, grow * ll, "#3ee07a")}
      <Arrow base={[0, -3.2, 0]} dir={[0, -1, 0]} length={11 * grow} color="#ffb340" width={0.6} />
      <mesh position={[0.5, -0.2, 0]}><sphereGeometry args={[0.9, 16, 12]} /><meshBasicMaterial color="#ffd23a" /></mesh>
    </group>
  </>;
};

// ---------- post (ink outlines from the bridge template) ----------
const Post: React.FC = () => {
  const { scene, camera } = useThree();
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera, { color: "#16122a", widthNear: 4.2, widthFar: 2.4, distNear: 2, distFar: 160, fadeNear: 400, fadeFar: 1400, creaseScale: 0.7, angleLo: 40, angleHi: 60 }),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
  }), [scene, camera]);
  useEffect(() => () => fx.ink.dispose(), [fx]);
  return <EffectComposer multisampling={4}>
    {(getInputProps() as { ink?: boolean }).ink !== false ? <primitive object={fx.ink} dispose={null} /> : null}
    <primitive object={fx.tone} dispose={null} />
  </EffectComposer>;
};

const Lights: React.FC<{ pal: Pal; kind: Kind }> = ({ pal, kind }) => {
  const warm = pal === PAL.gold, storm = pal === PAL.storm, dusk = pal === PAL.dusk;
  if (kind === "rig") return <><hemisphereLight args={["#f4f6ff", "#8a90a0", 2.2]} /><directionalLight position={[20, 60, 30]} intensity={1.6} color="#fff6e6" /></>;
  if (kind === "lab") return <><hemisphereLight args={["#cfe0ff", "#3a4a70", 2.0]} /><directionalLight position={[-40, 60, 30]} intensity={1.8} /></>;
  if (kind === "cockpit") return <><hemisphereLight args={["#d8e4ff", "#3a3a48", 1.8]} /><directionalLight position={[30, 40, -10]} intensity={1.4} /></>;
  return <>
    <hemisphereLight args={[storm ? "#aab6d0" : dusk ? "#b9a0d0" : warm ? "#ffe0c0" : "#d6e8ff", storm ? "#4a5470" : "#8a94b8", kind === "cabin" ? 2.0 : 1.6]} />
    <directionalLight position={[-30, 60, 40]} intensity={storm ? 1.2 : dusk ? 1.6 : 2.3} color={warm ? "#ffd29a" : dusk ? "#ffb27a" : "#fff3e0"} />
  </>;
};

const Scene: React.FC<{ s: Spec; t: number; expr: string; scare: number }> = ({ s, t, expr, scare }) => {
  const p = s.plane ?? {};
  const speed = s.speed ?? 60;
  return <>
    <Lights pal={s.pal} kind={s.kind} />
    {s.kind === "ext" && <>
      <Skyscape pal={s.pal} t={t} speed={speed} dense={s.pal === PAL.storm} />
      <group position={s.pos ?? [0, 0, 0]} rotation={[s.roll ?? 0, 0, s.pitch ?? 0]}>
        <Airliner t={t} {...p} />
        {(s.extra === "break" || s.extra === "fall") && <>
          <Trail t={t} t0={s.extra === "fall" ? 30 : EV.wingBreak} color={s.extra === "fall" ? "#4a4c5c" : "#eef2fa"} speed={s.extra === "fall" ? 16 : 26} size={s.extra === "fall" ? 4 : 2.2} />
          {s.extra === "break" && <Debris t={t} />}
        </>}
      </group>
      {s.extra === "break" && <LooseWing t={t} />}
    </>}
    {s.kind === "cabin" && <>
      <Skyscape pal={s.pal} t={t} speed={speed} />
      <MainWing side={1} flex={p.flexR ?? 1} t={t} shake={scare} />
      <MainWing side={-1} flex={p.flexL ?? 1} t={t} shake={scare} />
      <CabinSet />
      <Passengers cam={s.cam.pos} scare={scare} t={t} />
      {s.extra !== "window" && <MaxSeated expr={expr} cam={s.cam.pos} jitter={scare * 0.8} t={t} look={expr === "curious" || expr === "scared" ? 0.6 : 0} />}
    </>}
    {s.kind === "cockpit" && <>
      <fog attach="fog" args={[s.pal.fog, 260, 3200]} />
      <group rotation={[s.roll ?? 0, 0, 0.12]}><Skyscape pal={s.pal} t={t} speed={110} fog={false} /></group>
      <Cockpit t={t} roll={s.roll ?? 0} yoke={0.75 + wob(t, 0.15, 9)} view={s.extra === "pov" ? "pov" : "captain"} alarm />
    </>}
    {s.kind === "rig" && <>
      <color attach="background" args={["#4a5670"]} />
      <fog attach="fog" args={["#8a93a6", 90, 420]} />
      <Hangar load={loadAt(t)} t={t} stress={s.extra === "stress" ? clamp(loadAt(t) / 1.5) : 0} />
    </>}
    {s.kind === "lab" && <Lab s={s} t={t} />}
    <Cam {...s.cam} t={t} />
    {(getInputProps() as { post?: boolean }).post !== false && <Post />}
  </>;
};

// ---------- overlays ----------
const Overlay: React.FC<{ id: string; f: number; dur: number; t: number; tl: number }> = ({ id, f, dur, t, tl }) => {
  switch (id) {
    case "s1a": return <Badge text="ВЫСОТА ≈ 10 КМ" col="#ffffff" f={f} />;
    case "s2d": return <InfoCard f={f} dur={dur} title="ИЗГИБ КРЫЛА В ПОЛЁТЕ — НОРМА" sub="Крыло гибкое: оно смягчает порывы ветра"><WingFlexDiagram k={0.6 + 0.4 * Math.sin(t * 3)} /></InfoCard>;
    case "s3a": case "s3b": return <Badge text="ГИПОТЕТИЧЕСКИЙ СЦЕНАРИЙ" f={id === "s3a" ? f : 99} />;
    case "s4a": return t < EV.lossOfLift + 0.4
      ? <InfoCard f={f} dur={Math.round((EV.lossOfLift + 0.4 - (t - f / FPS)) * FPS)} title="КАЖДОЕ КРЫЛО ДЕРЖИТ ПОЛОВИНУ ВЕСА" sub="Подъёмная сила слева = справа → самолёт летит ровно" col="#3ee07a" />
      : <><InfoCard f={Math.round((t - EV.lossOfLift - 0.4) * FPS)} dur={999} title="ОДНОГО КРЫЛА НЕТ" sub="Слева подъёмная сила исчезла" col="#ff6a5a" /><Chip x={250} y={1010} text="0" col="#ff6a5a" /></>;
    case "s4b": return <><InfoCard f={f} dur={dur} title="ДИСБАЛАНС" sub="Правое крыло всё ещё тянет вверх, а левого нет" col="#ff9a3a" /><Chip x={250} y={1010} text="0" col="#ff6a5a" /><Chip x={830} y={760} text="ТЯНЕТ ВВЕРХ" col="#3ee07a" /></>;
    case "s4c": return <><InfoCard f={f} dur={dur} title="САМОЛЁТ ЗАКРУЧИВАЕТ" sub="Одна сторона поднимается, другая падает" col="#ff6a5a" /><RollArrow deg={bankAt(t)} a={smooth(EV.rollStart - 0.2, EV.rollStart + 0.4, t)} cy={1000} /></>;
    case "s4d": return <InfoCard f={f} dur={dur} title="РУЛИ НЕ ЗАМЕНЯТ КРЫЛО" sub="Элероны рассчитаны на поправки, а не на потерю половины опоры" col="#ff6a5a" top={1490 - 1490 + 120} />;
    case "s4e": return <Badge text="ГИПОТЕТИЧЕСКИЙ СЦЕНАРИЙ" f={f} />;
    case "s4f": return <InfoCard f={f} dur={dur} title="ВАЖНО" sub="Обычная турбулентность крылья не отрывает. Это мысленный эксперимент" col="#3ee07a" />;
    case "s5a": return <InfoCard f={f} dur={dur} title="ИСПЫТАНИЕ НА ПРОЧНОСТЬ" sub="Зачем? Доказать запас прочности ещё на земле" col="#35d0ff" />;
    case "s5b": return <InfoCard f={f} dur={dur} title="КРЫЛО НАРОЧНО ДЕЛАЮТ ГИБКИМ" sub="Гибкое крыло легче и мягче принимает порывы" col="#35d0ff" />;
    case "s5c": return <InfoCard f={f} dur={dur} title="КОРЕНЬ КРЫЛА" sub="Здесь нагрузка самая большая — его делают самым толстым" col="#35d0ff" />;
    case "s5d": return <InfoCard f={f} dur={dur} title="НОРМЫ ПРОЧНОСТИ" col="#35d0ff" src="Источник: FAA, 14 CFR 25.303 и 25.305"><LoadGauge load={loadAt(t)} /></InfoCard>;
    case "s5e": return <InfoCard f={f} dur={dur} title="BOEING 787, 2010" sub="При 150% крылья прогнулись вверх ≈ на 7,6 м — и выдержали" col="#35d0ff" src="Для сравнения: крыло Boeing 777 сломалось лишь при 154% (1995)" />;
    case "s6b": return <Chip x={540} y={330} text="КАЧАЕТСЯ — ЗНАЧИТ РАБОТАЕТ" col="#3ee07a" a={easeOut(f / 9) * clamp((dur - f) / 6)} />;
    default: return null;
  }
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
        if (/[.!?…,:]$/.test(w.w) && cur.length >= 2 || /[.!?…]$/.test(w.w) || len > 17 || cur.length >= 3) flush();
      }
      flush();
    }
    for (let i = 0; i < out.length - 1; i++) out[i].e = Math.min(out[i].e + 0.3, out[i + 1].s);
    return out;
  }, []);
  const c = chunks.find((x) => t >= x.s - 0.04 && t < x.e);
  if (!c) return null;
  return <div style={{ position: "absolute", left: 50, right: 50, top: 1400, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 20px", fontFamily: FONT, fontWeight: 900, fontSize: 70, lineHeight: 1.15, textAlign: "center" }}>
    {c.words.map((w, i) => <span key={i} style={{ color: w.k ? "#ffd84a" : "#fff", transform: `scale(${t >= w.s && t < w.s + 0.1 ? 1.07 : 1})`, WebkitTextStroke: "14px #101426", paintOrder: "stroke fill" as any, textShadow: "0 8px 18px rgba(0,0,0,.45)" }}>{w.w}</span>)}
  </div>;
};

const TitleCard: React.FC<{ t: number }> = ({ t }) => {
  const a = easeOut((t - EV.titleCard) / 0.7);
  if (a <= 0) return null;
  return <AbsoluteFill style={{ background: `rgba(7,12,30,${0.5 * a})`, alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
    <div style={{ marginTop: -260, transform: `scale(${0.9 + 0.1 * a})`, opacity: a, textAlign: "center", color: "#fff", fontWeight: 900, fontSize: 100, lineHeight: 1.1, padding: "0 70px", WebkitTextStroke: "16px #101426", paintOrder: "stroke fill" as any }}>
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
  const s = spec(shot.id, t, u, tl);
  const trans = shot.transition;
  const whip = trans === "whip" ? 1 - easeOut(f / 7) : 0;
  const flash = trans === "flash" ? 1 - clamp(f / 8) : 0;
  const glitch = trans === "glitch" && f < 9;
  const iris = trans === "iris" ? lerp(0.18, 1, easeOut(f / 14)) : 1;
  const expr = shot.id === "s1b" ? "calm" : shot.id === "s1c" ? (t > EV.crack ? "startled" : "curious") : shot.id === "s2a" ? "startled" : shot.id === "s2c" ? "worried" : shot.id === "s6a" ? "relieved" : shot.id === "s6c" ? "happy" : "calm";
  const scare = shot.scene === "S2" ? 1 : shot.id === "s1c" ? 0.4 * smooth(EV.crack, EV.crack + 0.3, t) : 0;
  const breakFlash = Math.abs(t - EV.wingBreak) < 0.12 ? 1 - Math.abs(t - EV.wingBreak) / 0.12 : 0;
  return <AbsoluteFill style={{ background: "#0b1226", overflow: "hidden" }}>
    <AbsoluteFill style={{ transform: `translateX(${whip * 140}px)`, filter: `blur(${whip * 16}px)${glitch ? " hue-rotate(40deg) saturate(1.6)" : ""}`, clipPath: iris < 1 ? `circle(${iris * 1500}px at 50% 45%)` : undefined }}>
      <ThreeCanvas width={W} height={H} gl={{ antialias: false }} camera={{ fov: 50, near: 0.05, far: 9000, position: [0, 0, 20] }}>
        <Scene s={s} t={t} expr={expr} scare={scare} />
      </ThreeCanvas>
      {glitch && <AbsoluteFill style={{ mixBlendMode: "screen", background: "linear-gradient(90deg, rgba(255,0,80,.25), rgba(0,255,255,.25))", transform: `translateX(${((f % 3) - 1) * 24}px)` }} />}
    </AbsoluteFill>
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,.35) 100%)" }} />
    <Overlay id={shot.id} f={f} dur={dur} t={t} tl={tl} />
    {flash > 0 && <AbsoluteFill style={{ background: `rgba(255,255,255,${flash * 0.85})` }} />}
    {breakFlash > 0 && <AbsoluteFill style={{ background: `rgba(255,240,220,${breakFlash * 0.9})` }} />}
    <Subtitles t={t} />
    <TitleCard t={t} />
  </AbsoluteFill>;
};
