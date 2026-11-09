import { continueRender, delayRender, staticFile } from "remotion";

let promise: Promise<void> | null = null;
/** Montserrat variable font (Cyrillic-capable), loaded once per page. */
export function loadFonts(): Promise<void> {
  if (promise) return promise;
  const handle = delayRender("fonts");
  const face = new FontFace("Montserrat", `url(${staticFile("fonts/Montserrat.ttf")})`, { weight: "100 900" });
  promise = face.load().then((f) => { (document as any).fonts.add(f); return (document as any).fonts.load("800 40px Montserrat", "Абв"); })
    .then(() => continueRender(handle)).catch((e) => { console.error(e); continueRender(handle); });
  return promise;
}
