import React, { useEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { CAST, MAX, MAX_EXPR, drawPerson, CARD_W, CARD_H } from "./characters";
import { loadFonts } from "./fonts";

/** Character sheet: Max in three views + expression strip + supporting cast. */
export const CharacterSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    loadFonts().then(() => {
      const cv = ref.current!; const c = cv.getContext("2d")!;
      const g = c.createLinearGradient(0, 0, 0, cv.height); g.addColorStop(0, "#1b2a55"); g.addColorStop(1, "#0d1330");
      c.fillStyle = g; c.fillRect(0, 0, cv.width, cv.height);
      c.fillStyle = "#fff"; c.font = "800 64px Montserrat"; c.fillText("МАКС · 24 года · пассажир", 70, 100);
      c.font = "500 30px Montserrat"; c.fillStyle = "#aebfe8";
      c.fillText("каштановые волосы · голубая толстовка · выразительные глаза · не говорит", 70, 150);
      const tmp = document.createElement("canvas"); tmp.width = CARD_W; tmp.height = CARD_H; const t = tmp.getContext("2d")!;
      const put = (sp: any, ex: any, pose: any, yaw: number, x: number, y: number, s: number, label: string) => {
        drawPerson(t, sp, ex, pose, yaw);
        c.fillStyle = "rgba(255,255,255,0.07)"; c.beginPath(); c.roundRect(x - 6, y - 6, CARD_W * s + 12, CARD_H * s + 54, 20); c.fill();
        c.drawImage(tmp, x, y, CARD_W * s, CARD_H * s);
        c.fillStyle = "#ffd84a"; c.font = "700 26px Montserrat"; c.textAlign = "center"; c.fillText(label, x + (CARD_W * s) / 2, y + CARD_H * s + 34); c.textAlign = "left";
      };
      const s1 = 0.62;
      put(MAX, MAX_EXPR.calm.ex, "rest", 0, 70, 200, s1, "ФАС");
      put(MAX, MAX_EXPR.curious.ex, "rest", 0.6, 70 + 372, 200, s1, "3/4 К ОКНУ");
      put(MAX, MAX_EXPR.curious.ex, "rest", 1, 70 + 744, 200, s1, "ПРОФИЛЬ");
      const names = ["calm", "curious", "startled", "scared", "worried", "relieved"];
      const labels = ["СПОКОЕН", "ЛЮБОПЫТСТВО", "ИСПУГ", "СТРАХ", "ТРЕВОГА", "ОБЛЕГЧЕНИЕ"];
      names.forEach((n, i) => put(MAX, MAX_EXPR[n].ex, MAX_EXPR[n].pose, 0, 70 + (i % 3) * 372, 790 + Math.floor(i / 3) * 520, s1 * 0.78, labels[i]));
      c.fillStyle = "#fff"; c.font = "800 44px Montserrat"; c.fillText("ЭМОЦИИ МАКСА", 70, 770);
      c.font = "800 44px Montserrat"; c.fillText("ЭКИПАЖ И ПАССАЖИРЫ", 70, 1860);
      ["anna", "ivan", "lena", "tim", "pilotA", "engA"].forEach((k, i) => put(CAST[k], { mouth: "smile" }, "rest", 0, 70 + i * 165, 1890 - 0, 0.25, ""));
    });
  }, []);
  return <AbsoluteFill style={{ background: "#0d1330" }}><canvas ref={ref} width={1200} height={2200} style={{ width: 1200, height: 2200 }} /></AbsoluteFill>;
};
