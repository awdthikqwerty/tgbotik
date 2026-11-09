// Static-test hangar: whole airframe on cradles, actuators above each wing pull the wings up.
import React, { useMemo } from "react";
import * as THREE from "three";
import { toon } from "./toon";
import { Airliner, mainWing, station } from "./aircraft";
import { CAST, personTexture, CARD_ASPECT } from "./characters";
import { Beam } from "./parts";
import { ctex, rep } from "./post/paint";

export const RIG_FLOOR = -7;
export const flexForLoad = (load: number) => (5.2 * load) / 1.5; // ~5 m tip rise at 150 %
const STATIONS = [0.4, 0.58, 0.76, 0.93];
const TOP = 17;

const screen = () => {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 576;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { g: c.getContext("2d")!, t };
};
function drawScreen(g: CanvasRenderingContext2D, load: number) {
  g.fillStyle = "#0b1226"; g.fillRect(0, 0, 1024, 576);
  g.fillStyle = "#9fb3d9"; g.font = "800 54px Montserrat, sans-serif"; g.textAlign = "left"; g.fillText("НАГРУЗКА НА КРЫЛО", 60, 100);
  g.fillStyle = load > 1.0 ? "#ff8a3a" : "#3ee07a"; g.font = "900 190px Montserrat, sans-serif"; g.fillText(`${Math.round(load * 100)}%`, 60, 330);
  const x0 = 60, x1 = 964, y = 420, w = x1 - x0, k = (v: number) => x0 + (w * v) / 1.6;
  g.fillStyle = "#1d2a4a"; g.fillRect(x0, y, w, 60);
  g.fillStyle = load > 1.0 ? "#ff8a3a" : "#3ee07a"; g.fillRect(x0, y, k(Math.min(load, 1.6)) - x0, 60);
  g.fillStyle = "#ffd23a"; g.fillRect(k(1) - 4, y - 20, 8, 100);
  g.fillStyle = "#ff3b30"; g.fillRect(k(1.5) - 4, y - 20, 8, 100);
}

const floorTex = () => {
  const t = ctex("hangarFloor", 512, 512, (g, r) => {
    g.fillStyle = "#b3b8c2"; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)"; g.fillRect(r() * 512, r() * 512, 3 + r() * 10, 2 + r() * 6); }
    g.strokeStyle = "rgba(60,64,80,.25)"; g.lineWidth = 3; g.strokeRect(0, 0, 512, 512);
  });
  rep(t, 24, 24); return t;
};
const wallTex = () => {
  const t = ctex("hangarWall", 512, 512, (g) => {
    g.fillStyle = "#6b7d9c"; g.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 32) { g.fillStyle = "#5c6d8a"; g.fillRect(x, 0, 12, 512); g.fillStyle = "#7d8fae"; g.fillRect(x + 12, 0, 4, 512); }
  });
  rep(t, 10, 2); return t;
};

export const Hangar: React.FC<{ load: number; t: number; stress?: number; engineers?: boolean }> = ({ load, t, stress = 0, engineers = true }) => {
  const flex = flexForLoad(load);
  const scr = useMemo(screen, []);
  drawScreen(scr.g, load); scr.t.needsUpdate = true;
  const ftex = useMemo(floorTex, []), wtex = useMemo(wallTex, []);
  const yellow = toon("#ffc21a"), dark = toon("#3e4a63"), chrome = toon("#dfe4ec");
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, RIG_FLOOR, 0]}><planeGeometry args={[180, 180]} /><meshToonMaterial map={ftex} /></mesh>
    {[[0, 12, -75, 0], [0, 12, 75, Math.PI], [-75, 12, 0, Math.PI / 2], [75, 12, 0, -Math.PI / 2]].map(([x, y, z, ry], i) =>
      <mesh key={i} position={[x, y, z]} rotation={[0, ry, 0]}><planeGeometry args={[150, 40]} /><meshToonMaterial map={wtex} /></mesh>)}
    <mesh position={[0, 32, 0]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[150, 150]} /><meshToonMaterial color="#4a5670" side={THREE.DoubleSide} /></mesh>
    {Array.from({ length: 7 }, (_, i) => <group key={i}>
      <mesh position={[-60 + i * 20, 30.5, 0]}><boxGeometry args={[0.8, 2.2, 150]} /><primitive object={toon("#8792a8")} attach="material" /></mesh>
      {[-40, -15, 15, 40].map((z) => <mesh key={z} position={[-60 + i * 20, 27, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.4, 1.8, 0.6, 20]} /><meshBasicMaterial color="#fff4d8" toneMapped={false} /></mesh>)}
    </group>)}
    {/* safety lines around the test area */}
    {[[0, -32, 90, 0.5], [0, 32, 90, 0.5], [-45, 0, 0.5, 64], [45, 0, 0.5, 64]].map(([x, z, w, d], i) =>
      <mesh key={i} position={[x, RIG_FLOOR + 0.02, z]}><boxGeometry args={[w, 0.02, d]} /><meshBasicMaterial color="#f5c518" /></mesh>)}
    {/* the airframe */}
    <Airliner t={t} flexL={flex} flexR={flex} stressL={stress} stressR={stress} engines={false} />
    {[-10, 0, 9].map((x) => <group key={x}>
      <mesh position={[x, (RIG_FLOOR - 2.4) / 2 - 0.2, 0]} material={yellow}><boxGeometry args={[1.6, RIG_FLOOR * -1 - 2.4 - 0.4, 3.2]} /></mesh>
    </group>)}
    {/* actuator gantries */}
    {([1, -1] as const).map((sd) => {
      const p = mainWing(sd, flex);
      const p0 = mainWing(sd, 0);
      const pt = (s: number) => { const st = station(p0, s); return new THREE.Vector3(st.xLE - st.chord * 0.42, TOP, st.z); };
      const a = pt(0.3), b = pt(1.02);
      return <group key={sd}>
        <Beam a={[a.x, a.y, a.z]} b={[b.x, b.y, b.z]} r={0.55} color="#ffc21a" basic={false} />
        {[a, b].map((v, i) => <group key={i}>
          <Beam a={[v.x + 2.4, RIG_FLOOR, v.z]} b={[v.x + 2.4, TOP + 0.5, v.z]} r={0.45} color="#ffc21a" basic={false} />
          <Beam a={[v.x - 2.4, RIG_FLOOR, v.z]} b={[v.x - 2.4, TOP + 0.5, v.z]} r={0.45} color="#ffc21a" basic={false} />
          <mesh position={[v.x, TOP + 0.5, v.z]} material={yellow}><boxGeometry args={[5.6, 0.9, 0.9]} /></mesh>
        </group>)}
        {STATIONS.map((s) => {
          const st = station(p, s), top = pt(s);
          const padY = st.y + st.th * 0.45 + 0.25, x = top.x;
          return <group key={s}>
            <Beam a={[x, TOP, top.z]} b={[x, TOP - 4.5, top.z]} r={0.42} color="#3e4a63" basic={false} />
            <Beam a={[x, TOP - 4.5, top.z]} b={[x, padY, st.z]} r={0.14} color="#dfe4ec" basic={false} />
            <mesh position={[x, padY, st.z]} rotation={[-sd * Math.atan(st.slope), 0, 0]} material={dark}><boxGeometry args={[st.chord * 0.7, 0.3, 1.1]} /></mesh>
          </group>;
        })}
      </group>;
    })}
    {/* control desk, screen, engineers */}
    <mesh position={[0, 14, -74.5]}><planeGeometry args={[32, 18]} /><meshBasicMaterial map={scr.t} toneMapped={false} /></mesh>
    <mesh position={[0, 14, -74.7]} material={dark}><boxGeometry args={[33.5, 19.5, 0.3]} /></mesh>
    <group position={[30, RIG_FLOOR, 30]} rotation={[0, 0.75, 0]}>
      <mesh position={[0, 0.55, 0]} material={toon("#d9dde6")}><boxGeometry args={[4.4, 1.1, 1.2]} /></mesh>
      {[-1.3, 0, 1.3].map((x) => <group key={x}>
        <mesh position={[x, 1.55, -0.3]} material={dark}><boxGeometry args={[1.0, 0.7, 0.08]} /></mesh>
        <mesh position={[x, 1.55, -0.25]}><planeGeometry args={[0.9, 0.6]} /><meshBasicMaterial map={scr.t} toneMapped={false} /></mesh>
      </group>)}
      {engineers && (["engA", "engB"] as const).map((k, i) => <mesh key={k} position={[-1.1 + i * 2.2, 1.05 + 0.85, -0.9]}>
        <planeGeometry args={[1.7 * CARD_ASPECT, 1.7]} />
        <meshBasicMaterial map={personTexture(CAST[k], { eyes: 1, mouth: load > 1.45 ? "grin" : "neutral", brow: 0.3 }, "rest", i ? -0.4 : 0.4)} transparent alphaTest={0.5} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>)}
    </group>
  </group>;
};
