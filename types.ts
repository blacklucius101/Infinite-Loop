export interface Beat {
  index: number;
  start: number;
  duration: number;
  feature: number[]; // Simplified Chroma vector (12 bins)
  totalEnergy: number;
}

export interface Edge {
  source: number; // Index of beat
  dest: number;   // Index of beat
  similarity: number; // 0 to 1 (1 is identical)
}

export interface AnalysisData {
  beats: Beat[];
  edges: Edge[];
  threshold: number;
  duration: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentBeatIndex: number;
  totalBeats: number;
  timeElapsed: number;
}

export interface PlayerSettings {
  branchChance: number; // 0 to 1 probability of taking a branch
  similarityThreshold: number; // Lower = more matches, but potentially worse sounding
}