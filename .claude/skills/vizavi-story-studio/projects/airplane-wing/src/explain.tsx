// 2D explainer overlays: info cards, wing-flex diagram, load gauge, roll indicator, hypothesis badge.
import React from "react";
import { clamp, easeOut } from "./lib";

export const FONT = "Montserrat, sans-serif";
const PANEL = "rgba(9,14,34,0.88)";

export const InfoCard: React.FC<{ f: number; dur: number; title: string; sub?: string; col?: string; src?: string; children?: React.ReactNode; top?: number }> = ({ f, dur, title, sub, col = "#ffd23a", src, children, top = 120 }) => {
  const a = easeOut(f / 9) * clamp((dur - f) / 6);
  if (a <= 0) return null;
  return <div style={{ position: "absolute", left: 60, right: 60, top, opacity: a, transform: `translateY(${(1 - a) * -40}px)`, fontFamily: FONT }}>
    <div style={{ background: PANEL, borderRadius: 30, borderLeft: `14px solid ${col}`, padding: "26px 34px 28px", boxShadow: "0 14px 40px rgba(0,0,0,.35)" }}>
      <div style={{ color: col, fontSize: 50, fontWeight: 900, lineHeight: 1.08, letterSpacing: 0.5 }}>{title}</div>
      {sub && <div style={{ color: "#fff", fontSize: 37, fontWeight: 700, lineHeight: 1.22, marginTop: 12 }}>{sub}</div>}
      {children}
      {src && <div style={{ color: "#9aa6c4", fontSize: 23, fontWeight: 600, marginTop: 14 }}>{src}</div>}
    </div>
  </div>;
};

export const Badge: React.FC<{ text: string; col?: string; f: number }> = ({ text, col = "#ffb340", f }) => {
  const a = easeOut(f / 8);
  return <div style={{ position: "absolute", top: 110, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: a, fontFamily: FONT }}>
    <div style={{ background: "rgba(20,10,10,0.78)", border: `5px solid ${col}`, borderRadius: 20, padding: "12px 30px", color: col, fontSize: 42, fontWeight: 900, letterSpacing: 2 }}>{text}</div>
  </div>;
};

/** Wing at rest vs bent in flight (side-by-side silhouettes seen from the front). */
export const WingFlexDiagram: React.FC<{ k: number }> = ({ k }) => {
  const bend = 70 * k;
  return <svg width={900} height={230} viewBox="0 0 900 230" style={{ display: "block", marginTop: 14 }}>
    <ellipse cx={450} cy={165} rx={46} ry={40} fill="#e9eef6" stroke="#0b0f20" strokeWidth={6} />
    <path d="M 410 170 L 60 150" stroke="#8090b0" strokeWidth={14} strokeDasharray="22 14" strokeLinecap="round" fill="none" />
    <path d={`M 490 170 Q 700 165 840 ${150 - bend}`} stroke="#5ab0ff" strokeWidth={18} strokeLinecap="round" fill="none" />
    <text x={70} y={210} fill="#9fb0d0" fontSize={28} fontWeight={700} fontFamily={FONT}>на земле</text>
    <text x={640} y={210} fill="#5ab0ff" fontSize={28} fontWeight={800} fontFamily={FONT}>в полёте</text>
    <path d={`M 850 150 L 850 ${158 - bend}`} stroke="#ffd23a" strokeWidth={6} markerEnd="url(#ah)" />
    <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ffd23a" /></marker></defs>
  </svg>;
};

/** Horizontal load bar with the two certification marks. */
export const LoadGauge: React.FC<{ load: number }> = ({ load }) => {
  const W = 880, k = (v: number) => (W * v) / 1.6;
  const over = load > 1.0;
  return <div style={{ marginTop: 18, fontFamily: FONT }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
      <div style={{ color: over ? "#ff9a3a" : "#3ee07a", fontSize: 92, fontWeight: 900, lineHeight: 1 }}>{Math.round(load * 100)}%</div>
      <div style={{ color: "#cfd8ea", fontSize: 32, fontWeight: 700 }}>нагрузки</div>
    </div>
    <div style={{ position: "relative", width: W, height: 44, background: "#1d2a4a", borderRadius: 22, marginTop: 14, overflow: "visible" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: k(Math.min(load, 1.6)), background: over ? "linear-gradient(90deg,#3ee07a,#ffd23a 62%,#ff8a3a)" : "#3ee07a", borderRadius: 22 }} />
      {[[1, "#ffd23a"], [1.5, "#ff4a3a"]].map(([v, c]) => <div key={v as number} style={{ position: "absolute", left: k(v as number) - 4, top: -12, width: 8, height: 68, background: c as string, borderRadius: 4 }} />)}
    </div>
    <div style={{ position: "relative", height: 100, width: W }}>
      <div style={{ position: "absolute", left: k(1) - 330, width: 320, top: 22, textAlign: "right", color: "#ffd23a", fontSize: 26, fontWeight: 800, lineHeight: 1.15 }}>100% — максимум<br />в эксплуатации</div>
      <div style={{ position: "absolute", left: W - 250, width: 250, top: 22, textAlign: "right", color: "#ff7a6a", fontSize: 26, fontWeight: 800, lineHeight: 1.15 }}>150% — держать<br />≥ 3 секунды</div>
    </div>
  </div>;
};

/** Curved roll arrow + bank angle, drawn over the rear-view airframe (centre at cx, cy). */
export const RollArrow: React.FC<{ deg: number; a: number; cx?: number; cy?: number }> = ({ deg, a, cx = 540, cy = 980 }) => {
  if (a <= 0) return null;
  const r = 330;
  const p = (ang: number) => [cx + r * Math.cos(ang), cy - r * Math.sin(ang)];
  const [x0, y0] = p(0.35), [x1, y1] = p(2.1);
  return <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: a }}>
    <defs><marker id="rh" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#ff6a3a" /></marker></defs>
    <path d={`M ${x0} ${y0} A ${r} ${r} 0 0 0 ${x1} ${y1}`} stroke="#ff6a3a" strokeWidth={22} fill="none" markerEnd="url(#rh)" strokeLinecap="round" />
    <text x={cx} y={cy - r - 40} textAnchor="middle" fill="#fff" stroke="#0b0f20" strokeWidth={10} paintOrder="stroke" fontSize={64} fontWeight={900} fontFamily={FONT}>КРЕН {Math.round(deg)}°</text>
  </svg>;
};

/** Small label chip at an absolute screen position. */
export const Chip: React.FC<{ x: number; y: number; text: string; col: string; a?: number }> = ({ x, y, text, col, a = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", opacity: a, background: PANEL, border: `4px solid ${col}`, color: col, borderRadius: 16, padding: "8px 18px", fontFamily: FONT, fontSize: 34, fontWeight: 900, whiteSpace: "nowrap" }}>{text}</div>
);
