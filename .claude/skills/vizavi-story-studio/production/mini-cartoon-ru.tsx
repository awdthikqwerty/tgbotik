import React, { useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, Composition, registerRoot, useCurrentFrame, Audio, staticFile, delayRender, continueRender } from 'remotion';
import * as T from 'three';

const W = 1080, H = 1920, INK = '#241726';
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (a: number, b: number, t: number) => { let x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };
function canvas(w: number, h: number) { let c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function pen(c: HTMLCanvasElement) { let g = c.getContext('2d')!; g.lineJoin = 'round'; g.lineCap = 'round'; return g; }
function path(g: CanvasRenderingContext2D, d: string, fill: string | null, stroke = INK, lw = 7) { let p = new Path2D(d); g.fillStyle = fill!; if (fill) g.fill(p); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(p); } }
function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, stroke = INK, lw = 6) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function line(g: CanvasRenderingContext2D, x: number, y: number, a: number, b: number, color = INK, w = 8) { g.beginPath(); g.moveTo(x, y); g.lineTo(a, b); g.strokeStyle = color; g.lineWidth = w; g.stroke(); }

function knight(c: HTMLCanvasElement, t: number) {
  let g = pen(c); g.clearRect(0, 0, c.width, c.height); g.save(); g.translate(300, 675);
  let walk = t < 3 ? Math.sin(t * 11) : 0;
  let scare = ease(3.1, 3.45, t) * (1 - ease(6.6, 7.4, t));
  let joy = ease(7.7, 8.4, t);
  g.translate(Math.sin(t * 11) * 3 * (t < 3 ? 1 : 0) + scare * Math.sin(t * 40) * 2, -Math.abs(walk) * 12 - scare * 13);
  g.rotate(-scare * .09 + joy * .04);
  path(g, `M -62 -330 Q -140 -270 ${-155 + Math.sin(t * 7) * 13} -50 Q -105 -20 -55 -55 L 40 -290 Z`, '#c7475b');
  for (let s of [-1, 1]) {
    let sw = walk * s * 38;
    line(g, s * 40, -80, s * 48 + sw, -10, '#303c55', 24);
    line(g, s * 48 + sw, -10, s * 47 - sw, 50, '#7e93ad', 25);
    ellipse(g, s * 47 - sw + 10, 57, 37, 17, '#26354a');
    ellipse(g, s * 48 + sw, -10, 18, 15, '#bdd8e3');
  }
  path(g, 'M -77 -293 Q 0 -325 73 -287 L 69 -94 Q 0 -65 -70 -96 Z', '#9bbccf');
  path(g, 'M -54 -278 L -38 -114 L 42 -112 L 54 -276 Q 0 -298 -54 -278', '#d5e5e5', null);
  line(g, 0, -270, 0, -135, '#6e91a8', 4);
  path(g, 'M -73 -132 L 71 -132 L 70 -103 L -70 -103 Z', '#664345');
  ellipse(g, 0, -119, 12, 12, '#efbf58', INK, 4);
  line(g, -73, -266, -104, -170, '#5d7694', 22);
  ellipse(g, -76, -270, 29, 25, '#dce7e6');
  path(g, 'M -132 -212 L -77 -228 L -38 -207 L -45 -120 Q -76 -70 -109 -120 Z', '#537ec3');
  path(g, 'M -86 -213 L -86 -112 M -117 -179 L -53 -179', null, '#f2d28b', 10);
  let hx = 98 + scare * 25 + joy * 12, hy = -172 - scare * 160 + joy * 5;
  line(g, 71, -269, 104, -235, '#536d89', 22);
  line(g, 104, -235, hx, hy, '#bcd9e2', 22);
  ellipse(g, 73, -270, 28, 24, '#dfeded');
  g.save(); g.translate(hx, hy); g.rotate(-.28 + scare * .08 + joy * 1.3);
  if (t > 3.3) {
    path(g, 'M -9 -12 L -13 -205 L 0 -235 L 14 -205 L 10 -12 Z', '#e9f6f5', INK, 5);
    line(g, 0, -205, 0, -25, '#8fb7cb', 3);
    line(g, -30, -13, 30, -13, '#d4a449', 11);
    line(g, 0, 0, 0, 38, '#76524c', 13);
    ellipse(g, 0, 39, 10, 10, '#e0b85a', INK, 4);
  }
  g.restore();
  ellipse(g, hx, hy, 15, 17, '#f2c59c');
  path(g, 'M -93 -453 Q -103 -531 -29 -554 Q 55 -583 91 -499 L 86 -382 Q 69 -330 2 -326 Q -65 -325 -87 -379 Z', '#f3cba8');
  path(g, 'M -99 -443 Q -114 -538 -42 -573 Q 42 -615 94 -528 L 110 -446 L 67 -445 L 56 -497 Q -3 -475 -68 -492 L -68 -440 Z', '#b8d4df');
  path(g, 'M -94 -472 Q 5 -455 105 -479 L 107 -443 Q 0 -424 -98 -444 Z', '#e5efea');
  path(g, 'M -19 -580 Q -68 -650 -13 -675 Q 47 -685 83 -653 Q 13 -655 16 -582 Z', '#cf405d');
  line(g, 1, -583, 0, -537, '#7395ad', 5);
  let blink = (Math.floor(t * 30) % 79 < 4);
  let ey = blink ? 2 : scare ? 17 : joy ? 12 : 11;
  ellipse(g, -35, -408, 9, ey, INK, null);
  ellipse(g, 36, -408, 9, ey, INK, null);
  if (scare) { line(g, -50, -438, -22, -445, INK, 6); line(g, 23, -445, 50, -438, INK, 6); ellipse(g, 2, -361, 17, 23, '#663a44'); }
  else if (joy) { path(g, 'M -20 -369 Q 2 -345 28 -372', null, INK, 6); }
  else { path(g, 'M -17 -364 Q 4 -354 24 -369', null, INK, 5); }
  if (t > 8.1) { g.save(); g.translate(115, -183); flower(g, 0, 0, .7); g.restore(); }
  g.restore();
}

function flower(g: CanvasRenderingContext2D, x: number, y: number, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  path(g, 'M 0 42 Q -12 2 0 -62', null, '#357a45', 9);
  path(g, 'M -3 20 Q -48 -8 -40 -23 Q -5 -22 -3 20', '#68b756', INK, 3);
  for (let i = 0; i < 7; i++) { let a = i * Math.PI * 2 / 7; ellipse(g, Math.sin(a) * 23, -65 + Math.cos(a) * 23, 15, 22, '#f7b8d0', INK, 3); }
  ellipse(g, 0, -65, 14, 15, '#ffd46b', INK, 3);
  g.restore();
}

function dragon(c: HTMLCanvasElement, t: number) {
  let g = pen(c); g.clearRect(0, 0, c.width, c.height); g.save(); g.translate(500, 960);
  let arrive = ease(3, 3.65, t);
  let bounce = Math.sin((t - 3.3) * 12) * Math.exp(-Math.max(0, t - 3.3) * 4) * 18;
  g.translate(0, (1 - arrive) * -550 + bounce);
  g.rotate(Math.sin(t * 2) * .012);
  let give = ease(6.0, 7.25, t);
  let happy = ease(6.0, 6.7, t);
  path(g, `M 112 -225 Q 360 -190 339 -388 Q 465 -220 350 -110 Q 246 -52 108 -93 Z`, '#499f89');
  path(g, 'M 93 -459 Q 280 -724 368 -651 L 314 -432 L 250 -484 L 218 -382 Z', '#e4a260');
  path(g, 'M 86 -451 Q -15 -732 -137 -705 L -193 -487 L -118 -520 L -98 -402 Z', '#e4a260');
  path(g, 'M 101 -460 L 299 -622 L 250 -484 M 98 -459 L 218 -382 M 77 -459 L -108 -670 L -118 -520', null, '#87504d', 6);
  ellipse(g, -82, -50, 74, 37, '#459b88');
  ellipse(g, 128, -51, 78, 37, '#459b88');
  for (let x of [-112, -75, -38, 98, 134, 168]) path(g, `M ${x} -43 l 12 -18 l 13 18 Z`, '#f5dbac', INK, 4);
  path(g, 'M -114 -427 Q -176 -270 -135 -109 Q 10 -31 164 -119 Q 204 -264 130 -450 Z', '#5eb59a');
  ellipse(g, 20, -255, 104, 160, '#e8ce8a');
  for (let yy = -340; yy < -120; yy += 45) path(g, `M -62 ${yy} Q 12 ${yy + 24} 103 ${yy}`, null, '#bc9a6e', 4);
  path(g, 'M 128 -398 Q 228 -397 235 -270 Q 201 -214 151 -257', '#41917f');
  path(g, 'M -108 -386 Q -153 -464 -119 -575 L -166 -611 Q -222 -644 -213 -704 Q -203 -769 -133 -756 Q -91 -848 -4 -813 Q 85 -849 140 -773 Q 181 -704 133 -612 L 108 -426 Q 12 -365 -108 -386 Z', '#68b99b');
  path(g, 'M -127 -765 Q -189 -862 -173 -886 Q -113 -875 -83 -793 Z', '#f2d6a0');
  path(g, 'M 78 -802 Q 126 -899 157 -881 Q 172 -830 130 -762 Z', '#f2d6a0');
  path(g, 'M 140 -732 Q 240 -784 225 -706 L 150 -659 Z', '#4da48c');
  for (let i = 0; i < 3; i++) path(g, `M ${-35 + i * 37} -805 l 20 -42 l 27 46 Z`, '#d8b372');
  ellipse(g, -136, -660, 108, 63, '#81c8a0');
  ellipse(g, -190, -675, 10, 7, '#315b52', null);
  ellipse(g, -138, -683, 9, 7, '#315b52', null);
  let blink = Math.floor(t * 30) % 97 < 4;
  ellipse(g, -58, -741, 23, blink ? 2 : 32, '#fff3d8');
  ellipse(g, 38, -740, 24, blink ? 2 : 34, '#fff3d8');
  ellipse(g, -65, -739, 8, blink ? 1 : 17, INK, null);
  ellipse(g, 30, -737, 9, blink ? 1 : 18, INK, null);
  path(g, 'M -84 -788 Q -57 -800 -34 -787 M 15 -788 Q 40 -798 61 -780', null, INK, 6);
  path(g, `M -207 -637 Q -119 ${-601 + happy * 24} -63 -633`, null, INK, 6);
  if (happy) path(g, 'M -159 -624 l 13 18 l 12 -14 Z', '#fff4d6', INK, 3);
  let hx = 110 - give * 346, hy = -296 - give * 75;
  path(g, `M 111 -394 Q ${180 - give * 100} -326 ${hx} ${hy} L ${hx - 20} ${hy + 38} Q 71 -276 71 -369 Z`, '#62b49a');
  ellipse(g, hx, hy, 35, 27, '#7cc6a0');
  if (t > 6.05 && t < 8.18) flower(g, hx - 9, hy - 12, 1.03);
  if (t > 6.65) { for (let i = 0; i < 5; i++) { let a = t * 1.4 + i * 1.8, x = -245 + Math.cos(a) * 75, y = -480 + Math.sin(a) * 75, sz = 6 + Math.sin(t * 5 + i) * 4; path(g, `M ${x - sz} ${y} L ${x} ${y - sz * 2} L ${x + sz} ${y} L ${x} ${y + sz * 2} Z`, '#ffe6a0', null); } }
  g.restore();
}

function makeWorld() {
  const scene = new T.Scene();
  scene.background = new T.Color('#88bddd');
  scene.fog = new T.Fog('#b8d7dc', 23, 75);
  scene.add(new T.HemisphereLight('#fff5d7', '#697ba2', 2.4));
  let sun = new T.DirectionalLight('#ffe0a1', 3.2);
  sun.position.set(-9, 18, 9);
  scene.add(sun);
  const camera = new T.PerspectiveCamera(44, W / H, .1, 120);
  let mat = (color: string) => new T.MeshStandardMaterial({ color, roughness: 1 });
  let outline = new T.LineBasicMaterial({ color: '#34313b', transparent: true, opacity: .65 });
  function mesh(geo: T.BufferGeometry, color: string | T.Material, x: number, y: number, z: number, ink = true) {
    let m = new T.Mesh(geo, typeof color === 'string' ? mat(color) : color);
    m.position.set(x, y, z);
    scene.add(m);
    if (ink) { let edge = new T.LineSegments(new T.EdgesGeometry(geo, 25), outline); m.add(edge); }
    return m;
  }
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, color: string) => mesh(new T.BoxGeometry(w, h, d), color, x, y, z);
  function tex(type: string) {
    let c = canvas(512, 512), g = pen(c);
    g.fillStyle = type === 'road' ? '#c7b6a1' : type === 'roof' ? '#b55b55' : '#ecd9ae';
    g.fillRect(0, 0, 512, 512);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 12; i++) {
      let n = Math.sin(i * 99 + j * 75) * .5 + .5;
      g.fillStyle = type === 'road' ? `rgba(74,59,55,${.08 + n * .12})` : type === 'roof' ? `rgba(51,23,33,${.1 + n * .18})` : `rgba(144,98,57,${.02 + n * .07})`;
      let x = i * 48 + (j % 2) * 24, y = j * 34;
      g.beginPath(); g.roundRect(x, y, 45, 31, 8); g.fill();
      if (type === 'road') { g.strokeStyle = 'rgba(255,244,208,.3)'; g.lineWidth = 2; g.stroke(); }
    }
    let tx = new T.CanvasTexture(c); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(type === 'road' ? 5 : 2, type === 'road' ? 10 : 2); tx.colorSpace = T.SRGBColorSpace; return tx;
  }
  let grass = mesh(new T.PlaneGeometry(180, 180), '#79a779', 0, -.045, -20, false);
  grass.rotation.x = -Math.PI / 2;
  let road = mesh(new T.PlaneGeometry(6.6, 100), new T.MeshStandardMaterial({ map: tex('road') }), 0, 0, -25, false);
  road.rotation.x = -Math.PI / 2;
  let plaster = new T.MeshStandardMaterial({ map: tex('wall'), color: '#fff0d2' });
  let roofmat = new T.MeshStandardMaterial({ map: tex('roof'), color: '#dd8d7e' });
  function house(x: number, z: number, w: number, h: number, color: string) {
    box(x, h / 2, z, w, h, 3, plaster.clone());
    box(x, h * .51, z + 1.53, w + .05, .12, .15, '#73524d');
    for (let xx of [-w / 2 + .14, 0, w / 2 - .14]) box(x + xx, h / 2, z + 1.55, .13, h, .13, '#74544d');
    let r = mesh(new T.ConeGeometry(w * .81, 1.9, 4), roofmat, x, h + .8, z);
    r.rotation.y = Math.PI / 4; r.scale.z = 1.1;
    box(x + w * .27, h + 1.5, z - .3, .38, 1.5, .46, '#bd917f');
    box(x, .85, z + 1.58, .8, 1.7, .12, '#685859');
    let door = mesh(new T.CircleGeometry(.4, 24), '#685859', x, 1.7, z + 1.65);
    for (let side of [-1, 1]) {
      let xx = x + side * w * .28;
      box(xx, h * .64, z + 1.6, .66, .91, .1, '#40576d');
      box(xx, h * .64, z + 1.67, .05, .91, .05, '#e5bc78');
      box(xx, h * .64, z + 1.69, .66, .05, .05, '#e5bc78');
      box(xx, h * .64 - .58, z + 1.78, .95, .18, .4, '#735047');
      for (let k = 0; k < 5; k++) mesh(new T.IcosahedronGeometry(.13, 1), k % 2 ? '#d7779d' : '#e4b57d', xx - .35 + k * .17, h * .64 - .4, z + 1.85, false);
    }
    box(x + w * .33, 2.3, z + 1.8, .8, .5, .1, color);
  }
  for (let i = 0; i < 6; i++) {
    house(-5.0 - i * .25, -3 - i * 5, 3.6, 4.2 + (i % 3) * .6, ['#63858c', '#a56c82', '#b8a05c'][i % 3]);
    house(5.1 + i * .2, -5 - i * 5, 3.7, 4.9 + (i % 2) * .6, '#8ca06d');
  }
  box(0, 4.5, -36, 2.3, 9, 2.3, '#c8bbae');
  mesh(new T.ConeGeometry(1.9, 3, 8), '#67859b', 0, 10, -36);
  for (let i = 0; i < 9; i++) {
    let h = mesh(new T.SphereGeometry(8 + i % 3 * 2, 16, 10), '#7ba99b', (i - 4) * 11, 0, -48 - (i % 2) * 6, false);
    h.scale.y = .65;
  }
  function tree(x: number, z: number, s: number) {
    box(x, s * 1.3, z, .35, s * 2.6, .35, '#8a7056');
    for (let j = 0; j < 3; j++) {
      let tr = mesh(new T.IcosahedronGeometry(s, 1), j % 2 ? '#79ac7a' : '#619675', x + (j - 1) * s * .55, s * (2.8 + (j === 1 ? .6 : 0)), z, false);
      tr.scale.y = 1.2;
    }
  }
  for (let i = 0; i < 8; i++) tree((i % 2 ? -1 : 1) * (7 + i % 3), -8 - i * 4, 1.4);
  for (let j = 0; j < 28; j++) for (let s of [-1, 1]) box(s * 3.4, .08, -j * 1.4, .3, .18, 1.25, '#b7b7a3');
  for (let i = 0; i < 65; i++) {
    let x = (i % 2 ? -1 : 1) * (3.7 + (Math.sin(i * 38) * .5 + .5) * 1.6), z = -i * .47;
    let stem = mesh(new T.CylinderGeometry(.015, .02, .3, 4), '#496f4c', x, .15, z, false);
    mesh(new T.IcosahedronGeometry(.07, 0), i % 3 ? '#e4b26c' : '#cd7da2', x, .32, z, false);
  }
  let sc = canvas(128, 128), sg = pen(sc), gr = sg.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(35,34,47,.40)'); gr.addColorStop(1, 'rgba(35,34,47,0)');
  sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
  function shadow(x: number, w: number, d: number) {
    let m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({ map: new T.CanvasTexture(sc), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .025, .15); scene.add(m); return m;
  }
  let ks = shadow(-1.35, 1.8, 1), ds = shadow(1.1, 3.4, 1.8);
  let kc = canvas(600, 780), dc = canvas(1000, 1100);
  let kt = new T.CanvasTexture(kc), dt = new T.CanvasTexture(dc);
  for (let tx of [kt, dt]) { tx.colorSpace = T.SRGBColorSpace; tx.minFilter = T.LinearFilter; tx.magFilter = T.LinearFilter; }
  function card(tx: T.CanvasTexture, w: number, h: number, x: number) {
    let o = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tx, transparent: true, alphaTest: .1, depthWrite: true, side: T.DoubleSide }));
    o.position.set(x, h / 2, .45); scene.add(o); return o;
  }
  let k = card(kt, 2.8, 3.64, -1.35), d = card(dt, 5.45, 6.0, 1.1);
  d.position.z = .1;
  return {
    scene, camera, k, d, kc, dc, kt, dt, ds, ks,
    update(t: number) {
      knight(kc, t); dragon(dc, t); kt.needsUpdate = true; dt.needsUpdate = true;
      k.position.x = -1.8 + ease(0, 3, t) * .45; k.position.y = 1.82;
      d.visible = t >= 3; ds.visible = t >= 3; ds.material.opacity = ease(3, 3.7, t);
      let reveal = ease(2.75, 3.8, t), push = ease(7, 10, t);
      camera.position.set(-.6 + reveal * .6 - push * .15, 4.05 + reveal * .6 - push * .3, 11.2 + reveal * 3.7 - push * 1.25);
      camera.lookAt(-.9 + reveal * .9, 2.75 + reveal * .2 + push * .1, 0);
      camera.rotation.z = Math.sin(t * .5) * .006;
      let kick = t - 3.4; if (kick > 0 && kick < .24) camera.position.x += Math.sin(kick * 140) * .06 * Math.exp(-kick * 12);
      k.quaternion.copy(camera.quaternion); d.quaternion.copy(camera.quaternion);
    }
  };
}

const subtitles = [
  { a: .3, b: 2.65, text: 'Обычный день. Почти.' },
  { a: 3.5, b: 5.1, text: 'Ой, дракон!' },
  { a: 6.25, b: 7.75, text: 'Это тебе.' },
  { a: 8.15, b: 9.9, text: 'А… спасибо!' }
];

function Film() {
  let f = useCurrentFrame(), t = f / 30;
  let mount = useRef<HTMLDivElement>(null), world = useRef<ReturnType<typeof makeWorld>>(), renderer = useRef<T.WebGLRenderer | null>(null);
  let [handle] = useState(() => delayRender('Three scene'));
  useLayoutEffect(() => {
    let r = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    r.setSize(W, H); r.setPixelRatio(1); r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.04;
    mount.current!.appendChild(r.domElement); renderer.current = r;
    world.current = makeWorld(); world.current.update(t); r.render(world.current.scene, world.current.camera);
    continueRender(handle);
    return () => { r.dispose(); mount.current!.replaceChildren(); };
  }, []);
  useLayoutEffect(() => { if (world.current && renderer.current) { world.current.update(t); renderer.current.render(world.current.scene, world.current.camera); } }, [f]);
  let sub = subtitles.find(x => t >= x.a && t < x.b);
  return (
    <AbsoluteFill style={{ background: '#9bc5df' }}>
      <div ref={mount} style={{ width: W, height: H }} />
      <AbsoluteFill style={{ pointerEvents: 'none', background: 'linear-gradient(180deg,rgba(42,58,88,.07),transparent 28%,transparent 75%,rgba(37,29,51,.22))' }} />
      <div style={{ position: 'absolute', top: 115, width: '100%', textAlign: 'center', color: '#fff6db', fontFamily: 'Georgia', textShadow: '0 3px 0 #496176, 0 8px 26px #3c667c55' }}>
        <div style={{ fontSize: 23, letterSpacing: 8, fontFamily: 'Arial', fontWeight: 700 }}>МАЛЕНЬКАЯ СКАЗКА</div>
        <div style={{ fontSize: 69, marginTop: 18, fontWeight: 700 }}>Храброе сердце</div>
        <div style={{ fontSize: 28, marginTop: 10, opacity: .9 }}>Сказка о неожиданной встрече</div>
      </div>
      {sub && <div style={{ position: 'absolute', bottom: 215, width: '100%', textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '21px 34px', borderRadius: 25, color: '#fff9e9', background: 'rgba(38,37,58,.83)', font: 'bold 47px Arial', border: '2px solid rgba(255,239,202,.35)', boxShadow: '0 8px 25px #20213a22' }}>{sub.text}</span></div>}
      <Audio src={staticFile('mix.wav')} />
    </AbsoluteFill>
  );
}

registerRoot(() => <Composition id="MiniCartoonRU" component={Film} durationInFrames={300} fps={30} width={1080} height={1920} />);