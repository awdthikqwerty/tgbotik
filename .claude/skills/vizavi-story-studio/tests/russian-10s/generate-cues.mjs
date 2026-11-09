#!/usr/bin/env node
/** Tiny dependency-free cue generator for the 10 s fixture; original synth, not the full-production score engine. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const rate = 48000, seconds = 10, frames = rate * seconds;
const out = resolve("tests/russian-10s/public/audio");
await mkdir(out, { recursive: true });
function writeWav(path, data) {
  const pcm = Buffer.alloc(44 + data.length * 2);
  pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + data.length * 2, 4); pcm.write("WAVE", 8);
  pcm.write("fmt ", 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
  pcm.writeUInt32LE(rate, 24); pcm.writeUInt32LE(rate * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34);
  pcm.write("data", 36); pcm.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) pcm.writeInt16LE(Math.round(Math.max(-0.98, Math.min(0.98, data[i])) * 32767), 44 + i * 2);
  return writeFile(path, pcm);
}
const chords = [[146.83,174.61,220],[116.54,146.83,174.61],[130.81,164.81,196],[130.81,164.81,196]];
const music = new Float32Array(frames * 2);
for (let beat = 0; beat < 20; beat++) {
  const start = beat * rate / 2, note = chords[Math.min(3, Math.floor(beat / 5))][(beat * 2 + Math.floor(beat / 4)) % 3] * (beat % 4 === 2 ? 2 : 1);
  const length = Math.min(frames - start, Math.floor(rate * 0.8));
  for (let j = 0; j < length; j++) {
    const t = j / rate, env = Math.min(1, t / 0.012) * Math.exp(-t / (beat < 14 ? 0.52 : 0.9));
    const v = (Math.sin(2*Math.PI*note*t) + 0.28*Math.sin(2*Math.PI*note*2.01*t) + 0.08*Math.sin(2*Math.PI*note*3*t)) * env * 0.15;
    const p = beat % 2 === 0 ? -0.3 : 0.3; music[(start+j)*2] += v*(1-p)*0.5; music[(start+j)*2+1] += v*(1+p)*0.5;
  }
}
for (let i=0;i<frames;i++) {
  const t=i/rate, pad=(Math.sin(2*Math.PI*73.42*t)+Math.sin(2*Math.PI*87.31*t)+Math.sin(2*Math.PI*110*t))*0.012;
  const fade=Math.min(1,t/0.5, (seconds-t)/0.8); music[i*2]+=pad*fade; music[i*2+1]+=pad*fade;
}
const sfx = new Float32Array(frames * 2); let seed=37;
const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296*2-1;};
let low=0;
for(let i=0;i<frames;i++){
  const t=i/rate; low += 0.0035*(random()-low);
  const wind=low*0.028*(0.65+0.35*Math.sin(2*Math.PI*0.08*t))*Math.min(1,t/0.04,(seconds-t)/0.4);
  sfx[i*2]+=wind*0.92; sfx[i*2+1]+=wind*1.08;
}
for(const [at,freq,gain] of [[3.05,1480,.13],[7,1760,.11],[7.12,2349,.07],[7.25,2960,.04]]){
  const start=Math.floor(at*rate), length=Math.min(frames-start,rate);
  for(let j=0;j<length;j++){
    const t=j/rate, v=(Math.sin(2*Math.PI*freq*t)+0.38*Math.sin(2*Math.PI*freq*2.76*t))*Math.exp(-t/0.32)*gain;
    sfx[(start+j)*2]+=v*0.85;sfx[(start+j)*2+1]+=v;
  }
}
await Promise.all([writeWav(resolve(out,"music.wav"),music),writeWav(resolve(out,"sfx.wav"),sfx)]);
console.log(`Generated original 48 kHz stereo music.wav and sfx.wav (${seconds}s) in ${out}`);
