import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame, Audio, staticFile, delayRender, continueRender } from 'remotion';
import * as T from 'three';

const W = 1080, H = 1920, FPS = 30, TOTAL = 1140;
const INK = '#241726';
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (a: number, b: number, t: number) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function cv(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function pen(c: HTMLCanvasElement) { const g = c.getContext('2d')!; g.lineJoin = 'round'; g.lineCap = 'round'; return g; }
function pth(g: CanvasRenderingContext2D, d: string, fill: string | null, stroke: string | null = INK, lw = 6) {
  const p = new Path2D(d);
  if (fill) { g.fillStyle = fill; g.fill(p); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(p); }
}
function ell(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, stroke: string | null = INK, lw = 5) {
  g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  g.fillStyle = fill; g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function seg(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, w: number) {
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = color; g.lineWidth = w; g.stroke();
}
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
/** ink-rimmed straight limb */
function limb(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number, color: string) {
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
  g.strokeStyle = INK; g.lineWidth = w + 7; g.lineCap = 'round'; g.stroke();
  g.strokeStyle = color; g.lineWidth = w; g.stroke();
}
/** soft-bowed arm segment with ink rim and cuff at the tip */
function armCurve(g: CanvasRenderingContext2D, sx: number, sy: number, hx: number, hy: number, bow: number, w: number, color: string) {
  const mx = (sx + hx) / 2 + bow, my = (sy + hy) / 2;
  for (const [col, lw] of [[INK, w + 7], [color, w]] as const) {
    g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(mx, my, hx, hy);
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.stroke();
  }
  const ang = Math.atan2(hy - my, hx - mx);
  g.save(); g.translate(hx, hy); g.rotate(ang);
  g.beginPath(); g.roundRect(-w * 0.3, -w * 0.62, w * 0.52, w * 1.24, 5);
  g.fillStyle = shade(color, 0.82); g.fill();
  g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
  g.restore();
}

type Expr = 'neutral' | 'nervous' | 'shocked' | 'happy' | 'smile' | 'soft' | 'speak';
type PersonOpts = {
  hair: string; hairStyle: 'short' | 'long' | 'bob';
  skin: string; eyes: string; cloth: string; pants: string; shoes: string;
  glasses?: boolean; scarf?: string; expr: Expr; phone?: boolean;
  armL?: number; armR?: number; lean?: number; walk?: number; mouthOpen?: number;
  blush?: number; scale?: number; detail?: 'boy' | 'girl';
};

function drawPerson(c: HTMLCanvasElement, o: PersonOpts) {
  const g = pen(c);
  g.clearRect(0, 0, c.width, c.height);
  g.save();
  g.translate(300, 480);
  g.scale(o.scale ?? 1, o.scale ?? 1);
  g.rotate((o.lean ?? 0) * 0.02);
  const bob = o.walk ? Math.abs(Math.sin(o.walk)) * 12 : 0;
  g.translate(0, -bob);

  const girl = o.detail === 'girl';
  const skinSh = shade(o.skin, 0.86);
  const clothSh = shade(o.cloth, 0.85);
  const hairSh = shade(o.hair, 0.78);
  const hairHi = shade(o.hair, 1.25);

  // ---- hair BACK (behind body): mane for long hair ----
  if (o.hairStyle === 'long') {
    pth(g, 'M -95 6 Q -120 120 -104 226 Q -62 254 -4 242 Q 52 254 96 226 Q 118 118 95 6 Q 112 -122 0 -136 Q -112 -122 -95 6 Z', o.hair, INK, 5);
    g.globalAlpha = 0.4;
    for (const s of [-1, 1]) pth(g, `M ${s * 66} -60 Q ${s * 98} 40 ${s * 80} 180 Q ${s * 58} 150 ${s * 56} 30 Q ${s * 56} -34 ${s * 66} -60 Z`, hairSh, null, 0);
    g.globalAlpha = 1;
  } else if (o.hairStyle === 'bob') {
    pth(g, 'M -93 -18 Q -110 66 -90 118 Q -48 140 0 128 Q 48 140 90 118 Q 110 66 93 -18 Q 100 -122 0 -136 Q -100 -122 -93 -18 Z', o.hair, INK, 5);
  }

  // ---- neck ----
  limb(g, 0, 30, 0, 74, 30, skinSh);

  // ---- legs ----
  const legSwing = o.walk ? Math.sin(o.walk) * 20 : 0;
  limb(g, -26, 296, -30 + legSwing, 428, 26, o.pants);
  limb(g, 26, 296, 30 - legSwing, 428, 26, o.pants);
  for (const fx of [-30 + legSwing, 30 - legSwing]) {
    pth(g, `M ${fx - 22} 424 L ${fx + 26} 424 Q ${fx + 34} 436 ${fx + 30} 446 L ${fx - 26} 446 Q ${fx - 28} 434 ${fx - 22} 424 Z`, o.shoes, INK, 4);
    pth(g, `M ${fx - 26} 446 L ${fx + 30} 446 L ${fx + 30} 440 L ${fx - 26} 440 Z`, '#ffffff', INK, 3);
  }

  // ---- torso: puffy winter coat ----
  pth(g, 'M -64 320 L 64 320 Q 88 210 78 112 Q 60 72 0 64 Q -60 72 -78 112 Q -88 210 -64 320 Z', o.cloth, INK, 6);
  g.globalAlpha = 0.28;
  for (let y = 104; y < 300; y += 42) {
    const wq = 0.55 + 0.45 * Math.sin(Math.PI * (y - 64) / 270);
    seg(g, -72 * wq, y, 72 * wq, y, shade(o.cloth, 0.72), 5);
  }
  g.globalAlpha = 1;
  if (girl) {
    pth(g, 'M -66 240 Q 0 258 66 240 L 60 266 Q 0 282 -60 266 Z', clothSh, INK, 3.5);
  } else {
    seg(g, 0, 80, 0, 314, clothSh, 7);
    for (const yb of [142, 192, 242]) ell(g, 0, yb, 5, 6, '#ece5d2', INK, 2.5);
  }
  if (o.scarf) {
    pth(g, 'M -58 68 Q 0 40 58 68 Q 64 94 52 106 Q 0 82 -52 106 Q -64 94 -58 68 Z', o.scarf, INK, 4.5);
    pth(g, 'M 24 98 L 42 94 Q 46 122 38 150 L 18 148 Q 26 124 24 98 Z', shade(o.scarf, 0.92), INK, 4);
    pth(g, 'M -32 100 L -14 98 Q -12 126 -18 148 L -36 146 Q -32 124 -32 100 Z', o.scarf, INK, 4);
  }

  // ---- arms: shoulder→elbow→hand with ink rim + cuffs ----
  const sy = 104, upper = 96, lower = 92;
  const aL = o.armL ?? -0.32, aR = o.armR ?? 0.34;
  for (const [s, a] of [[-1, aL], [1, aR]] as const) {
    const ex = s * (14 + 46 * Math.abs(a));
    const ey = sy + upper * (0.9 - a * 0.34);
    const hx = s * (52 + 96 * Math.max(0, a));
    const hy = ey + lower * (1 - a * 0.26);
    armCurve(g, s * 54, sy, ex, ey, s * 6, 21, o.cloth);
    armCurve(g, ex, ey, hx, hy, s * 7, 17, o.cloth);
    ell(g, hx, hy - 2, 14, 15, o.skin, INK, 3.5);
    ell(g, hx - s * 10, hy - 9, 5, 7, o.skin, null, 0);
  }

  // ---- phone in hand (with mini chat UI) ----
  if (o.phone) {
    const a = aR;
    const hx = 52 + 96 * Math.max(0, a);
    const ey = sy + upper * (0.9 - a * 0.34);
    const hy = ey + lower * (1 - a * 0.26);
    g.save();
    g.translate(hx + 6, hy - 36);
    g.rotate(-0.2);
    pth(g, 'M -21 -35 L 21 -35 L 21 35 L -21 35 Z', '#20263a', INK, 3.5);
    pth(g, 'M -17 -31 L 17 -31 L 17 31 L -17 31 Z', '#d8e8f8', null, 0);
    pth(g, 'M 2 -28 Q 16 -27 16 -21 Q 16 -15 4 -14 L 0 -11 L 1 -15 Q -2 -18 2 -28 Z', '#f4f8fc', '#8a97ab', 2);
    pth(g, 'M -16 -8 Q -3 -10 1 -4 Q 2 3 -8 4 L -13 7 L -12 3 Q -17 0 -16 -8 Z', '#2e6fd8', null, 0);
    pth(g, 'M 2 8 Q 16 6 16 12 Q 16 19 2 19 L -3 22 L -2 18 Q -2 10 2 8 Z', '#2e6fd8', null, 0);
    g.restore();
  }

  // ---- head ----
  pth(g, 'M -79 -4 Q -84 -100 0 -114 Q 84 -100 79 -4 Q 74 46 0 58 Q -74 46 -79 -4 Z', o.skin, INK, 6);
  if (!girl) {
    ell(g, -79, -2, 9, 14, o.skin, INK, 3);
    ell(g, 79, -2, 9, 14, o.skin, INK, 3);
  }

  // ---- hair top ----
  if (o.hairStyle === 'long') {
    // Maja: crown + side-swept fringe + face locks + shine
    pth(g, 'M -83 -12 Q -96 -110 0 -126 Q 96 -110 85 -16 Q 78 -64 42 -82 Q 8 -70 -22 -82 Q -60 -66 -83 -12 Z', o.hair, INK, 5);
    pth(g, 'M -58 -36 Q -12 -98 48 -84 Q 78 -74 85 -24 Q 54 -60 8 -52 Q -34 -46 -58 -36 Z', hairSh, INK, 3.5);
    pth(g, 'M -85 -8 Q -102 56 -88 128 L -64 116 Q -76 42 -66 -22 Z', o.hair, INK, 4);
    pth(g, 'M 85 -8 Q 102 56 88 128 L 64 116 Q 76 42 66 -22 Z', o.hair, INK, 4);
    g.globalAlpha = 0.55;
    pth(g, 'M -52 -96 Q 0 -118 54 -92 Q 28 -104 -4 -104 Q -34 -102 -52 -96 Z', hairHi, null, 0);
    g.globalAlpha = 1;
  } else if (o.hairStyle === 'bob') {
    pth(g, 'M -87 -20 Q -98 -114 -2 -128 Q 96 -116 90 -28 Q 80 -68 34 -84 Q 0 -72 -28 -82 Q -66 -70 -87 -20 Z', o.hair, INK, 5);
    pth(g, 'M -50 -38 Q -6 -100 52 -86 Q 78 -76 90 -30 Q 56 -62 6 -54 Q -32 -48 -50 -38 Z', hairSh, INK, 3.5);
  } else {
    // Denis: textured short cut with zigzag fringe
    pth(g, 'M -80 -10 Q -90 -108 -2 -124 Q 90 -112 84 -22 Q 76 -50 62 -58 L 50 -38 L 38 -62 L 24 -40 L 10 -64 L -6 -38 L -22 -64 L -36 -40 L -50 -60 L -62 -36 Q -74 -40 -80 -10 Z', o.hair, INK, 4.5);
    pth(g, 'M -66 -78 Q -30 -112 24 -108 Q 60 -104 78 -72 Q 40 -92 -6 -86 Q -46 -82 -66 -78 Z', hairSh, INK, 3);
  }

  // ---- eyes: big, shiny ----
  const eyeY = 0;
  const shock = o.expr === 'shocked';
  for (const s of [-1, 1]) {
    pth(g, `M ${s * 30 - 13} ${eyeY - 6} Q ${s * 30} ${eyeY - 22} ${s * 30 + 13} ${eyeY - 6} Q ${s * 30 + 13} ${eyeY + 14} ${s * 30} ${eyeY + 15} Q ${s * 30 - 13} ${eyeY + 14} ${s * 30 - 13} ${eyeY - 6} Z`, '#ffffff', INK, 3.5);
    ell(g, s * 30, eyeY + 2, shock ? 7 : 8.5, shock ? 8 : 9.5, o.eyes, null, 0);
    ell(g, s * 30, eyeY + 2.5, 4.2, 4.6, '#2a1d24', null, 0);
    ell(g, s * 30 - s * 3, eyeY - 2, 3.2, 3.2, '#ffffff', null, 0);
    ell(g, s * 30 + s * 5, eyeY + 7, 1.8, 1.8, '#ffffff', null, 0);
    if (girl) pth(g, `M ${s * 30 - 14} ${eyeY - 8} Q ${s * 30 - 6} ${eyeY - 20} ${s * 30 + 12} ${eyeY - 18} Q ${s * 30 + 2} ${eyeY - 13} ${s * 30 - 14} ${eyeY - 8} Z`, o.hair, null, 0);
  }

  // ---- glasses (Denis) ----
  if (o.glasses) {
    ell(g, -32, eyeY + 1, 22, 20, 'rgba(210,240,255,0.16)', '#332f3d', 4.5);
    ell(g, 32, eyeY + 1, 22, 20, 'rgba(210,240,255,0.16)', '#332f3d', 4.5);
    seg(g, -11, eyeY - 2, 11, eyeY - 2, '#332f3d', 4);
    seg(g, -53, eyeY - 4, -72, eyeY - 10, '#332f3d', 3.5);
    seg(g, 53, eyeY - 4, 72, eyeY - 10, '#332f3d', 3.5);
  }

  // ---- brows ----
  const browY = eyeY - 36;
  if (o.expr === 'nervous' || o.expr === 'shocked') {
    pth(g, `M -46 ${browY + 6} Q -28 ${browY + 12} -12 ${browY - 4}`, null, INK, 5);
    pth(g, `M 12 ${browY - 4} Q 28 ${browY + 12} 46 ${browY + 6}`, null, INK, 5);
  } else {
    pth(g, `M -46 ${browY - 1} Q -28 ${browY - 9} -12 ${browY - 5}`, null, INK, 5);
    pth(g, `M 12 ${browY - 5} Q 28 ${browY - 9} 46 ${browY - 1}`, null, INK, 5);
  }

  // ---- nose + mouth ----
  ell(g, 0, 22, 4, 5, skinSh, null, 0);
  const mY = 40;
  const open = o.mouthOpen ?? 0;
  if (shock || open > 0.35) {
    ell(g, 0, mY, 10 + open * 7, 7 + open * 11, '#7a3040', INK, 3);
    pth(g, `M 0 ${mY + 10 + open * 6} Q 6 ${mY + 4} 0 ${mY} Q -6 ${mY + 4} 0 ${mY + 10 + open * 6} Z`, '#c06070', null, 0);
  } else if (o.expr === 'happy') {
    pth(g, `M -22 ${mY - 4} Q 0 ${mY + 20} 22 ${mY - 4} Q 0 ${mY + 8} -22 ${mY - 4} Z`, '#8a3a46', INK, 3);
  } else if (o.expr === 'smile' || o.expr === 'soft') {
    pth(g, `M -19 ${mY - 2} Q 0 ${mY + 14} 19 ${mY - 2}`, null, INK, 4);
  } else if (o.expr === 'nervous') {
    pth(g, `M -14 ${mY + 2} Q 0 ${mY - 6} 14 ${mY + 2}`, null, INK, 4);
  } else if (o.expr === 'speak') {
    ell(g, 0, mY + 2, 8, 6 + open * 8, '#8a3a46', INK, 3);
  } else {
    seg(g, -11, mY + 1, 11, mY + 1, INK, 4);
  }

  // ---- blush ----
  const bl = o.blush ?? 0;
  if (bl > 0) {
    g.globalAlpha = 0.3 * bl;
    ell(g, -56, 26, 15, 9, '#ee9a9a', null, 0);
    ell(g, 56, 26, 15, 9, '#ee9a9a', null, 0);
    g.globalAlpha = 1;
  }
  g.restore();
}

// ---------------- textures ----------------
function texCanvas(type: string) {
  const c = cv(512, 512), g = pen(c);
  if (type === 'wood') {
    g.fillStyle = '#8a6748'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 512; i += 64) {
      g.fillStyle = i % 128 ? '#7a5a3e' : '#947051';
      g.fillRect(0, i, 512, 58);
      g.strokeStyle = '#5b4331'; g.lineWidth = 3; g.strokeRect(0, i, 512, 60);
    }
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(60,40,25,${0.04 + (i % 5) * 0.02})`; g.fillRect((i * 137) % 512, (i * 89) % 512, 60, 3); }
  } else if (type === 'wallpaper') {
    // cool dusty blue, contrasts with the warm lamp
    g.fillStyle = '#7d90ae'; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 36) for (let x = 0; x < 512; x += 36) {
      g.fillStyle = (x / 36 + y / 36) % 2 ? '#758aa8' : '#8598b4';
      g.fillRect(x, y, 35, 35);
      g.strokeStyle = 'rgba(58,72,98,.18)'; g.lineWidth = 1; g.strokeRect(x, y, 36, 36);
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(255,255,255,.05)';
      g.beginPath(); g.arc((i * 89) % 512, (i * 57) % 512, 2 + (i % 3), 0, 7); g.fill();
    }
  } else if (type === 'brick') {
    g.fillStyle = '#6d4a44'; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 44) for (let x = 0; x < 512; x += 84) {
      g.fillStyle = `rgb(${104 + (y % 40)},${64 + (x % 30)},${58 + (y % 24)})`;
      g.fillRect(x + (y % 88 ? 42 : 0), y, 80, 40);
    }
  } else if (type === 'snow') {
    g.fillStyle = '#eef5fa'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 220; i++) {
      g.fillStyle = i % 3 ? 'rgba(255,255,255,.65)' : 'rgba(196,218,236,.45)';
      g.beginPath(); g.arc((i * 97) % 512, (i * 53) % 512, 2 + (i % 5), 0, 7); g.fill();
    }
  } else if (type === 'snowpath') {
    g.fillStyle = '#dfeaf2'; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 96) {
      g.fillStyle = `rgb(${188 + (y % 26)},${198 + (x % 20)},${210 + (y % 18)})`;
      g.beginPath(); g.roundRect(x + (y % 128 ? 46 : 0), y + 8, 86, 48, 12); g.fill();
      g.strokeStyle = 'rgba(120,140,165,.22)'; g.lineWidth = 2; g.stroke();
    }
  } else if (type === 'stone') {
    g.fillStyle = '#b8b8b2'; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 56) for (let x = 0; x < 512; x += 72) {
      g.fillStyle = `rgb(${172 + (y % 30)},${172 + (x % 24)},${168 + (y % 18)})`;
      g.beginPath(); g.roundRect(x + (y % 112 ? 36 : 0), y, 68, 52, 14); g.fill();
    }
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(type === 'snowpath' ? 1 : 2, type === 'snowpath' ? 6 : 2);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}

function edgeMesh(geo: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number, parent: T.Object3D, lineMat: T.LineBasicMaterial) {
  const m = new T.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  const e = new T.LineSegments(new T.EdgesGeometry(geo, 30), lineMat);
  m.add(e);
  return m;
}
function cardMesh(tx: T.CanvasTexture, w: number, h: number) {
  return new T.Mesh(
    new T.PlaneGeometry(w, h),
    new T.MeshBasicMaterial({ map: tx, transparent: true, alphaTest: 0.1, depthWrite: true, side: T.DoubleSide })
  );
}
function shadowTex() {
  const c = cv(128, 128), g = pen(c);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(24,22,40,.42)'); gr.addColorStop(1, 'rgba(24,22,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new T.CanvasTexture(c);
}

// ---------------- fireworks sprite ----------------
function makeFireworks() {
  const c = cv(512, 512), g = pen(c);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  const sprite = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 1 }));
  const bursts = [
    { t0: 14.9, col: '#ffd27a', n: 22, r: 205 },
    { t0: 15.7, col: '#ff9a9a', n: 18, r: 180 },
    { t0: 16.6, col: '#a0d8ff', n: 22, r: 210 },
    { t0: 17.5, col: '#ffe08a', n: 24, r: 220 },
    { t0: 18.4, col: '#ffb0c8', n: 20, r: 195 }
  ];
  return {
    sprite,
    update(time: number) {
      g.clearRect(0, 0, 512, 512);
      const cx = 256, cy = 256;
      let any = false;
      for (const b of bursts) {
        const age = time - b.t0;
        if (age < 0 || age > 1.9) continue;
        any = true;
        const k = age / 1.9;
        const alpha = Math.pow(1 - k, 1.2);
        // glow core
        const grd = g.createRadialGradient(cx, cy, 0, cx, cy, b.r * 0.5);
        grd.addColorStop(0, b.col + '55'); grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = alpha * 0.7; g.fillStyle = grd;
        g.fillRect(0, 0, 512, 512);
        for (let i = 0; i < b.n; i++) {
          const a = (i / b.n) * Math.PI * 2 + b.t0;
          const r = b.r * (0.15 + k * 0.85);
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          g.globalAlpha = alpha;
          g.fillStyle = b.col;
          g.beginPath(); g.arc(x, y, 6 + (1 - k) * 6, 0, 7); g.fill();
          g.strokeStyle = b.col; g.lineWidth = 3.5;
          g.beginPath(); g.moveTo(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45); g.lineTo(x, y); g.stroke();
        }
        g.globalAlpha = 1;
      }
      sprite.visible = any;
      t.needsUpdate = true;
    }
  };
}

// ---------------- room ----------------
function makeRoom() {
  const scene = new T.Scene();
  scene.background = new T.Color('#222c44');
  scene.fog = new T.Fog('#222c44', 10, 30);
  scene.add(new T.HemisphereLight('#a8c0e8', '#2e2842', 1.05));
  const lamp = new T.PointLight('#ffb56b', 26, 16, 2);
  lamp.position.set(-2.4, 3.0, 1.2); scene.add(lamp);
  const moon = new T.DirectionalLight('#a8c8ff', 1.8);
  moon.position.set(4, 6, -4); scene.add(moon);
  const phoneGlow = new T.PointLight('#bcdcff', 4.0, 3.2, 2);
  phoneGlow.position.set(0.2, 1.35, 1.6); scene.add(phoneGlow);

  const lineMat = new T.LineBasicMaterial({ color: '#2b2436', transparent: true, opacity: 0.55 });
  const wood = new T.MeshStandardMaterial({ map: texCanvas('wood'), roughness: 0.92 });
  const wall = new T.MeshStandardMaterial({ map: texCanvas('wallpaper'), roughness: 1 });
  const g = new T.Group(); scene.add(g);

  edgeMesh(new T.BoxGeometry(12, 0.2, 12), wood, 0, -0.1, 0, g, lineMat);
  edgeMesh(new T.BoxGeometry(12, 5.2, 0.2), wall, 0, 2.6, -3.2, g, lineMat);
  edgeMesh(new T.BoxGeometry(0.2, 5.2, 9), wall, -5.5, 2.6, 0.6, g, lineMat);
  edgeMesh(new T.BoxGeometry(0.2, 5.2, 9), wall, 5.5, 2.6, 0.6, g, lineMat);

  // window (back wall, left of centre so the camera sees it)
  const win = new T.Group(); win.position.set(1.9, 2.9, -3.06); g.add(win);
  edgeMesh(new T.BoxGeometry(3.1, 2.6, 0.12), new T.MeshStandardMaterial({ color: '#f2e6d2', roughness: 0.8 }), 0, 0, 0, win, lineMat);
  const sky = new T.Mesh(new T.PlaneGeometry(2.7, 2.3), new T.MeshBasicMaterial({ color: '#101a38' }));
  sky.position.z = 0.08; win.add(sky);
  edgeMesh(new T.BoxGeometry(0.07, 2.4, 0.07), new T.MeshStandardMaterial({ color: '#f2e6d2' }), 0, 0, 0.12, win, lineMat);
  edgeMesh(new T.BoxGeometry(2.8, 0.07, 0.07), new T.MeshStandardMaterial({ color: '#f2e6d2' }), 0, 0, 0.12, win, lineMat);
  const curt = new T.MeshStandardMaterial({ color: '#7a4a5a', roughness: 0.95 });
  edgeMesh(new T.BoxGeometry(0.55, 2.9, 0.12), curt, -1.78, 0, 0.2, win, lineMat);
  edgeMesh(new T.BoxGeometry(0.55, 2.9, 0.12), curt, 1.78, 0, 0.2, win, lineMat);

  // fireworks visible in the window gap (between sky plane and window frame)
  const fw = makeFireworks();
  fw.sprite.position.set(1.9, 2.95, -3.35);
  fw.sprite.scale.set(2.9, 2.9, 1);
  g.add(fw.sprite);

  // bed
  const bed = new T.Group(); bed.position.set(-2.9, 0, -1.2); g.add(bed);
  edgeMesh(new T.BoxGeometry(2.6, 0.8, 1.5), new T.MeshStandardMaterial({ color: '#5a4a6a', roughness: 1 }), 0, 0.42, 0, bed, lineMat);
  edgeMesh(new T.BoxGeometry(2.5, 0.32, 1.4), new T.MeshStandardMaterial({ color: '#e8d8e0', roughness: 1 }), 0, 0.95, 0, bed, lineMat);
  edgeMesh(new T.BoxGeometry(0.9, 0.3, 0.6), new T.MeshStandardMaterial({ color: '#d85f6a', roughness: 1 }), 0.7, 1.12, 0, bed, lineMat);
  edgeMesh(new T.BoxGeometry(2.6, 1.5, 0.2), new T.MeshStandardMaterial({ color: '#4a3a58', roughness: 1 }), 0, 1.05, -0.75, bed, lineMat);

  // desk
  const desk = new T.Group(); desk.position.set(2.1, 0, 0.9); g.add(desk);
  edgeMesh(new T.BoxGeometry(2.2, 0.12, 1.0), wood, 0, 1.05, 0, desk, lineMat);
  for (const sx of [-0.95, 0.95]) for (const sz of [-0.4, 0.4])
    edgeMesh(new T.BoxGeometry(0.12, 1.0, 0.12), wood, sx, 0.5, sz, desk, lineMat);
  edgeMesh(new T.BoxGeometry(1.2, 0.72, 0.08), new T.MeshStandardMaterial({ color: '#22242e' }), 0, 1.62, -0.1, desk, lineMat);
  const screen = new T.Mesh(new T.PlaneGeometry(1.1, 0.62), new T.MeshBasicMaterial({ color: '#9fc8e8' }));
  screen.position.set(0, 1.62, -0.04); desk.add(screen);

  // rug for colour
  const rug = new T.Mesh(new T.PlaneGeometry(3.4, 2.4), new T.MeshStandardMaterial({ color: '#8a4a56', roughness: 1 }));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0.3, 0.015, 1.5); g.add(rug);

  // string lights
  const bulbMat = new T.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb050', emissiveIntensity: 2.4 });
  for (let i = 0; i < 9; i++) {
    const b = new T.Mesh(new T.SphereGeometry(0.075, 8, 6), bulbMat);
    b.position.set(-2.2 + i * 0.55, 3.9 - Math.cos(i * 0.7) * 0.14, 1.4);
    g.add(b);
  }

  // poster
  edgeMesh(new T.BoxGeometry(0.9, 1.3, 0.04), new T.MeshStandardMaterial({ color: '#3d5a8a' }), -1.4, 2.6, -3.06, g, lineMat);

  const shMat = new T.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false });
  const shadow = (x: number, z: number, w: number, d: number) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, d), shMat.clone());
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); g.add(m); return m;
  };

  const kc = cv(600, 1000);
  const kt = new T.CanvasTexture(kc);
  kt.colorSpace = T.SRGBColorSpace; kt.minFilter = T.LinearFilter; kt.magFilter = T.LinearFilter;
  const den = cardMesh(kt, 2.6, 4.33);
  den.position.set(-0.2, 2.17, 1.1);
  g.add(den);
  shadow(-0.2, 1.1, 1.8, 1.05);

  return {
    scene, den, kc, kt, fireworks: fw,
    camera: new T.PerspectiveCamera(42, W / H, 0.1, 60),
    update(t: number) {
      const nervous = ease(4.8, 5.4, t) * (1 - ease(8.8, 9.4, t));
      const typing = ease(10.2, 10.8, t) * (1 - ease(14.2, 14.8, t));
      const sent = ease(14.2, 14.8, t);
      const expr: Expr = sent > 0.4 ? 'soft' : nervous > 0.4 ? 'nervous' : 'neutral';
      drawPerson(kc, {
        hair: '#4a3324', hairStyle: 'short', skin: '#f0c9a8', eyes: '#5a3a1e',
        cloth: '#3a4a6b', pants: '#2f3a52', shoes: '#e8e8f0',
        glasses: true, expr, phone: t < 10.6,
        armL: -0.32 + nervous * 0.2, armR: 0.42 + typing * 0.5,
        lean: nervous * 0.3 - sent * 0.12,
        mouthOpen: typing * 0.12, blush: sent * 0.55, detail: 'boy'
      });
      kt.needsUpdate = true;
      den.quaternion.copy(this.camera.quaternion);
      this.fireworks.update(t);
    }
  };
}

// ---------------- square ----------------
function makeSquare() {
  const scene = new T.Scene();
  scene.background = new T.Color('#0d1530');
  scene.fog = new T.Fog('#16224a', 16, 50);
  scene.add(new T.HemisphereLight('#7f96d8', '#1c1a34', 1.15));
  const moon = new T.DirectionalLight('#c0d4ff', 1.9);
  moon.position.set(-6, 12, 4); scene.add(moon);
  const lineMat = new T.LineBasicMaterial({ color: '#2a2440', transparent: true, opacity: 0.5 });
  const g = new T.Group(); scene.add(g);

  const ground = new T.Mesh(new T.PlaneGeometry(60, 60), new T.MeshStandardMaterial({ map: texCanvas('snow'), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; g.add(ground);
  const street = new T.Mesh(new T.PlaneGeometry(8, 40), new T.MeshStandardMaterial({ color: '#3a3a48', roughness: 0.85 }));
  street.rotation.x = -Math.PI / 2; street.position.set(0, 0.01, -10); g.add(street);

  const wallMat = new T.MeshStandardMaterial({ map: texCanvas('brick'), roughness: 1 });
  const winMat = new T.MeshBasicMaterial({ color: '#ffcf7a' });
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (5.5 + (i % 3) * 2.5);
    const z = -3 - i * 5;
    const h = 8 + (i % 3) * 2.5;
    const w = 4.2 + (i % 2) * 1.2;
    edgeMesh(new T.BoxGeometry(w, h, 4), wallMat, x, h / 2, z, g, lineMat);
    for (let wy = 1.8; wy < h - 1; wy += 2.2) for (let wx = -w / 2 + 1; wx < w / 2; wx += 1.6) {
      if (((i * 7 + wy * 3 + wx * 5) | 0) % 3 === 0) continue;
      const wm = new T.Mesh(new T.PlaneGeometry(0.55, 0.85), winMat);
      wm.position.set(x + wx, wy, z + 2.02); g.add(wm);
    }
    edgeMesh(new T.BoxGeometry(w + 0.3, 0.3, 4.3), new T.MeshStandardMaterial({ color: '#eaf3f8', roughness: 1 }), x, h + 0.15, z, g, lineMat);
  }

  const lampMat = new T.MeshStandardMaterial({ color: '#2a2a34' });
  const bulbMat = new T.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb050', emissiveIntensity: 2.6 });
  for (const [x, z] of [[-4.8, 1.5], [4.8, -3], [-4.8, -10], [4.8, -14]]) {
    edgeMesh(new T.CylinderGeometry(0.08, 0.11, 4.2, 8), lampMat, x, 2.1, z, g, lineMat);
    const b = new T.Mesh(new T.SphereGeometry(0.24, 10, 8), bulbMat);
    b.position.set(x, 4.3, z); g.add(b);
    const pl = new T.PointLight('#ffb56b', 9, 11, 2); pl.position.set(x, 4.2, z); g.add(pl);
  }

  const fw = makeFireworks();
  fw.sprite.position.set(0.3, 5.6, -17);
  fw.sprite.scale.set(11, 11, 1);
  scene.add(fw.sprite);

  const mc = cv(600, 1000), fc = cv(600, 1000);
  const mt = new T.CanvasTexture(mc), ft = new T.CanvasTexture(fc);
  for (const x of [mt, ft]) { x.colorSpace = T.SRGBColorSpace; x.minFilter = T.LinearFilter; x.magFilter = T.LinearFilter; }
  const maja = cardMesh(mt, 2.4, 4.0); maja.position.set(-0.6, 2.0, 2.0); g.add(maja);
  const friend = cardMesh(ft, 2.3, 3.83); friend.position.set(0.65, 1.92, 1.7); g.add(friend);

  return {
    scene, maja, friend, mc, fc, mt, ft, fireworks: fw,
    camera: new T.PerspectiveCamera(42, W / H, 0.1, 80),
    update(t: number) {
      const shock = ease(15.9, 16.3, t) * (1 - ease(17.2, 17.7, t));
      const joy = ease(17.4, 18.1, t);
      const expr: Expr = joy > 0.35 ? 'happy' : shock > 0.3 ? 'shocked' : 'smile';
      drawPerson(mc, {
        hair: '#a8703f', hairStyle: 'long', skin: '#f5d0b0', eyes: '#3f7d4a',
        cloth: '#d98f8a', pants: '#3a3a52', shoes: '#f0e8e0',
        scarf: '#f2d8c0', expr, phone: t < 17.0,
        armL: shock * 0.5 + joy * 0.2, armR: t < 17.0 ? 0.55 : joy * 1.35,
        lean: -shock * 0.18, mouthOpen: shock * 0.75 + joy * 0.25,
        blush: 0.8 * joy, detail: 'girl'
      });
      drawPerson(fc, {
        hair: '#3a2a2a', hairStyle: 'bob', skin: '#ecc8a8', eyes: '#4a3a2e',
        cloth: '#6a7ea8', pants: '#2f3a52', shoes: '#e8e8f0',
        scarf: '#a8c0e0', expr: 'smile', phone: false,
        armL: -0.4, armR: joy * 1.2, lean: Math.sin(t * 1.4) * 0.03,
        mouthOpen: joy * 0.3, blush: 0.35, detail: 'girl'
      });
      mt.needsUpdate = true; ft.needsUpdate = true;
      maja.quaternion.copy(this.camera.quaternion);
      friend.quaternion.copy(this.camera.quaternion);
      this.fireworks.update(t);
    }
  };
}

// ---------------- park ----------------
function makePark() {
  const scene = new T.Scene();
  scene.background = new T.Color('#ccdfe9');
  scene.fog = new T.Fog('#e2e4e2', 26, 80);
  scene.add(new T.HemisphereLight('#fff6e6', '#9aabbe', 2.0));
  const sun = new T.DirectionalLight('#ffcb90', 2.6);
  sun.position.set(-8, 10, 6); scene.add(sun);
  const lineMat = new T.LineBasicMaterial({ color: '#3a3444', transparent: true, opacity: 0.55 });
  const g = new T.Group(); scene.add(g);

  const ground = new T.Mesh(new T.PlaneGeometry(90, 90), new T.MeshStandardMaterial({ map: texCanvas('snow'), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; g.add(ground);
  const path = new T.Mesh(new T.PlaneGeometry(5, 70), new T.MeshStandardMaterial({ map: texCanvas('snowpath'), roughness: 0.95 }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.012, -14); g.add(path);

  const trunk = new T.MeshStandardMaterial({ color: '#6a4a3a', roughness: 1 });
  const needle = new T.MeshStandardMaterial({ color: '#3f7a58', roughness: 1 });
  const needle2 = new T.MeshStandardMaterial({ color: '#4f8a64', roughness: 1 });
  const snowCap = new T.MeshStandardMaterial({ color: '#eef6fa', roughness: 1 });
  for (let i = 0; i < 12; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (4.6 + (i % 3) * 1.7);
    const z = 3 - i * 4.6;
    edgeMesh(new T.CylinderGeometry(0.22, 0.36, 3.2, 7), trunk, x, 1.6, z, g, lineMat);
    edgeMesh(new T.ConeGeometry(1.55, 2.3, 8), needle, x, 3.4, z, g, lineMat);
    edgeMesh(new T.ConeGeometry(1.2, 1.9, 8), needle2, x, 4.5, z, g, lineMat);
    edgeMesh(new T.ConeGeometry(0.82, 1.35, 8), snowCap, x, 5.35, z, g, lineMat);
  }

  const bench = new T.Group(); bench.position.set(3.4, 0, 3.6); g.add(bench);
  const benchMat = new T.MeshStandardMaterial({ color: '#7a5a44', roughness: 0.9 });
  edgeMesh(new T.BoxGeometry(2.8, 0.14, 0.6), benchMat, 0, 0.62, 0, bench, lineMat);
  edgeMesh(new T.BoxGeometry(2.8, 0.62, 0.14), benchMat, 0, 1.02, -0.3, bench, lineMat);
  for (const sx of [-1.2, 1.2]) edgeMesh(new T.BoxGeometry(0.1, 0.62, 0.55), new T.MeshStandardMaterial({ color: '#3a3030' }), sx, 0.31, 0, bench, lineMat);

  edgeMesh(new T.CylinderGeometry(0.08, 0.1, 2.9, 8), new T.MeshStandardMaterial({ color: '#2a2a34' }), -3.4, 1.45, 1.2, g, lineMat);
  const bulb = new T.Mesh(new T.SphereGeometry(0.2, 10, 8), new T.MeshStandardMaterial({ color: '#ffe0a0', emissive: '#ffc060', emissiveIntensity: 1.6 }));
  bulb.position.set(-3.4, 2.95, 1.2); g.add(bulb);

  // snow particles
  const count = 300;
  const snowGeo = new T.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 30;
    pos[i * 3 + 1] = Math.random() * 13;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 30 + 2;
  }
  snowGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const snow = new T.Points(snowGeo, new T.PointsMaterial({ color: '#ffffff', size: 0.1, transparent: true, opacity: 0.9, depthWrite: false }));
  g.add(snow);

  const dc = cv(600, 1000), mc = cv(600, 1000);
  const dt = new T.CanvasTexture(dc), mt = new T.CanvasTexture(mc);
  for (const x of [dt, mt]) { x.colorSpace = T.SRGBColorSpace; x.minFilter = T.LinearFilter; x.magFilter = T.LinearFilter; }
  const den = cardMesh(dt, 2.4, 4.0); den.position.set(-0.85, 2.0, 2.2); g.add(den);
  const maja = cardMesh(mt, 2.3, 3.83); maja.position.set(0.9, 1.92, 2.2); g.add(maja);

  const shMat = new T.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false });
  for (const x of [-0.85, 0.9]) {
    const m = new T.Mesh(new T.PlaneGeometry(1.5, 0.85), shMat.clone());
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, 2.2); g.add(m);
  }

  let phase = 0;
  return {
    scene, den, maja, dc, mc, dt, mt, snowGeo, count,
    camera: new T.PerspectiveCamera(42, W / H, 0.1, 100),
    update(t: number, dtSec: number) {
      const nervous = ease(23.0, 24.2, t) * (1 - ease(30.6, 31.4, t));
      const warmth = ease(31.0, 32.6, t);
      drawPerson(dc, {
        hair: '#4a3324', hairStyle: 'short', skin: '#f0c9a8', eyes: '#5a3a1e',
        cloth: '#3a4a6b', pants: '#2f3a52', shoes: '#e8e8f0',
        glasses: true, expr: warmth > 0.45 ? 'happy' : nervous > 0.3 ? 'nervous' : 'neutral',
        phone: false, armL: -0.3 + nervous * 0.2, armR: 0.35 - nervous * 0.2,
        lean: -nervous * 0.12 + warmth * 0.08,
        mouthOpen: warmth * 0.15, blush: warmth * 0.65, detail: 'boy'
      });
      drawPerson(mc, {
        hair: '#a8703f', hairStyle: 'long', skin: '#f5d0b0', eyes: '#3f7d4a',
        cloth: '#d98f8a', pants: '#3a3a52', shoes: '#f0e8e0',
        scarf: '#f2d8c0', expr: warmth > 0.45 ? 'happy' : 'smile',
        phone: false, armL: -0.3, armR: 0.3 - warmth * 0.28,
        lean: Math.sin(t * 1.2) * 0.02 + warmth * 0.07,
        blush: 0.55 + warmth * 0.35, mouthOpen: warmth * 0.12, detail: 'girl'
      });
      dt.needsUpdate = true; mt.needsUpdate = true;
      den.quaternion.copy(this.camera.quaternion);
      maja.quaternion.copy(this.camera.quaternion);
      phase += dtSec * 1.1;
      const p = snowGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        p[i * 3 + 1] -= dtSec * (0.55 + (i % 5) * 0.11);
        p[i * 3] += Math.sin(phase + i) * dtSec * 0.14;
        if (p[i * 3 + 1] < 0) { p[i * 3 + 1] = 13; p[i * 3] = (Math.random() - 0.5) * 30; }
      }
      snowGeo.attributes.position.needsUpdate = true;
    }
  };
}

// ---------------- Instagram overlay ----------------
const InstagramInsert: React.FC<{ t: number }> = ({ t }) => {
  const n = Math.max(0, Math.min(6, Math.floor((t - 0.9) * 2.2)));
  const liked = t > 2.4;
  const grid = [
    { c1: '#f2c8a0', c2: '#c87a6a' },
    { c1: '#a8c8e8', c2: '#6a8ab8' },
    { c1: '#f0b8c8', c2: '#a86a8a' },
    { c1: '#d8e0b0', c2: '#8aa06a' },
    { c1: '#e8d0a8', c2: '#b0905a' },
    { c1: '#c0b0e0', c2: '#7a6aa8' }
  ];
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: 'rgba(8,10,22,0.45)' }}>
      <div style={{
        width: 560, height: 1000, borderRadius: 46, background: '#101624', border: '9px solid #23283a',
        boxShadow: '0 30px 80px rgba(0,0,0,.5)', padding: 22, display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c8d4e8', font: '600 21px Arial' }}>
          <span>00:00</span><span>Instagram</span><span>100%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 4px' }}>
          <div style={{ width: 78, height: 78, borderRadius: 39, background: 'linear-gradient(135deg,#e8a7a0,#c87a7a)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: 'bold 34px Arial', color: '#fff' }}>M</div>
          <div>
            <div style={{ color: '#eef4ff', font: '600 27px Arial' }}>maja.k</div>
            <div style={{ color: '#7a8aa8', font: '400 20px Arial', marginTop: 2 }}>1 284 obserwujących · 128 postów</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {grid.slice(0, n).map((g, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: 8, background: `linear-gradient(150deg,${g.c1},${g.c2})`, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 6, opacity: 1 }}>
              <span style={{ fontSize: 14, color: '#fff' }}>♥</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28, color: liked ? '#ff5a7a' : '#c8d4e8' }}>{liked ? '♥' : '♡'}</span>
          <span style={{ color: '#a8b8d0', font: '500 20px Arial' }}>{liked ? '1 285 polubień' : '1 284 polubień'}</span>
        </div>
        <div style={{ marginTop: 14, color: '#dfe8f8', font: '400 21px Arial', lineHeight: 1.35 }}>
          maja.k <span style={{ color: '#9aaac4' }}>fajerwerki nad miastem ✨🎆</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- Telegram overlay ----------------
const TelegramInsert: React.FC<{ t: number }> = ({ t }) => {
  const typed = 'Maja, jestem w Tobie zakochany. Zostaniesz moją dziewczyną?';
  const n = Math.max(0, Math.min(typed.length, Math.floor((t - 9.1) * 30)));
  const sent = t > 14.1;
  const delivered = t > 14.6;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: 'rgba(8,10,22,0.5)' }}>
      <div style={{
        width: 560, height: 1000, borderRadius: 46, background: '#0e1422', border: '9px solid #23283a',
        boxShadow: '0 30px 80px rgba(0,0,0,.5)', padding: 22, display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c8d4e8', font: '600 21px Arial' }}>
          <span>00:00</span><span>Telegram</span><span>100%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 6px', borderBottom: '1px solid #1e2638' }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: 'linear-gradient(135deg,#e8a7a0,#c87a7a)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: 'bold 27px Arial', color: '#fff' }}>M</div>
          <div style={{ color: '#e8eef8', font: '600 25px Arial' }}>Maja <span style={{ color: '#6a7a9a', fontWeight: 400, fontSize: 17 }}>online</span></div>
        </div>
        <div style={{ flex: 1, padding: '16px 2px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 12 }}>
          <div style={{ alignSelf: 'flex-start', maxWidth: '78%', background: '#1c2436', color: '#dfe8f8', borderRadius: '20px 20px 20px 6px', padding: '13px 17px', font: '400 23px Arial' }}>
            Hej! Oglądasz fajerwerki? 🎆
          </div>
          <div style={{ alignSelf: 'flex-start', maxWidth: '78%', background: '#1c2436', color: '#dfe8f8', borderRadius: '20px 20px 20px 6px', padding: '13px 17px', font: '400 23px Arial' }}>
            Nowy Rok! 🥳
          </div>
          <div style={{ alignSelf: 'flex-end', maxWidth: '84%', background: '#2b6fd4', color: '#fff', borderRadius: '20px 20px 6px 20px', padding: '13px 17px', font: '400 23px Arial' }}>
            {sent ? typed : typed.slice(0, n)}
            {!sent && <span style={{ opacity: Math.sin(t * 14) > 0 ? 1 : 0 }}>|</span>}
          </div>
          {sent && <div style={{ alignSelf: 'flex-end', color: '#7aa8d8', font: '400 17px Arial' }}>{delivered ? '✓✓ Dostarczono' : '✓ Wysłano'}</div>}
        </div>
        <div style={{ height: 68, borderRadius: 34, background: '#182034', display: 'flex', alignItems: 'center', padding: '0 20px', color: '#5a6a8a', font: '400 21px Arial' }}>
          Wiadomość…
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- dates montage ----------------
const DateMontage: React.FC<{ t: number }> = ({ t }) => {
  const idx = Math.min(3, Math.max(0, Math.floor((t - 19.0) / 0.9)));
  const days = ['1 STYCZNIA', '2 STYCZNIA', '3 STYCZNIA', '4 STYCZNIA'];
  const local = ((t - 19.0) % 0.9) / 0.9;
  const alpha = 1 - ease(0.7, 1.0, local);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ opacity: alpha, textAlign: 'center' }}>
        <div style={{ color: '#ffe9c8', font: '800 30px Arial', letterSpacing: 14, opacity: 0.8 }}>2025</div>
        <div style={{ color: '#ffffff', font: '800 108px Georgia', marginTop: 12, textShadow: '0 6px 40px rgba(40,30,70,.5)' }}>{days[idx]}</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- final card ----------------
const FinalCard: React.FC<{ t: number }> = ({ t }) => {
  const shown = ease(33.5, 34.4, t);
  const pulse = 1 + Math.sin(t * 4) * 0.025;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 50% 45%, #2a2038, #0e0c18 70%)` }}>
      <div style={{ transform: `scale(${0.94 + shown * 0.06})`, opacity: shown, textAlign: 'center', padding: '0 70px' }}>
        <div style={{ color: '#ffe6b8', font: '800 88px Georgia', letterSpacing: 7, textShadow: '0 0 44px rgba(255,190,120,.4)' }}>DENIS</div>
        <div style={{ color: '#ffb0c8', font: '700 66px Georgia', margin: '4px 0 12px', transform: `scale(${pulse})` }}>♥</div>
        <div style={{ color: '#ffe6b8', font: '800 88px Georgia', letterSpacing: 7, textShadow: '0 0 44px rgba(255,190,120,.4)' }}>MAJA</div>
        <div style={{ marginTop: 44, color: '#f2d8c0', font: '600 46px Georgia', letterSpacing: 11 }}>NA ZAWSZE</div>
        <div style={{ marginTop: 20, color: '#9a8aa8', font: '400 25px Arial', letterSpacing: 3 }}>od 1 stycznia 2025</div>
      </div>
      {Array.from({ length: 26 }).map((_, i) => {
        const a = (i * 137.5) % 360, r = 210 + (i % 5) * 55;
        const x = 50 + Math.cos((a * Math.PI) / 180) * r / 10;
        const y = 50 + Math.sin((a * Math.PI) / 180) * r / 10;
        const s = 0.4 + Math.abs(Math.sin(t * 2 + i)) * 0.6;
        return <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 8, height: 8, borderRadius: 4, background: i % 2 ? '#ffd27a' : '#ffb0c8', opacity: 0.32 * shown * s, boxShadow: '0 0 12px currentColor' }} />;
      })}
    </AbsoluteFill>
  );
};

// ---------------- subtitles ----------------
const SUBS = [
  { a: 0.3, b: 4.8, text: 'Sylwester. Północ. Denis siedzi w domu i przegląda Instagram.' },
  { a: 5.0, b: 7.8, text: 'Napisać do niej? A jeśli nie odpisze?' },
  { a: 8.8, b: 11.5, text: 'Wreszcie pisze. Telegram. Do Mai.' },
  { a: 11.6, b: 14.9, text: 'Maja, jestem w Tobie zakochany…' },
  { a: 15.9, b: 16.9, text: 'O Boże…' },
  { a: 17.4, b: 19.0, text: 'Tak! Tak, chcę!' },
  { a: 19.8, b: 22.7, text: 'Trzy dni później. Czwarty stycznia. Park.' },
  { a: 23.5, b: 24.7, text: 'Cześć…' },
  { a: 25.5, b: 26.3, text: 'Cześć.' },
  { a: 27.3, b: 29.2, text: 'Myślałem, że się rozmyślisz.' },
  { a: 29.9, b: 32.0, text: 'Nigdy. Kocham cię od dawna.' },
  { a: 33.4, b: 35.6, text: 'I tak zaczęła się ich historia.' }
];
function Subtitles({ t }: { t: number }) {
  const s = SUBS.find(x => t >= x.a && t < x.b);
  if (!s) return null;
  const alpha = ease(s.a, s.a + 0.22, t) * (1 - ease(s.b - 0.25, s.b, t));
  return (
    <div style={{ position: 'absolute', bottom: 170, width: '100%', textAlign: 'center', opacity: alpha }}>
      <span style={{
        display: 'inline-block', maxWidth: 920, padding: '16px 28px', borderRadius: 18,
        color: '#fff9e9', background: 'rgba(18,16,30,.84)', font: '600 38px Arial',
        border: '2px solid rgba(255,239,202,.22)', lineHeight: 1.28
      }}>{s.text}</span>
    </div>
  );
}

// ---------------- film ----------------
function Film() {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const mount = useRef<HTMLDivElement>(null);
  const room = useRef<ReturnType<typeof makeRoom>>();
  const square = useRef<ReturnType<typeof makeSquare>>();
  const park = useRef<ReturnType<typeof makePark>>();
  const renderer = useRef<T.WebGLRenderer | null>(null);
  const [handle] = useState(() => delayRender('worlds'));
  const lastT = useRef(0);

  useLayoutEffect(() => {
    const r = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    r.setSize(W, H); r.setPixelRatio(1);
    r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    mount.current!.appendChild(r.domElement);
    renderer.current = r;
    room.current = makeRoom();
    square.current = makeSquare();
    park.current = makePark();
    continueRender(handle);
    return () => { r.dispose(); mount.current!.replaceChildren(); };
  }, []);

  useLayoutEffect(() => {
    if (!renderer.current) return;
    const r = renderer.current;
    const dt = Math.max(0, Math.min(0.1, t - lastT.current));
    const cam = new T.PerspectiveCamera(42, W / H, 0.1, 100);

    if (t < 14.9) {
      const obj = room.current!;
      obj.update(t);
      let pos: [number, number, number], look: [number, number, number], roll = 0;
      if (t < 4.8) {
        const k = ease(0, 4.8, t);
        pos = [4.4 - k * 0.7, 2.7 - k * 0.15, 9.2 - k * 1.0];
        look = [0.3, 2.35, -0.6]; roll = 0.018;
      } else if (t < 8.9) {
        const k = ease(4.8, 8.9, t);
        pos = [2.3 - k * 0.35, 2.55, 6.6 - k * 0.5];
        look = [-0.1, 2.25, 0.6]; roll = 0.012;
      } else if (t < 11.6) {
        pos = [1.4, 2.45, 6.2];
        look = [-0.2, 2.2, 1.0];
      } else if (t < 14.9) {
        const k = ease(11.6, 14.9, t);
        pos = [1.6 - k * 0.3, 2.5, 6.8 - k * 0.9];
        look = [-0.2, 2.2, 0.9]; roll = -0.008;
      }
      cam.position.set(...pos!);
      cam.lookAt(...look!);
      cam.rotation.z = roll!;
      r.render(obj.scene, cam);
    } else if (t < 19.0) {
      const obj = square.current!;
      obj.update(t);
      const k = ease(14.9, 19.0, t);
      const close = ease(17.2, 19.0, t);
      cam.position.set(0.15 + close * 0.15, 2.55, 13.2 - k * 1.2 - close * 1.0);
      cam.lookAt(0.05, 2.45, 1.8);
      cam.rotation.z = -0.01;
      r.render(obj.scene, cam);
    } else {
      const obj = park.current!;
      obj.update(t, dt);
      if (t < 22.7) {
        const k = ease(19.0, 22.7, t);
        cam.position.set(0.0, 3.6 - k * 1.0, 12.0 - k * 1.8);
        cam.lookAt(0.0, 2.1, 0.0);
      } else {
        const k = ease(22.7, 33.5, t);
        const close = ease(30.2, 33.2, t);
        cam.position.set(0.2 - k * 0.15, 2.6 - close * 0.1, 10.6 - k * 0.9 - close * 1.4);
        cam.lookAt(0.0, 2.2, 2.1);
        cam.rotation.z = 0.008;
      }
      r.render(obj.scene, cam);
    }
    lastT.current = t;
  }, [frame]);

  const showIg = t >= 1.0 && t < 4.5;
  const showTg = t >= 8.9 && t < 11.6;
  const showDates = t >= 19.0 && t < 22.7;
  const showFinal = t >= 33.5;

  return (
    <AbsoluteFill style={{ background: '#0e1630' }}>
      <div ref={mount} style={{ width: W, height: H }} />
      <AbsoluteFill style={{ pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(10,14,30,.16),transparent 24%,transparent 74%,rgba(10,8,20,.32))' }} />
      {t < 4.8 && (
        <div style={{ position: 'absolute', top: 100, width: '100%', textAlign: 'center', color: '#ffe9c8', opacity: 1 - ease(3.9, 4.8, t) }}>
          <div style={{ font: '700 22px Arial', letterSpacing: 10, opacity: 0.85 }}>SYLWESTER 2025</div>
          <div style={{ font: '700 62px Georgia', marginTop: 8, textShadow: '0 3px 0 #2a2438, 0 10px 30px #00000066' }}>Pierwsza wiadomość</div>
        </div>
      )}
      {showIg && <InstagramInsert t={t} />}
      {showTg && <TelegramInsert t={t} />}
      {showDates && <DateMontage t={t} />}
      {showFinal && <FinalCard t={t} />}
      <Subtitles t={t} />
      <Audio src={staticFile('mix.wav')} />
    </AbsoluteFill>
  );
}

registerRoot(() => <Composition id="MiniCartoonPL" component={Film} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />);
