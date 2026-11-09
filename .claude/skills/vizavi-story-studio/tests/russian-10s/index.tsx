import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, getInputProps, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useFrame } from "@react-three/fiber";

const FPS = 30;
const TOTAL = 300;
const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function CameraMove() {
  const frame = useCurrentFrame();
  const { camera } = requireThree();
  useFrame(() => {
    const t = frame / FPS;
    const arc = smooth(2.4, 5.6, t);
    const lift = smooth(5.4, 8.1, t);
    camera.position.set(-0.5 + arc * 1.15 - lift * 0.15, 3.6 + lift * 2.2, 8.8 - t * 0.25);
    camera.lookAt(0.1 + arc * 0.5, 1.6 + lift * 2.0, 0);
  });
  return null;
}
function requireThree() {
  // Hook is consumed within the Canvas tree; this helper keeps the test scene modules compact.
  return useThreeCompat();
}
import { useThree as useThreeCompat } from "@react-three/fiber";

function World() {
  const frame = useCurrentFrame();
  const star = useRef<THREE.Group>(null);
  const cloud = useRef<THREE.Group>(null);
  const mira = useRef<THREE.Group>(null);
  const lantern = useRef<THREE.PointLight>(null);
  const miraTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 320; canvas.height = 540;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("Canvas 2D context unavailable for Mira character card");
    c.lineJoin = "round"; c.lineCap = "round"; c.lineWidth = 13; c.strokeStyle = "#241726";
    // Original flat character card treatment: hand-drawn ink silhouette, painted face and clothes.
    c.beginPath(); c.moveTo(105, 280); c.quadraticCurveTo(160, 255, 215, 280); c.lineTo(272, 520); c.quadraticCurveTo(160, 548, 48, 520); c.closePath(); c.fillStyle = "#a94f62"; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(105, 300); c.lineTo(76, 388); c.lineTo(46, 360); c.moveTo(215, 300); c.lineTo(247, 346); c.lineTo(272, 330); c.stroke();
    c.beginPath(); c.ellipse(160, 192, 87, 101, 0, 0, Math.PI * 2); c.fillStyle = "#efc6a0"; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(72, 194); c.quadraticCurveTo(65, 55, 166, 68); c.quadraticCurveTo(268, 67, 249, 184); c.quadraticCurveTo(214, 127, 155, 138); c.quadraticCurveTo(109, 136, 72, 194); c.fillStyle = "#49364c"; c.fill(); c.stroke();
    c.fillStyle = "#30242c"; c.beginPath(); c.ellipse(130, 205, 8, 11, 0, 0, Math.PI * 2); c.ellipse(188, 205, 8, 11, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(160, 225, 21, 0.15, Math.PI - 0.15); c.strokeStyle = "#8e4d48"; c.lineWidth = 6; c.stroke();
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; return tex;
  }, []);
  const grass = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    x: ((i * 37) % 101) / 10 - 5,
    z: -((i * 19) % 71) / 10 + 2,
    h: 0.18 + ((i * 13) % 30) / 100,
  })), []);
  useFrame(({ clock }) => {
    const t = frame / FPS;
    const phase = smooth(6.1, 8.6, t);
    if (star.current) {
      star.current.position.set(1.15 + phase * 0.5, 4.0 + phase * 3.2 + Math.sin(clock.elapsedTime * 2) * 0.08, -1.4);
      star.current.rotation.z = Math.sin(clock.elapsedTime) * 0.12;
      star.current.scale.setScalar(0.65 + smooth(6.0, 7.2, t) * 0.55);
    }
    if (cloud.current) {
      cloud.current.position.x = 1.0 - phase * 1.5;
      cloud.current.position.y = 4.1 + Math.sin(clock.elapsedTime * 0.55) * 0.07;
    }
    if (mira.current) {
      mira.current.rotation.z = Math.sin(clock.elapsedTime * 1.7) * 0.035;
      mira.current.position.y = 0.15 + Math.sin(clock.elapsedTime * 2.5) * 0.035;
    }
    if (lantern.current) lantern.current.intensity = 15 + Math.sin(clock.elapsedTime * 4) * 1.5;
  });
  const sphere = (position: [number, number, number], scale: [number, number, number], color: string) => (
    <mesh position={position} scale={scale} castShadow receiveShadow>
      <sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color={color} roughness={0.83} />
    </mesh>
  );
  return <>
    <color attach="background" args={["#17284b"]} />
    <fog attach="fog" args={["#536789", 13, 36]} />
    <ambientLight intensity={0.85} color="#adc8ff" />
    <directionalLight position={[-5, 8, 4]} intensity={2.1} color="#ffd9ae" castShadow />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -4]} receiveShadow>
      <planeGeometry args={[60, 50]} /><meshStandardMaterial color="#31534f" roughness={1} />
    </mesh>
    {grass.map((g, i) => <mesh key={i} position={[g.x, g.h / 2, g.z]} rotation={[0, (i % 5) * 0.2, (i % 3 - 1) * 0.22]}>
      <coneGeometry args={[0.06, g.h, 5]} /><meshStandardMaterial color={i % 4 ? "#6b9866" : "#a3ad62"} roughness={1} />
    </mesh>)}
    <group ref={mira} position={[-1.15, 0.15, 1.05]}>
      <mesh position={[0, 1.0, 0]}>
        <planeGeometry args={[1.55, 2.55]} />
        <meshBasicMaterial map={miraTexture} transparent alphaTest={0.04} side={THREE.DoubleSide} />
      </mesh>
      <group position={[0.72, 0.82, 0.15]}>
        <mesh><sphereGeometry args={[0.19, 16, 12]} /><meshStandardMaterial color="#ffb74f" emissive="#e28126" emissiveIntensity={2.1} /></mesh>
        <mesh position={[0, 0.02, 0]}><torusGeometry args={[0.2, 0.035, 8, 16]} /><meshStandardMaterial color="#5b3a30" metalness={0.55} /></mesh>
        <pointLight ref={lantern} color="#ffb451" distance={5} intensity={15} />
      </group>
    </group>
    <group ref={cloud} position={[1, 4.1, -1.5]}>
      {sphere([0, 0, 0], [0.9, 0.42, 0.5], "#bccbdf")}
      {sphere([-0.55, -0.03, 0.05], [0.55, 0.35, 0.43], "#d2d9e4")}
      {sphere([0.5, -0.04, 0.02], [0.58, 0.36, 0.45], "#c8d3e2")}
    </group>
    <group ref={star} position={[1.15, 4.0, -1.4]}>
      <mesh><dodecahedronGeometry args={[0.34, 0]} /><meshStandardMaterial color="#fff1b0" emissive="#ffcb61" emissiveIntensity={3} /></mesh>
      <pointLight color="#ffd76e" intensity={22} distance={8} />
    </group>
  </>;
}

export const RussianTenSecondShort: React.FC = () => {
  const frame = useCurrentFrame();
  const props = getInputProps() as { includeAudio?: boolean };
  const t = frame / FPS;
  const subtitle = t < 3 ? "Когда звезда запуталась в облаке," : t < 6.25 ? "Мира подняла фонарь." : "Но путь домой ей осветил\nсобственный свет.";
  return <AbsoluteFill style={{ backgroundColor: "#17284b" }}>
    <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: true }} camera={{ fov: 43, near: 0.1, far: 100, position: [-0.5, 3.6, 8.8] }}>
      <CameraMove /><World />
    </ThreeCanvas>
    <div style={{ position: "absolute", left: 70, right: 70, bottom: 150, textAlign: "center", color: "#fff7e8", fontFamily: "Arial, sans-serif", fontSize: 44, whiteSpace: "pre-line", lineHeight: 1.25, fontWeight: 700, textShadow: "0 3px 12px #091126, 0 0 3px #091126", opacity: interpolate(frame, [0, 8, TOTAL - 8, TOTAL], [0, 1, 1, 0]) }}>{subtitle}</div>
    {props.includeAudio ? <>
      <Audio src={staticFile("audio/narration.mp3")} volume={1} />
      <Audio src={staticFile("audio/music.wav")} volume={(f) => {
        const speaking = (f >= 0 && f < 90) || (f >= 90 && f < 188) || (f >= 188 && f < TOTAL);
        return speaking ? 0.14 : 0.32;
      }} />
      <Audio src={staticFile("audio/sfx.wav")} volume={0.72} />
    </> : null}
  </AbsoluteFill>;
};
