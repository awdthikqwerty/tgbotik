export type Language = "ru" | "en" | "pl";
export type ProductionMode = "mini-short" | "full-story";
export type VisualStyle = "cartoon-3d" | "dark-cinematic" | "storybook" | "historical-animation";

export interface ProductionBrief {
  title: string;
  mode: ProductionMode;
  durationSeconds: number;
  fps: number;
  width: number;
  height: number;
  visualStyle: VisualStyle;
  narrationLanguage: Language;
  subtitleLanguage?: Language;
  dialogueLanguages: Record<string, Language>;
}
export interface Beat {
  id: string;
  startFrame: number;
  endFrame: number;
  purpose: string;
  narration?: string;
  dialogue?: Array<{ characterId: string; language: Language; text: string }>;
}
export interface ShotOption {
  label: string;
  composition: string;
  camera: string;
  stagingOrMetaphor: string;
  transition: string;
  feasibility: string;
}
export interface ShotPlan {
  beatId: string;
  optionsConsidered: ShotOption[];
  selectedOption: string;
  selectionReason: string;
  visualLayers: { foreground: string; midground: string; background: string };
  cameraMove: string;
  lightingAndFocus: string;
  action: string;
  soundCueIds: string[];
}
export interface AudioSegment {
  id: string;
  language: Language;
  speakerId: string;
  text: string;
  startFrame: number;
  endFrame: number;
  provider: "elevenlabs" | "kokoro" | "edge-tts" | "recorded";
}

export interface ResearchFinding {
  claim: string;
  finding: string;
  sourceUrl: string;
  sourceType: string;
  accessedAt: string;
  confidence: "high" | "medium" | "low";
  dramatizationBoundary: string;
}
export interface CharacterBrief {
  id: string;
  name: string;
  role: string;
  silhouette: string;
  palette: string[];
  continuityRules: string[];
  expressions: string[];
  voiceRole?: string;
  voiceLanguage?: Language;
}
export interface QualityReport {
  status: "pass" | "pass-with-limitations" | "fail";
  checksRun: string[];
  defects: string[];
  limitations: string[];
  finalVideoPath?: string;
}
