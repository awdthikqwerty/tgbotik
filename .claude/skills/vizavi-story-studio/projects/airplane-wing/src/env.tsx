// Sky, painted cloud sprites, cloud deck. Clouds and sky live on the NOINK layer (no outlines).
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { cloudHD, ctex, rep, rng } from "./post/paint";
import { NOINK } from "./post/ink";
import { lerp, smooth } from "./lib";

export type Pal = { top: string; mid: string; horizon: string; below: string; cloud: { lit: string; mid: string; shade: string }; fog: string };
export const PAL: Record<"day" | "storm" | "dusk" | "gold" | "lab", Pal> = {
  day: { top: "#2f6fd6", mid: "#6aaaf2", horizon: "#d9ecff", below: "#cfe0f6", cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" }, fog: "#d6e6fb" },
  storm: { top: "#28324f", mid: "#566684", horizon: "#a9b4c8", below: "#7a869f", cloud: { lit: "#d9dde8", mid: "#aab2c6", shade: "#7d86a2" }, fog: "#9aa6bc" },
  dusk: { top: "#1b1d44", mid: "#5a4f86", horizon: "#e2937a", below: "#5b4a78", cloud: { lit: "#f6c6ad", mid: "#b897bf", shade: "#6d5f90" }, fog: "#9a7a98" },
  gold: { top: "#3d5bbd", mid: "#f0a184", horizon: "#ffd9a2", below: "#f4c7a4", cloud: { lit: "#ffe3c0", mid: "#f6b39a", shade: "#b49ac8" }, fog: "#f5cfaa" },
  lab: { top: "#0b1430", mid: "#13254f", horizon: "#1f3b70", below: "#0b1430", cloud: { lit: "#ffffff", mid: "#ffffff", shade: "#ffffff" }, fog: "#13254f" },
};

/** Puts an object tree on the NOINK layer after every render (children can change). */
export const useNoInk = () => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => { ref.current?.traverse((o) => o.layers.set(NOINK)); });
  return ref;
};

export const SkyDome: React.FC<{ pal: Pal; radius?: number }> = ({ pal, radius = 4000 }) => {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(radius, 48, 24);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const top = new THREE.Color(pal.top), mid = new THREE.Color(pal.mid), hor = new THREE.Color(pal.horizon), below = new THREE.Color(pal.below), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / radius;
      if (y >= 0) { const k = Math.pow(y, 0.6); c.copy(hor).lerp(mid, Math.min(1, k * 2.2)).lerp(top, Math.max(0, (k - 0.4) / 0.6)); }
      else c.copy(hor).lerp(below, Math.min(1, -y * 4));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [pal, radius]);
  const ref = useNoInk();
  return <group ref={ref}><mesh geometry={geo} renderOrder={-10}><meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} /></mesh></group>;
};

const deckTex = (pal: Pal) => {
  const t = ctex(`deck_${pal.cloud.lit}`, 1024, 1024, (g, r) => {
    g.fillStyle = pal.cloud.mid; g.fillRect(0, 0, 1024, 1024);
    const blob = (col: string, n: number, rmin: number, rmax: number, blur: number, dy: number) => {
      g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const x = r() * 1024, y = r() * 1024, rad = rmin + r() * (rmax - rmin);
        for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) { g.beginPath(); g.arc(x + ox, y + oy + dy, rad, 0, Math.PI * 2); g.fill(); }
      }
      g.restore();
    };
    blob(pal.cloud.shade, 70, 30, 90, 14, 14);
    blob(pal.cloud.lit, 110, 25, 80, 10, 0);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

/** Endless sea of clouds far below, scrolling backwards (plane flies +x). */
export const CloudDeck: React.FC<{ pal: Pal; t: number; speed: number; y?: number }> = ({ pal, t, speed, y = -170 }) => {
  const tex = useMemo(() => { const k = deckTex(pal); rep(k, 14, 14); return k; }, [pal]);
  tex.offset.set(((speed * t) / (9000 / 14)) % 1, 0);
  const ref = useNoInk();
  return <group ref={ref}><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} renderOrder={-9}>
    <planeGeometry args={[9000, 9000]} /><meshBasicMaterial map={tex} fog depthWrite={false} />
  </mesh></group>;
};

/** Painted cumulus sprites drifting past (-x). Each wraps around `range` and fades in/out at the ends, so nothing pops. */
export const CloudSprites: React.FC<{ pal: Pal; t: number; speed: number; count?: number; seed?: number; y: [number, number]; z: [number, number]; range?: number; size?: [number, number]; x0?: number; opacity?: number }> = ({
  pal, t, speed, count = 26, seed = 1, y, z, range = 1400, size = [60, 160], x0 = 0, opacity = 1,
}) => {
  const tex = useMemo(() => [0, 1, 2, 3].map((k) => cloudHD(k + seed * 4, pal.cloud)), [pal, seed]);
  const items = useMemo(() => {
    const r = rng(seed * 101 + 7);
    return Array.from({ length: count }, () => ({ x: r() * range, y: lerp(y[0], y[1], r()), z: lerp(z[0], z[1], r()), s: lerp(size[0], size[1], r()), k: Math.floor(r() * 4) }));
  }, [seed, count, range, y[0], y[1], z[0], z[1], size[0], size[1]]);
  const ref = useNoInk();
  return <group ref={ref}>{items.map((it, i) => {
    const u = ((((it.x - speed * t) % range) + range) % range) / range;
    const a = smooth(0, 0.12, u) * (1 - smooth(0.88, 1, u)) * opacity;
    return <sprite key={i} position={[x0 + (u - 0.5) * range, it.y, it.z]} scale={[it.s, it.s * 0.5, 1]} renderOrder={-5}>
      <spriteMaterial map={tex[it.k]} transparent opacity={a} depthWrite={false} fog />
    </sprite>;
  })}</group>;
};

/** Standard high-altitude surroundings: dome + deck + two cloud layers. */
export const Skyscape: React.FC<{ pal: Pal; t: number; speed?: number; deckY?: number; dense?: boolean }> = ({ pal, t, speed = 60, deckY = -170, dense = false }) => (
  <>
    <SkyDome pal={pal} />
    <fog attach="fog" args={[pal.fog, 260, 3200]} />
    <CloudDeck pal={pal} t={t} speed={speed} y={deckY} />
    <CloudSprites pal={pal} t={t} speed={speed} seed={1} count={dense ? 40 : 28} y={[deckY + 30, deckY + 90]} z={[-900, 900]} range={2400} size={[160, 380]} />
    <CloudSprites pal={pal} t={t} speed={speed} seed={2} count={dense ? 26 : 16} y={[-60, 20]} z={[-500, -70]} range={1600} size={[70, 170]} />
    <CloudSprites pal={pal} t={t} speed={speed} seed={3} count={dense ? 26 : 16} y={[-60, 20]} z={[70, 500]} range={1600} size={[70, 170]} />
  </>
);
