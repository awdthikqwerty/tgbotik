// Cockpit set in its own frame: pilots face +x, windshield at x ~ 2.5. The outside world is rolled around it.
import React, { useMemo } from "react";
import * as THREE from "three";
import { toon } from "./toon";
import { CAST, MAX_EXPR } from "./characters";
import { Seated } from "./cabin";

const canvasTex = (w: number, h: number) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, t, g: c.getContext("2d")! };
};

function drawPFD(g: CanvasRenderingContext2D, rollDeg: number, blink: boolean) {
  const W = 512, H = 512;
  g.save(); g.fillStyle = "#06080e"; g.fillRect(0, 0, W, H);
  g.beginPath(); g.rect(40, 40, 432, 432); g.clip();
  g.translate(256, 256); g.rotate((rollDeg * Math.PI) / 180);
  g.fillStyle = "#2f7fe0"; g.fillRect(-600, -600, 1200, 600);
  g.fillStyle = "#8a5a2e"; g.fillRect(-600, 0, 1200, 600);
  g.strokeStyle = "#fff"; g.lineWidth = 5; g.beginPath(); g.moveTo(-600, 0); g.lineTo(600, 0); g.stroke();
  g.lineWidth = 3; for (const p of [-60, -30, 30, 60]) { g.beginPath(); g.moveTo(-40, p); g.lineTo(40, p); g.stroke(); }
  g.restore();
  g.save(); g.translate(256, 256); // bank scale (fixed) and pointer (rolls)
  g.strokeStyle = "#fff"; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 190, Math.PI * 1.17, Math.PI * 1.83); g.stroke();
  for (const a of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) { const r = (a - 90) * Math.PI / 180; g.beginPath(); g.moveTo(Math.cos(r) * 190, Math.sin(r) * 190); g.lineTo(Math.cos(r) * (a % 30 ? 175 : 165), Math.sin(r) * (a % 30 ? 175 : 165)); g.stroke(); }
  g.rotate((rollDeg * Math.PI) / 180); g.fillStyle = "#fff"; g.beginPath(); g.moveTo(0, -186); g.lineTo(-14, -160); g.lineTo(14, -160); g.closePath(); g.fill();
  g.restore();
  g.fillStyle = "#ffd23a"; g.fillRect(140, 250, 80, 14); g.fillRect(292, 250, 80, 14); g.fillRect(248, 248, 16, 16);
  if (blink) { g.fillStyle = "#ff3b30"; g.font = "900 64px Montserrat, sans-serif"; g.textAlign = "center"; g.fillText(`КРЕН ${Math.round(Math.abs(rollDeg))}°`, 256, 440); }
}
function drawEICAS(g: CanvasRenderingContext2D, blink: boolean) {
  g.fillStyle = "#06080e"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#e9edf5"; g.lineWidth = 6;
  for (const x of [150, 362]) { g.beginPath(); g.arc(x, 150, 80, Math.PI * 0.8, Math.PI * 2.1); g.stroke(); g.strokeStyle = "#3ee07a"; g.beginPath(); g.arc(x, 150, 80, Math.PI * 0.8, Math.PI * 1.7); g.stroke(); g.strokeStyle = "#e9edf5"; }
  g.font = "900 40px Montserrat, sans-serif"; g.textAlign = "left";
  g.fillStyle = blink ? "#ff3b30" : "#7a1d18"; g.fillText("ЛЕВОЕ КРЫЛО", 40, 330);
  g.fillStyle = "#ffb020"; g.fillText("УПРАВЛЕНИЕ", 40, 390); g.fillText("ГИДРАВЛИКА", 40, 450);
}

const PostBox: React.FC<{ a: [number, number, number]; s: [number, number, number]; c?: string }> = ({ a, s, c = "#2a2e3a" }) =>
  <mesh position={a}><boxGeometry args={s} /><primitive object={toon(c)} attach="material" /></mesh>;

/** Side wall with a window hole, in the xy plane. */
const sideWall = (() => {
  const s = new THREE.Shape(); s.moveTo(-1.6, -1.0); s.lineTo(2.6, -1.0); s.lineTo(2.6, 1.7); s.lineTo(-1.6, 1.7); s.closePath();
  const h = new THREE.Path(); h.moveTo(-0.2, 0.3); h.lineTo(1.7, 0.3); h.lineTo(2.1, 1.25); h.lineTo(-0.2, 1.25); h.closePath(); s.holes.push(h);
  return new THREE.ShapeGeometry(s);
})();

export const Cockpit: React.FC<{ t: number; roll: number; yoke: number; view: "captain" | "pov"; alarm: boolean }> = ({ t, roll, yoke, view, alarm }) => {
  const pfd = useMemo(() => canvasTex(512, 512), []);
  const eicas = useMemo(() => canvasTex(512, 512), []);
  const blink = alarm && Math.floor(t * 4) % 2 === 0;
  drawPFD(pfd.g, (roll * 180) / Math.PI, blink); pfd.t.needsUpdate = true;
  drawEICAS(eicas.g, blink); eicas.t.needsUpdate = true;
  const capCam: [number, number, number] = [0.95, 0.35, 0.65];
  return <group>
    <PostBox a={[0.5, -1.05, 0]} s={[4.2, 0.1, 3.4]} c="#3a3e4c" />
    {[1, -1].map((sd) => <mesh key={sd} geometry={sideWall} position={[0, 0, sd * 1.6]} material={toon("#4a4f60", { side: THREE.DoubleSide })} />)}
    <PostBox a={[0.5, 1.75, 0]} s={[4.2, 0.12, 3.4]} c="#3c4150" />
    <PostBox a={[0.6, 1.62, 0]} s={[1.6, 0.06, 1.2]} c="#262a35" />
    {Array.from({ length: 24 }, (_, i) => <mesh key={i} position={[0.05 + (i % 6) * 0.22, 1.585, -0.45 + Math.floor(i / 6) * 0.3]}><boxGeometry args={[0.06, 0.02, 0.06]} /><meshBasicMaterial color={i % 5 === 0 && alarm && blink ? "#ff3b30" : i % 3 ? "#d8dde8" : "#ffb020"} /></mesh>)}
    {/* windshield frame */}
    <PostBox a={[2.55, 1.55, 0]} s={[0.12, 0.16, 3.2]} />
    <PostBox a={[2.5, 0.95, 0]} s={[0.1, 1.2, 0.12]} />
    {[1, -1].map((sd) => <PostBox key={sd} a={[2.45, 0.95, sd * 1.05]} s={[0.1, 1.2, 0.12]} />)}
    {[1, -1].map((sd) => <PostBox key={sd} a={[2.35, 0.95, sd * 1.55]} s={[0.1, 1.3, 0.12]} />)}
    <PostBox a={[2.2, 0.38, 0]} s={[0.7, 0.18, 3.2]} c="#232733" />
    <PostBox a={[2.15, -0.25, 0]} s={[0.12, 1.1, 3.2]} c="#3d4352" />
    <mesh position={[2.08, -0.12, -0.75]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.5, 0.5]} /><meshBasicMaterial map={pfd.t} toneMapped={false} /></mesh>
    <mesh position={[2.08, -0.12, 0.75]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.5, 0.5]} /><meshBasicMaterial map={pfd.t} toneMapped={false} /></mesh>
    <mesh position={[2.08, -0.12, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.5, 0.5]} /><meshBasicMaterial map={eicas.t} toneMapped={false} /></mesh>
    {[1, -1].map((sd) => <mesh key={sd} position={[2.0, 0.42, sd * 0.6]}><boxGeometry args={[0.06, 0.07, 0.22]} /><meshBasicMaterial color={blink ? "#ff2a1f" : "#5a1410"} toneMapped={false} /></mesh>)}
    <PostBox a={[1.25, -0.62, 0]} s={[1.4, 0.8, 0.5]} c="#30343f" />
    {[-0.1, 0.1].map((z) => <PostBox key={z} a={[1.35, -0.12, z]} s={[0.08, 0.26, 0.06]} c="#c9ced8" />)}
    {/* yokes (turned hard against the roll) */}
    {[1, -1].map((sd) => <group key={sd} position={[1.55, 0, sd * 0.55]}>
      <PostBox a={[0, -0.55, 0]} s={[0.08, 0.9, 0.08]} c="#262a35" />
      <group position={[-0.05, -0.05, 0]} rotation={[yoke, 0, 0]}>
        <PostBox a={[0, 0, 0]} s={[0.06, 0.06, 0.4]} c="#1c1f28" />
        {[1, -1].map((h) => <PostBox key={h} a={[0, 0.09, h * 0.19]} s={[0.06, 0.2, 0.06]} c="#1c1f28" />)}
      </group>
    </group>)}
    {/* seats */}
    {[1, -1].map((sd) => <group key={sd}>
      <PostBox a={[0.2, 0.1, sd * 0.55]} s={[0.16, 1.1, 0.56]} c="#2b3040" />
      <PostBox a={[0.45, -0.52, sd * 0.55]} s={[0.55, 0.14, 0.56]} c="#2b3040" />
    </group>)}
    {view === "captain" && <Seated person={CAST.pilotA} ex={MAX_EXPR.scared.ex} pose="grip" at={[0.42, -0.45, -0.55]} cam={capCam} h={1.15} jitter={1} t={t} seed={3} />}
    {view === "pov" && [1, -1].map((sd) => <group key={sd} position={[0.36, 0.72, sd * 0.55]}>
      <mesh scale={[1, 1.08, 1]}><sphereGeometry args={[0.2, 20, 14]} /><primitive object={toon(sd === 1 ? "#241a14" : "#3a2a20")} attach="material" /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.215, 0.025, 6, 20, Math.PI]} /><primitive object={toon("#20222b")} attach="material" /></mesh>
      {[1, -1].map((e) => <mesh key={e} position={[0, 0, e * 0.2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.07, 0.07, 0.06, 14]} /><primitive object={toon("#2b2b36")} attach="material" /></mesh>)}
      <PostBox a={[0.02, -0.38, 0]} s={[0.3, 0.42, 0.52]} c="#f4f6fa" />
    </group>)}
  </group>;
};
