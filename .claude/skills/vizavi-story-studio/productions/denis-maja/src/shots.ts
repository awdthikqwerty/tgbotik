// Staging of every shot: camera, character performance, props and screen overlays, all driven by the locked timeline.
import tl from "./timeline.json";
import { G, W, H, OVERSCAN, clamp, lerp, ease, easeOut, easeInOut, pulse, noise1 } from "./lib/util";
import type { Background } from "./lib/types";
import { BACKGROUNDS } from "./bg";
import { drawPerson, Pose, FOOT, Look, Outfit } from "./chars/rig";
import { DENIS, MAJA, FRIEND, OUTFITS } from "./chars/cast";
import { litLayer, contactShadow } from "./chars/actor";
import { mouthFor, voiceById } from "./chars/lipsync";
import { drawYorkie } from "./chars/dog";
import { drawPhone, handPhone, PhoneState } from "./ui/phone";
import { drawDateCard, drawEndCard } from "./ui/text";
import { bouquet, tablet, popcorn, blanket, musicNotes, splash } from "./props";
import { heartBurst, sparkleField, motes, flash, vibrationLines, lightLeak, sparkle } from "./fx";

const E = (tl as any).events as Record<string, number>;
const SHOT = Object.fromEntries((tl as any).shots.map((s: any) => [s.id, s])) as Record<string, { start: number; end: number }>;
const VIG = Object.fromEntries((tl as any).vignettes.map((s: any) => [s.id, s])) as Record<string, { start: number; end: number }>;

type Cam = { cx: number; cy: number; z: number; sx?: number; sy?: number };
function applyCam(g: G, c: Cam) {
  const sx = c.sx ?? W / 2, sy = c.sy ?? H / 2;
  // keep the visible world rect inside the painted overscan area
  let { cx, cy } = c;
  const left = cx - sx / c.z, right = cx + (W - sx) / c.z, top = cy - sy / c.z, bottom = cy + (H - sy) / c.z;
  if (left < OVERSCAN.x0) cx += OVERSCAN.x0 - left; else if (right > OVERSCAN.x1) cx -= right - OVERSCAN.x1;
  if (top < OVERSCAN.y0) cy += OVERSCAN.y0 - top; else if (bottom > OVERSCAN.y1) cy -= bottom - OVERSCAN.y1;
  g.setTransform(c.z, 0, 0, c.z, sx - cx * c.z, sy - cy * c.z);
}
const lerpCam = (a: Cam, b: Cam, k: number): Cam => ({ cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: lerp(a.z, b.z, k), sx: lerp(a.sx ?? W / 2, b.sx ?? W / 2, k), sy: lerp(a.sy ?? H / 2, b.sy ?? H / 2, k) });
const hipY = (ground: number, look: Look, s: number) => ground - FOOT * s * look.height;
const faceY = (hip: number, look: Look, s: number) => hip - 412 * s * look.height;
const anchor = (bg: Background, k: string, d: { x: number; y: number; w?: number }) => ({ ...d, ...(bg.anchors?.[k] ?? {}) });

function person(g: G, look: Look, out: Outfit, p: Pose) { drawPerson(g, look, out, p); }
function lit(g: G, bg: Background, paint: (c: G) => void, bbox = { x0: -200, y0: -320, x1: 1280, y1: 2240 }) { litLayer(g, bg.light, bbox, paint); }
function speak(who: string, T: number) { const m = mouthFor(who, T); return { open: m.open, vowel: m.vowel }; }

// ---------------------------------------------------------------- 1. night sky
function shotSky(g: G, lt: number, T: number) {
  const bg = BACKGROUNDS.sky;
  const win = anchor(bg, "window", { x: 540, y: 1000 });
  const k = easeInOut(4.0, 4.75, lt);
  applyCam(g, { cx: lerp(W / 2, win.x, k), cy: lerp(H / 2, win.y, k), z: 1 + k * k * 2.6 });
  bg.draw(g, lt); bg.front?.(g, lt);
  g.setTransform(1, 0, 0, 1, 0, 0);
  drawDateCard(g, "01.01.2025", lt, 0.5, 3.9, 360, "Noc sylwestrowa");
  flash(g, ease(4.2, 4.75, lt) * 0.45, "#ffe2b8");
}

// ---------------------------------------------------------------- 2/4. Denis in his room
const MSG = "Hej… chciałbym zapytać, czy chciałabyś ze mną być?";
const REPLY = "Tak! Też tego chcę";
function denisInput(T: number): string {
  const d1 = voiceById("d1");
  if (T < E.type1_start) return "";
  if (T < E.type1_end + 0.05) {
    const said = d1.chars.filter((c) => c.e <= T + 0.05).length / d1.chars.length;
    return MSG.slice(0, Math.round(MSG.length * clamp(said * 1.04)));
  }
  if (T < E.delete_start) return MSG;
  if (T < E.delete_end) return MSG.slice(0, Math.round(MSG.length * (1 - ease(E.delete_start, E.delete_end, T))));
  if (T < E.retype_start) return "";
  if (T < E.retype_end) return MSG.slice(0, Math.round(MSG.length * clamp((T - E.retype_start) / (E.retype_end - E.retype_start))));
  if (T < E.send) return MSG;
  return "";
}
function denisPhone(T: number, reply: boolean): PhoneState {
  const sent = T >= E.send;
  const msgs = [] as PhoneState["messages"];
  if (sent || reply) msgs.push({ text: MSG, out: true, time: "00:07", appear: reply ? 1 : easeOut(E.send, E.send + 0.35, T) });
  if (reply) msgs.push({ text: REPLY, out: false, time: "00:09", heart: true, appear: easeOut(E.ding, E.ding + 0.4, T) });
  const typing = T >= E.type1_start && T < E.send;
  return { name: "Maja", initial: "M", avatar: ["#ffb3c6", "#f582a7"], status: "online", clock: reply ? "00:09" : "00:07", messages: msgs,
    input: reply ? "" : denisInput(T), caret: typing && (T * 2.2) % 1 < 0.55, sendPress: reply ? 0 : pulse(E.send - 0.05, E.send + 0.35, T, 0.1) };
}
function denisSeated(T: number, lt: number, seat: { x: number; y: number }, mode: "room" | "reads"): Pose {
  const typing = (T > E.type1_start && T < E.type1_end) || (T > E.retype_start && T < E.retype_end);
  const jit = typing ? Math.sin(T * 34) * 4 : 0;
  const p: Pose = {
    x: seat.x, y: seat.y, scale: 1, t: T, sit: 1, headNod: 8, lookY: 0.75, lookX: 0.1, headTurn: 0.12,
    handL: { x: -30 + jit, y: -150, type: "hold" }, handR: { x: 34 - jit, y: -150 + jit * 0.5, type: "hold" },
    smile: 0.25, worry: 0.45, blush: 0.5, ...speak("denis", T),
    prop: (c) => handPhone(c, 2, -176, 0.95, 0.8, 0.04),
  };
  if (mode === "room") {
    if (T >= E.type1_end && T < E.delete_start) { p.worry = 0.85; p.smile = 0.05; }
    if (T >= E.delete_start && T < E.retype_start) { p.eyesClosed = 0.9; p.worry = 1; p.smile = 0; p.headTilt = Math.sin((T - E.delete_start) * 16) * 0.07; }
    if (T >= E.breath && T < E.send) { const b = clamp((T - E.breath) / 0.7); p.shoulders = Math.sin(b * Math.PI); p.eyesClosed = 1; p.worry = 0.2; p.smile = 0.2; p.lookY = 0; p.headNod = 0; }
    if (T >= E.send) { p.worry = 0.7; p.blush = 0.95; p.smile = 0.15; p.lookY = 0.7; p.eyesClosed = pulse(E.send + 0.1, E.send + 0.5, T, 0.1) * 0.8; }
  } else {
    const s = ease(E.ding + 0.05, E.ding + 0.3, T) * (1 - ease(18.62, 18.75, T));
    p.surprise = s; p.worry = 0.3 * (1 - ease(E.ding, 18.7, T)); p.smile = lerp(0.3, 1, ease(18.55, 18.8, T)); p.blush = lerp(0.6, 1, ease(18.5, 19, T));
    p.sparkle = ease(18.6, 18.9, T);
    if (T > 19.3) {
      const k = easeOut(19.3, 19.55, T) * (1 - ease(20.6, 20.95, T));
      p.handR = { x: lerp(34, 150, k), y: lerp(-150, -560, k), type: k > 0.4 ? "fist" : "hold" };
      p.hop = Math.abs(Math.sin((T - 19.3) * 7)) * 18 * k;
      p.prop = (c) => handPhone(c, lerp(2, -26, k), -176, 0.95, 0.8, 0.04 - k * 0.3);
      p.lookY = lerp(0.75, -0.1, k); p.headNod = lerp(8, -4, k); p.headTilt = -0.06 * k;
      if (!mouthFor("denis", T).speaking) { p.joy = k; p.open = 0.5 * k; }
    }
  }
  return p;
}
function shotRoom(g: G, lt: number, T: number, mode: "room" | "reads") {
  const bg = BACKGROUNDS.room;
  const seat = anchor(bg, "bedSeat", { x: 540, y: 1390 });
  const dx = seat.x - 150;
  const fy = faceY(seat.y, DENIS, 1);
  const bgT = mode === "room" ? lt : lt + (SHOT.room.end - SHOT.room.start);
  let cam: Cam;
  if (mode === "room") cam = lerpCam({ cx: dx + 40, cy: fy + 170, z: 1.08, sx: 470 }, { cx: dx + 20, cy: fy + 120, z: 1.22, sx: 430 }, easeInOut(0, 7.5, lt));
  else cam = lerpCam({ cx: dx, cy: fy + 70, z: 1.75, sx: 400 }, { cx: dx, cy: fy + 40, z: 1.95, sx: 400 }, easeInOut(0, 3.4, lt));
  applyCam(g, cam);
  bg.draw(g, bgT);
  contactShadow(g, dx, seat.y + 30, 220, 0.22);
  lit(g, bg, (c) => person(c, DENIS, OUTFITS.denis.home, denisSeated(T, lt, { x: dx, y: seat.y }, mode)));
  if (mode === "reads") heartBurst(g, T, 19.4, dx, fy - 60, 8, 1.1, 5);
  bg.front?.(g, bgT);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (mode === "room") {
    const a = ease(5.0, 5.4, T) * (1 - ease(E.send + 0.4, E.send + 0.7, T));
    const slide = (1 - easeOut(5.0, 5.55, T)) * 420;
    drawPhone(g, 800 + slide, 760, 0.9, a, denisPhone(T, false), 0.03);
    // send whoosh sparkle
    sparkle(g, 900, 1150 - (T - E.send) * 900, 24, pulse(E.send, E.send + 0.5, T, 0.1));
  } else {
    const a = ease(E.ding - 0.1, E.ding + 0.2, T) * (1 - ease(20.5, 20.9, T));
    drawPhone(g, 850, 600, 0.62, a, denisPhone(T, true), 0.05);
  }
}

// ---------------------------------------------------------------- 3. Maja and her friend under the fireworks
function majaPose(T: number, x: number, y: number): Pose {
  const sw = MAJA.shoulder;
  const p: Pose = { x, y, scale: 1, t: T, lookY: -0.75, headTilt: -0.05, headTurn: 0.12, smile: 0.7, sparkle: 0.6, blush: 0.3,
    handR: { x: sw + 8, y: -12, type: "hold" }, prop: undefined, ...speak("maja", T) };
  const look = ease(E.maja_look - 0.1, E.maja_look + 0.25, T);
  if (T < E.maja_look) p.prop = (c) => handPhone(c, sw + 14, 40, 0.9, 0.5 + 0.5 * pulse(E.buzz, E.maja_look, T), Math.sin(T * 80) * 0.08 * pulse(E.buzz, E.maja_look, T, 0.05));
  if (T >= E.buzz) { p.lookY = lerp(-0.75, 0.8, ease(E.buzz + 0.1, E.maja_look, T)); p.headNod = 8 * look; p.headTilt = lerp(-0.05, 0.02, look); }
  if (look > 0) {
    p.handL = { x: -28, y: lerp(-10, -128, look), type: "hold" }; p.handR = { x: lerp(sw + 8, 30, look), y: lerp(-12, -128, look), type: "hold" };
    p.prop = (c) => handPhone(c, 0, lerp(40, -158, look), 0.9, 0.9, 0);
  }
  const sur = ease(E.maja_surprise - 0.1, E.maja_surprise + 0.1, T) * (1 - ease(E.maja_smile - 0.1, E.maja_smile + 0.2, T));
  if (sur > 0) { p.surprise = sur; p.handL = { x: lerp(-28, -4, sur), y: lerp(-128, -318, sur), type: "open" }; p.smile = 0.3; p.blush = 0.6; }
  if (T >= E.maja_smile) { p.smile = 1; p.blush = 0.9; p.sparkle = 1; }
  if (T >= E.maja_send) p.hop = Math.sin(clamp((T - E.maja_send) / 0.45) * Math.PI) * 22;
  return p;
}
function friendPose(T: number, x: number, y: number): Pose {
  const turn = ease(13.7, 14.1, T);
  const p: Pose = { x, y, scale: 1, t: T + 3.1, lookY: lerp(-0.7, 0.2, turn), lookX: lerp(0, 0.9, turn), headTurn: lerp(0.1, 0.45, turn), smile: 0.6, sparkle: 0.4 };
  if (T > 13.7 && T < 14.5) p.surprise = 0.5;
  if (T >= 14.5) { p.joy = 1; p.open = 0.45; p.handL = { x: -14, y: -150, type: "hold" }; p.handR = { x: 14, y: -150, type: "hold" }; p.hop = Math.abs(Math.sin((T - 14.5) * 6)) * 8 * (1 - ease(15.5, 16, T)); }
  return p;
}
function shotMaja(g: G, lt: number, T: number) {
  const bg = BACKGROUNDS.maja;
  const gy = bg.groundY, mx = 680, fx = 360;
  const my = hipY(gy, MAJA, 1), fyy = hipY(gy, FRIEND, 1);
  const mf = faceY(my, MAJA, 1);
  const k = easeInOut(0.35, 1.9, lt);
  applyCam(g, lerpCam({ cx: 520, cy: mf + 230, z: 1.0 }, { cx: mx + 20, cy: mf + 110, z: 1.36, sx: 370 }, k));
  bg.draw(g, lt);
  contactShadow(g, mx, gy, 150); contactShadow(g, fx, gy, 150);
  lit(g, bg, (c) => { person(c, FRIEND, OUTFITS.friend.winter, friendPose(T, fx, fyy)); person(c, MAJA, OUTFITS.maja.winter, majaPose(T, mx, my)); });
  vibrationLines(g, mx + 130, my + 30, pulse(E.buzz, E.maja_look, T, 0.08), T);
  heartBurst(g, T, E.maja_smile, mx, mf - 40, 6, 0.8, 9);
  bg.front?.(g, lt);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const a = ease(E.maja_look, E.maja_look + 0.35, T);
  const slide = (1 - easeOut(E.maja_look, E.maja_look + 0.5, T)) * 420;
  const typing = T >= E.maja_type_start && T < E.maja_send;
  const m2 = voiceById("m2");
  const said = clamp(m2.chars.filter((c) => c.e <= T + 0.05).length / m2.chars.length * 1.1);
  const input = T < E.maja_type_start ? "" : T < E.maja_send ? REPLY.slice(0, Math.round(REPLY.length * Math.max(said, ease(E.maja_type_start, m2.start, T) * 0.15))) : "";
  const st: PhoneState = { name: "Denis", initial: "D", avatar: ["#9cc8ff", "#5d8fe6"], status: "online", clock: "00:08",
    messages: [{ text: MSG, out: false, time: "00:07", appear: easeOut(E.maja_look + 0.15, E.maja_look + 0.5, T) },
      ...(T >= E.maja_send ? [{ text: REPLY, out: true, time: "00:09", heart: true, appear: easeOut(E.maja_send, E.maja_send + 0.35, T) }] : [])],
    input: input + (input.length === REPLY.length ? " ♥" : ""), caret: typing && (T * 2.2) % 1 < 0.55, sendPress: pulse(E.maja_send - 0.05, E.maja_send + 0.35, T, 0.1) };
  st.input = st.input.replace(" ♥", "");
  drawPhone(g, 820 + slide, 700, 0.8, a, st, -0.03);
}

// ---------------------------------------------------------------- 5. city fireworks
function shotCity(g: G, lt: number, T: number) {
  const bg = BACKGROUNDS.city;
  const h = anchor(bg, "heart", { x: 540, y: 620 });
  applyCam(g, { cx: W / 2, cy: H / 2 - 40, z: 1.0 + easeInOut(0, 4.4, lt) * 0.07 });
  bg.draw(g, lt); bg.front?.(g, lt);
  sparkleField(g, lt, 21, 14, { x: h.x - 300, y: h.y - 260, w: 600, h: 520 }, ease(1.6, 2.2, lt) * (1 - ease(3.8, 4.3, lt)));
  g.setTransform(1, 0, 0, 1, 0, 0);
  motes(g, lt, 4, 16, "#ffd1e6", 0.35);
}

// ---------------------------------------------------------------- 6. first date in the winter park
function shotPark(g: G, lt: number, T: number) {
  const bg = BACKGROUNDS.park;
  const gy = bg.groundY;
  const bench = anchor(bg, "bench", { x: 540, y: 1400, w: 560 });
  const s = 0.92;
  const sit = easeInOut(2.7, 3.5, lt);
  const walk = 1 - ease(1.6, 2.0, lt);
  const dX = lerp(lerp(60, bench.x - 165, easeOut(0, 2.0, lt)), bench.x - 125, sit);
  const mX = lerp(lerp(1020, bench.x + 165, easeOut(0, 2.0, lt)), bench.x + 125, sit);
  const dStand = hipY(gy, DENIS, s), mStand = hipY(gy, MAJA, s);
  const dY = lerp(dStand, bench.y, sit), mY = lerp(mStand, bench.y, sit);
  const z = lerp(1.22, 0.9, easeInOut(0.2, 6.8, lt));
  applyCam(g, { cx: bench.x, cy: lerp(faceY(dStand, DENIS, s) + 260, bench.y - 220, easeInOut(0, 6.8, lt)), z });
  bg.draw(g, lt);
  contactShadow(g, dX, gy, 140 * s, 0.24); contactShadow(g, mX, gy, 140 * s, 0.24);
  const wave = pulse(2.0, 2.75, lt, 0.2);
  const laugh = pulse(4.3, 5.3, lt, 0.2);
  const gaze = ease(5.4, 5.9, lt);
  const talkD = pulse(3.6, 4.3, lt, 0.1) * (0.3 + 0.3 * Math.abs(Math.sin(lt * 11)));
  const talkM = pulse(5.9, 6.6, lt, 0.1) * (0.3 + 0.3 * Math.abs(Math.sin(lt * 10)));
  const dP: Pose = { x: dX, y: dY, scale: s, t: T, sit, walk: lt * 7, walkAmt: walk, blush: 0.8, smile: 0.5 + laugh * 0.5,
    lookY: lerp(0.45, -0.05, ease(1.8, 2.2, lt)), lookX: lerp(0.3, 0.8, ease(1.8, 2.3, lt)), headTurn: lerp(0.15, 0.4, ease(3.4, 3.8, lt)),
    joy: laugh > 0.5 ? 1 : 0, open: Math.max(laugh * 0.5, talkD), headTilt: -laugh * 0.08 + gaze * 0.05,
    handR: wave > 0 ? { x: lerp(126, 150, wave), y: lerp(4, -420, wave), type: "open" } : sit > 0.5 ? { x: 60, y: -40, type: "hold" } : undefined,
    handL: sit > 0.5 ? { x: -60, y: -40, type: "hold" } : undefined, sparkle: gaze };
  const mP: Pose = { x: mX, y: mY, scale: s, t: T + 0.7, sit, walk: lt * 7 + 1.4, walkAmt: walk, blush: 0.85, smile: 0.55 + laugh * 0.45,
    lookY: lerp(0.5, -0.05, ease(1.9, 2.3, lt)), lookX: lerp(-0.3, -0.8, ease(1.9, 2.3, lt)), headTurn: lerp(-0.15, -0.4, ease(3.4, 3.8, lt)),
    joy: laugh > 0.4 ? 1 : 0, open: Math.max(laugh * 0.55, talkM), headTilt: laugh * 0.1 - gaze * 0.06, shy: (1 - ease(1.9, 2.4, lt)) * 0.6,
    handL: wave > 0 ? { x: lerp(-116, -140, wave), y: lerp(4, -400, wave), type: "open" } : laugh > 0.3 ? { x: -10, y: -300, type: "open" } : sit > 0.5 ? { x: -50, y: -40, type: "hold" } : undefined,
    handR: sit > 0.5 ? { x: 50, y: -40, type: "hold" } : undefined, sparkle: gaze };
  lit(g, bg, (c) => { person(c, DENIS, OUTFITS.denis.winter, dP); person(c, MAJA, OUTFITS.maja.winter, mP); });
  if (gaze > 0) heartBurst(g, lt, 6.0, bench.x, bench.y - 520, 5, 0.7, 13);
  bg.front?.(g, lt);
  g.setTransform(1, 0, 0, 1, 0, 0);
  drawDateCard(g, "04.01.2025", lt, 0.2, 3.2, 360, "Pierwsze spotkanie");
}

// ---------------------------------------------------------------- 7. memories montage
function vigFlowers(g: G, lt: number, T: number) {
  const bg = BACKGROUNDS.flowers, gy = bg.groundY, s = 1;
  const hug = easeInOut(0.75, 1.15, lt);
  const dX = lerp(400, 470, hug), mX = lerp(690, 600, hug);
  const dy = hipY(gy, DENIS, s), my = hipY(gy, MAJA, s);
  applyCam(g, { cx: 545, cy: faceY(dy, DENIS, s) + 260, z: lerp(1.12, 1.24, lt / 1.8) });
  bg.draw(g, lt);
  contactShadow(g, dX, gy, 140); contactShadow(g, mX, gy, 140);
  const give = easeOut(0.0, 0.4, lt);
  const take = ease(0.45, 0.7, lt);
  lit(g, bg, (c) => {
    person(c, DENIS, OUTFITS.denis.casual, { x: dX, y: dy, scale: s, t: T, smile: 0.8, blush: 0.8, headTurn: 0.35, lookX: 0.8, joy: hug > 0.5 ? 1 : 0,
      handR: hug > 0.3 ? { x: 150, y: -170, type: "hold" } : { x: lerp(90, 170, give), y: -200, type: "hold" }, handL: hug > 0.3 ? { x: 40, y: -160, type: "hold" } : undefined,
      prop: take < 0.5 ? (cc) => bouquet(cc, lerp(90, 170, give) + 20, -210, 0.85, 0.2) : undefined });
    person(c, MAJA, OUTFITS.maja.casual, { x: mX, y: my, scale: s, t: T, smile: 1, blush: 0.8, headTurn: -0.35, lookX: -0.8, sparkle: 1, joy: take > 0.5 ? 1 : 0, open: take > 0.5 && hug < 0.5 ? 0.5 : 0,
      tiptoe: hug, headTilt: -0.1 * hug,
      handL: hug > 0.3 ? { x: -215, y: -70, type: "open" } : { x: lerp(-60, -130, take), y: -200, type: "hold" },
      handR: hug > 0.3 ? { x: 40, y: -200, type: "hold" } : { x: -40, y: -190, type: "hold" },
      prop: take >= 0.5 ? (cc) => bouquet(cc, hug > 0.3 ? 40 : -90, -200, 0.85, hug > 0.3 ? 0.4 : -0.2) : undefined });
  });
  heartBurst(g, lt, 0.9, 535, faceY(dy, DENIS, s) - 60, 6, 0.8, 17);
  bg.front?.(g, lt);
}
function vigFilm(g: G, lt: number, T: number) {
  const bg = BACKGROUNDS.film;
  const seat = anchor(bg, "sofaSeat", { x: 540, y: 1330 });
  const s = 0.95, dX = seat.x - 115, mX = seat.x + 115;
  const laugh = pulse(0.9, 1.8, lt, 0.15);
  applyCam(g, { cx: seat.x, cy: seat.y - 330, z: lerp(1.2, 1.28, lt / 1.8) });
  bg.draw(g, lt);
  lit(g, bg, (c) => {
    person(c, DENIS, OUTFITS.denis.casual, { x: dX, y: seat.y, scale: s, t: T, sit: 1, smile: 0.7 + laugh * 0.3, lookY: 0.5, lookX: 0.4, headTurn: 0.15, joy: laugh > 0.5 ? 1 : 0, open: laugh * 0.5, headTilt: -laugh * 0.06,
      handL: { x: 40, y: -150, type: "hold" }, handR: { x: 150, y: -150, type: "hold" }, prop: (cc) => tablet(cc, 100, -170, 0.85, 1) });
    person(c, MAJA, OUTFITS.maja.casual, { x: mX, y: seat.y, scale: s, t: T, sit: 1, smile: 0.9, lookY: 0.5, lookX: -0.6, headTurn: -0.2, joy: laugh > 0.5 ? 1 : 0, open: laugh * 0.6,
      headTilt: -0.12 + laugh * 0.05, lean: -0.06,
      handL: lt > 0.4 && lt < 0.9 ? { x: -6, y: -300, type: "hold" } : { x: -40, y: -80, type: "hold" }, handR: { x: 40, y: -80, type: "open" } });
    blanket(c, seat.x, seat.y - 70, 560, T);
    popcorn(c, seat.x + 60, seat.y + 10, 0.9);
  });
  bg.front?.(g, lt);
}
function vigSea(g: G, lt: number, T: number) {
  const bg = BACKGROUNDS.sea, gy = bg.groundY, s = 0.9;
  const run = lt * 260;
  const dX = 240 + run, mX = 410 + run;
  const dy = hipY(gy, DENIS, s), my = hipY(gy, MAJA, s);
  applyCam(g, { cx: 325 + run * 0.85, cy: faceY(dy, DENIS, s) + 300, z: 1.05 });
  bg.draw(g, lt);
  contactShadow(g, dX, gy, 120); contactShadow(g, mX, gy, 120);
  const mid = { x: (dX + mX) / 2, y: dy - 60 };
  lit(g, bg, (c) => {
    person(c, DENIS, OUTFITS.denis.summer, { x: dX, y: dy, scale: s, t: T, walk: lt * 13, walkAmt: 1, run: 0.8, joy: 1, open: 0.5, smile: 1, headTurn: 0.3,
      handR: { x: (mid.x - dX) / s - 10, y: (mid.y - dy) / s, type: "hold" } });
    person(c, MAJA, OUTFITS.maja.summer, { x: mX, y: my, scale: s, t: T, walk: lt * 13 + Math.PI, walkAmt: 1, run: 0.8, joy: 1, open: 0.6, smile: 1, headTurn: -0.1,
      handL: { x: (mid.x - mX) / s + 10, y: (mid.y - my) / s, type: "hold" }, handR: { x: 150, y: -300, type: "open" } });
  });
  splash(g, lt, dX + 40, gy, 3); splash(g, lt + 0.4, mX + 30, gy, 4);
  bg.front?.(g, lt);
}
function vigDog(g: G, lt: number, T: number) {
  const bg = BACKGROUNDS.dog, gy = bg.groundY, s = 0.92;
  const dX = 410, mX = 680;
  const dy = hipY(gy, DENIS, s), my = hipY(gy, MAJA, s);
  applyCam(g, { cx: 545, cy: faceY(dy, DENIS, s) + 300, z: lerp(1.05, 1.12, lt / 1.9) });
  bg.draw(g, lt);
  const ang = lt * 3.6 + 0.6;
  const px = 545 + Math.cos(ang) * 300, py = gy + 40 + Math.sin(ang) * 70;
  const behind = Math.sin(ang) < 0;
  const dog = () => drawYorkie(g, px, py, 1.55, T, { flip: Math.cos(ang + Math.PI / 2) < 0, run: 1 });
  if (behind) dog();
  contactShadow(g, dX, gy, 130); contactShadow(g, mX, gy, 130);
  lit(g, bg, (c) => {
    person(c, DENIS, OUTFITS.denis.casual, { x: dX, y: dy, scale: s, t: T, lean: 0.12, joy: 1, open: 0.45, smile: 1, headTurn: 0.25,
      handL: { x: -40 + Math.sin(lt * 8) * 30, y: 120, type: "open" }, handR: { x: 120, y: 90, type: "open" }, hop: Math.abs(Math.sin(lt * 7)) * 10 });
    person(c, MAJA, OUTFITS.maja.casual, { x: mX, y: my, scale: s, t: T, joy: 1, open: 0.6 + 0.2 * Math.sin(lt * 18), smile: 1, headTilt: 0.08, headTurn: -0.2,
      handL: { x: -10, y: -300, type: "open" }, handR: { x: 150, y: -60, type: "open" }, hop: Math.abs(Math.sin(lt * 6 + 1)) * 8 });
  });
  if (!behind) dog();
  bg.front?.(g, lt);
}
function vigDance(g: G, lt: number, T: number) {
  const bg = BACKGROUNDS.dance, gy = bg.groundY, s = 0.95;
  const sway = Math.sin(lt * 7);
  const dX = 400 + sway * 20, mX = 680 - sway * 20;
  const dy = hipY(gy, DENIS, s), my = hipY(gy, MAJA, s);
  applyCam(g, { cx: 540, cy: faceY(dy, DENIS, s) + 300, z: lerp(1.1, 1.18, lt / 1.8) });
  bg.draw(g, lt);
  contactShadow(g, dX, gy, 130); contactShadow(g, mX, gy, 130);
  const up = (k: number) => Math.sin(lt * 7 + k);
  lit(g, bg, (c) => {
    person(c, DENIS, OUTFITS.denis.casual, { x: dX, y: dy, scale: s, t: T, lean: sway * 0.08, joy: 1, open: 0.4, smile: 1, headTilt: sway * 0.1, hop: Math.max(0, up(0)) * 26,
      handL: { x: -170, y: -360 + up(0) * 80, type: "open" }, handR: { x: 180, y: -330 - up(1) * 80, type: "open" } });
    person(c, MAJA, OUTFITS.maja.casual, { x: mX, y: my, scale: s, t: T, lean: -sway * 0.1, joy: 1, open: 0.5, smile: 1, headTilt: -sway * 0.12, hop: Math.max(0, up(Math.PI)) * 24,
      handL: { x: -160, y: -300 - up(2) * 80, type: "open" }, handR: { x: 160, y: -380 + up(3) * 70, type: "open" } });
  });
  musicNotes(g, lt, 540, faceY(dy, DENIS, s) - 40, 7);
  bg.front?.(g, lt);
}
function vigEveryday(g: G, lt: number, T: number) {
  const bg = BACKGROUNDS.everyday, gy = bg.groundY;
  const part = lt < 0.75 ? 0 : lt < 1.5 ? 1 : 2;
  const pl = part === 0 ? lt : part === 1 ? lt - 0.75 : lt - 1.5;
  if (part === 0) {
    // walking away hand in hand towards the sunset (back view)
    const s = 0.8, adv = pl * 60;
    const dy = hipY(gy, DENIS, s) - adv * 0.3, my = hipY(gy, MAJA, s) - adv * 0.3;
    applyCam(g, { cx: 540, cy: 1150, z: 1.0 + pl * 0.05 });
    bg.draw(g, lt);
    lit(g, bg, (c) => {
      person(c, DENIS, OUTFITS.denis.autumn, { x: 450, y: dy, scale: s, t: T, back: true, walk: pl * 8, walkAmt: 0.7, handR: { x: 100, y: 20, type: "hold" } });
      person(c, MAJA, OUTFITS.maja.autumn, { x: 620, y: my, scale: s, t: T, back: true, walk: pl * 8 + Math.PI, walkAmt: 0.7, handL: { x: -110, y: 22, type: "hold" } });
    });
  } else if (part === 1) {
    // hug close-up
    const s = 1.2;
    const dy = hipY(gy, DENIS, s), my = hipY(gy, MAJA, s);
    applyCam(g, { cx: 545, cy: faceY(dy, DENIS, s) + 160, z: 1.12 + pl * 0.08 });
    bg.draw(g, lt);
    lit(g, bg, (c) => {
      person(c, DENIS, OUTFITS.denis.casual, { x: 470, y: dy, scale: s, t: T, joy: 1, smile: 1, blush: 0.8, headTilt: 0.06, headTurn: 0.3, handR: { x: 170, y: -200, type: "hold" } });
      person(c, MAJA, OUTFITS.maja.casual, { x: 610, y: my, scale: s, t: T, joy: 1, smile: 1, blush: 0.8, headTilt: -0.12, headTurn: -0.3, tiptoe: 1, handL: { x: -215, y: -70, type: "open" }, handR: { x: 60, y: -200, type: "hold" } });
    });
  } else {
    // sitting together watching the sunset, her head on his shoulder (back view)
    const s = 0.85, seatY = gy - 30;
    applyCam(g, { cx: 540, cy: 1100, z: 1.02 + pl * 0.04 });
    bg.draw(g, lt);
    lit(g, bg, (c) => {
      person(c, DENIS, OUTFITS.denis.autumn, { x: 470, y: seatY, scale: s, t: T, back: true, sit: 1, handR: { x: 120, y: -40, type: "hold" } });
      person(c, MAJA, OUTFITS.maja.autumn, { x: 610, y: seatY, scale: s, t: T, back: true, sit: 1, headTilt: -0.22, lean: -0.08, handL: { x: -110, y: -40, type: "hold" } });
    });
    heartBurst(g, pl, 0.15, 540, seatY - 470, 4, 0.6, 23);
  }
  bg.front?.(g, lt);
}
const VIGS: Record<string, (g: G, lt: number, T: number) => void> = { flowers: vigFlowers, film: vigFilm, sea: vigSea, dog: vigDog, dance: vigDance, everyday: vigEveryday };

// ---------------------------------------------------------------- 8. finale, 9 Nov 2026
function shotFinale(g: G, lt: number, T: number) {
  const bg = BACKGROUNDS.finale, gy = bg.groundY, s = 1;
  const F = E.finale_in;
  const give = E.give_flowers - F, hug = E.hug - F, kiss = E.kiss - F, hands = E.hands - F;
  const walk = 1 - ease(1.7, 2.1, lt);
  let dX = lerp(-60, 400, easeOut(0, 2.1, lt));
  let mX = 680;
  const hugK = easeInOut(hug - 0.1, hug + 0.4, lt) * (1 - easeInOut(hands - 0.4, hands + 0.2, lt));
  const handsK = easeInOut(hands - 0.4, hands + 0.3, lt);
  dX = lerp(dX, 470, hugK); mX = lerp(mX, 600, hugK);
  const kissK0 = pulse(E.kiss - F - 0.15, E.kiss - F + 1.0, lt, 0.2);
  mX -= 28 * kissK0;
  dX = lerp(dX, 430, handsK); mX = lerp(mX, 650, handsK);
  const dy = hipY(gy, DENIS, s), my = hipY(gy, MAJA, s);
  const fy = faceY(dy, DENIS, s);
  // camera: medium → push in for the kiss → long slow pull back to the sunset
  const c1: Cam = { cx: 540, cy: fy + 330, z: 1.05 }, c2: Cam = { cx: 545, cy: fy + 120, z: 1.45 }, c3: Cam = { cx: 540, cy: fy + 420, z: 0.86 };
  let cam = lerpCam(c1, c2, easeInOut(hug - 0.8, kiss + 0.2, lt));
  cam = lerpCam(cam, c3, easeInOut(hands - 0.6, 19.4, lt));
  applyCam(g, cam);
  bg.draw(g, lt);
  contactShadow(g, dX, gy, 150); contactShadow(g, mX, gy, 150);
  const noticed = ease(1.0, 1.5, lt);
  const front = ease(give, give + 0.45, lt);           // bouquet comes from behind his back
  const taken = ease(give + 0.45, give + 0.75, lt);     // Maja holds it
  const m = speak("maja", T);
  const kissK = pulse(kiss - 0.15, kiss + 1.0, lt, 0.2);
  const look2 = ease(hands + 1.2, hands + 2.2, lt);     // turn towards the camera / sunset
  const dP: Pose = { x: dX, y: dy, scale: s, t: T, walk: lt * 7, walkAmt: walk, smile: lerp(0.55, 1, ease(give, give + 0.5, lt)), blush: lerp(0.6, 1, kissK),
    headTurn: lerp(0.35, 0.1, look2), lookX: lerp(0.8, 0.1, look2), lookY: lerp(0.1, 0, look2), sparkle: ease(give, give + 0.5, lt),
    surprise: pulse(kiss - 0.05, kiss + 0.35, lt, 0.1) * 0.6, joy: lt > kiss + 0.35 && lt < kiss + 1.6 ? 1 : 0,
    armLBehind: front < 0.5, armRBehind: front < 0.5,
    handL: front < 0.5 ? { x: -40, y: 10, type: "hold" } : hugK > 0.3 ? { x: 160, y: -150, type: "hold" } : handsK > 0.5 ? undefined : { x: 70, y: -170, type: "hold" },
    handR: front < 0.5 ? { x: 40, y: 10, type: "hold" } : hugK > 0.3 ? { x: 220, y: -200, type: "hold" } : handsK > 0.5 ? { x: 112, y: 16, type: "hold" } : { x: lerp(100, 190, front), y: -200, type: "hold" },
    propBehind: front < 0.5 ? (c) => bouquet(c, -118, -40, 0.8, -0.55) : undefined,
    prop: front >= 0.5 && taken < 0.5 ? (c) => bouquet(c, lerp(100, 210, front), -210, 0.85, 0.15) : undefined };
  const mP: Pose = { x: mX, y: my, scale: s, t: T, ...m, smile: lerp(0.45, 1, noticed), blush: lerp(0.4, 0.95, taken), sparkle: lerp(0.3, 1, noticed),
    headTurn: lerp(lerp(0.25, -0.4, noticed), -0.1, look2), lookX: lerp(lerp(0.3, -0.85, noticed), -0.1, look2), lookY: lerp(-0.2, 0, noticed),
    eyesClosed: kissK > 0.4 ? 1 : 0, tiptoe: kissK, headTilt: -0.14 * kissK - 0.04 * hugK, lean: -0.08 * kissK,
    handL: hugK > 0.3 ? { x: -215, y: -70, type: "open" } : handsK > 0.5 ? { x: -120, y: 16, type: "hold" } : taken > 0.5 ? { x: -30, y: -150, type: "hold" } : { x: lerp(-100, -200, ease(give + 0.3, give + 0.6, lt)), y: lerp(-10, -200, ease(give + 0.3, give + 0.6, lt)), type: "open" },
    handR: taken > 0.5 ? { x: 40, y: -150, type: "hold" } : undefined,
    prop: taken >= 0.5 ? (c) => bouquet(c, hugK > 0.3 ? 70 : 0, -180, 0.8, hugK > 0.3 ? 0.35 : 0) : undefined };
  lit(g, bg, (c) => { person(c, DENIS, OUTFITS.denis.autumn, dP); person(c, MAJA, OUTFITS.maja.autumn, mP); });
  heartBurst(g, lt, kiss + 0.05, (dX + mX) / 2 - 30, fy - 40, 9, 1.0, 29);
  heartBurst(g, lt, give + 0.8, mX, fy - 120, 5, 0.7, 31);
  // glowing particles rise around them at the end
  sparkleField(g, lt, 41, 26, { x: 60, y: fy - 600, w: 960, h: 1100 }, ease(hands, hands + 3, lt));
  bg.front?.(g, lt);
  g.setTransform(1, 0, 0, 1, 0, 0);
  motes(g, lt, 8, 40, "#ffd9a8", 0.25 + 0.35 * ease(hands, hands + 4, lt), 26);
  drawDateCard(g, "9 listopada 2026", lt, 0.3, 2.8, 360);
  drawEndCard(g, T, E.end_card_1, E.end_card_2);
}

// ---------------------------------------------------------------- registry
export type Segment = { id: string; start: number; end: number; xfade: number; draw: (g: G, lt: number, T: number) => void; memory?: boolean };
export const SEGMENTS: Segment[] = [
  { id: "sky", ...SHOT.sky, xfade: 0, draw: shotSky },
  { id: "room", ...SHOT.room, xfade: 0.35, draw: (g, lt, T) => shotRoom(g, lt, T, "room") },
  { id: "maja", ...SHOT.maja, xfade: 0.4, draw: shotMaja },
  { id: "denis_reads", ...SHOT.denis_reads, xfade: 0.3, draw: (g, lt, T) => shotRoom(g, lt, T, "reads") },
  { id: "city", ...SHOT.city, xfade: 0.5, draw: shotCity },
  { id: "park", ...SHOT.park, xfade: 0.6, draw: shotPark },
  ...(tl as any).vignettes.map((v: any, i: number) => ({ id: v.id, start: v.start, end: v.end, xfade: i === 0 ? 0.5 : 0.22, draw: VIGS[v.id], memory: true })),
  { id: "finale", ...SHOT.finale, xfade: 0.6, draw: shotFinale },
];
export const _unused = { noise1, lightLeak };
