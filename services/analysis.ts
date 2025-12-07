import { Beat, Edge, AnalysisData } from '../types';

/**
 * Main function to analyze audio buffer.
 * It detects beats, extracts features, and builds the similarity graph.
 */
export async function analyzeAudio(audioBuffer: AudioBuffer): Promise<AnalysisData> {
  const channelData = audioBuffer.getChannelData(0); // Use first channel for analysis
  const sampleRate = audioBuffer.sampleRate;

  // 1. Beat Detection (Simplified Energy Based)
  const beats = detectBeats(channelData, sampleRate);

  // 2. Feature Extraction (Chromagram)
  // We need to perform FFT on each beat segment.
  // Since we are offline, we can use an OfflineAudioContext to use the browser's native FFT.
  const features = await extractFeatures(audioBuffer, beats);

  // 3. Populate Beat objects
  const beatObjects: Beat[] = beats.map((b, i) => ({
    index: i,
    start: b.start,
    duration: b.duration,
    feature: features[i],
    totalEnergy: 0 // Placeholder, could be calculated if needed for visuals
  }));

  // 4. Compute Similarity Graph
  const edges = computeSimilarityEdges(beatObjects);

  return {
    beats: beatObjects,
    edges,
    threshold: 0.4, // Default starting threshold
    duration: audioBuffer.duration
  };
}

/**
 * Detects beats using a dynamic threshold energy algorithm.
 */
function detectBeats(data: Float32Array, sampleRate: number): { start: number; duration: number }[] {
  const beats: { start: number; duration: number }[] = [];
  
  // Downsample for speed (processing every sample is unnecessary for beat detection)
  // Process in 1024-sample windows (~23ms at 44.1k)
  const windowSize = 1024;
  const windows = Math.floor(data.length / windowSize);
  const energies: number[] = new Float32Array(windows) as any;

  // Calculate local energy (RMS)
  for (let i = 0; i < windows; i++) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      const val = data[i * windowSize + j];
      sum += val * val;
    }
    energies[i] = Math.sqrt(sum / windowSize);
  }

  // Dynamic Threshold Logic
  // We compare instant energy to average local energy history
  const historySize = 43; // ~1 second of history
  const multiplier = 1.5; // Threshold multiplier
  
  // Minimum distance between beats (in windows) to prevent double triggering
  // Assuming max tempo 200 BPM -> ~300ms -> ~13 windows
  const minBeatInterval = 13; 
  let lastBeatIndex = -minBeatInterval;

  for (let i = 0; i < windows; i++) {
    // Calculate local average history
    const start = Math.max(0, i - historySize);
    let sumHistory = 0;
    for (let k = start; k < i; k++) {
      sumHistory += energies[k];
    }
    const avgHistory = sumHistory / (i - start + 1);

    if (energies[i] > avgHistory * multiplier && (i - lastBeatIndex) > minBeatInterval) {
      // Found a beat
      const time = (i * windowSize) / sampleRate;
      
      if (beats.length > 0) {
        // Update duration of previous beat
        beats[beats.length - 1].duration = time - beats[beats.length - 1].start;
      }
      
      beats.push({ start: time, duration: 0 }); // Duration fixed in next iteration
      lastBeatIndex = i;
    }
  }

  // Fix last beat duration
  if (beats.length > 0) {
    const lastBeat = beats[beats.length - 1];
    // Estimate based on average or just set a default if end of song
    lastBeat.duration = (data.length / sampleRate) - lastBeat.start;
  }

  return beats;
}

/**
 * Extracts pitch class features (Chroma) for each beat.
 */
async function extractFeatures(fullBuffer: AudioBuffer, beats: { start: number; duration: number }[]): Promise<number[][]> {
  const offlineCtx = new OfflineAudioContext(1, fullBuffer.length, fullBuffer.sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = fullBuffer;
  
  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.0;
  
  source.connect(analyser);
  source.start();

  // We need to process the audio. However, OfflineAudioContext renders as fast as possible.
  // We can't easily extract FFT data *during* the offline render in a loop.
  // Strategy: We will render the audio, but since we can't hook into the render loop easily in standard Web Audio 
  // without AudioWorklets (which are complex for a single file setup), we will perform a Javascript FFT on the raw data.
  // This is slower but works offline without complex worklet files.
  
  return extractFeaturesJS(fullBuffer, beats);
}

/**
 * JS-based Feature Extraction (Simulated Chroma)
 */
function extractFeaturesJS(buffer: AudioBuffer, beats: { start: number; duration: number }[]): number[][] {
  const data = buffer.getChannelData(0);
  const features: number[][] = [];
  const sampleRate = buffer.sampleRate;

  // Precompute Hamming window
  const fftSize = 2048; // Good balance for frequency resolution
  
  // Note frequencies for folding (A4 = 440)
  // Mapping FFT bins to 12 pitch classes
  // Simple approach: Identify dominant frequency in the beat segment
  
  for (const beat of beats) {
    // Extract a chunk of audio from the middle of the beat to capture tonality
    // Avoid the attack transient
    const startSample = Math.floor((beat.start + Math.min(0.05, beat.duration / 4)) * sampleRate);
    const endSample = Math.floor((beat.start + Math.min(0.3, beat.duration)) * sampleRate); // Take ~300ms max
    const len = endSample - startSample;
    
    if (len < fftSize) {
      // Too short, push empty or copy previous
      features.push(new Array(12).fill(0));
      continue;
    }

    // Simple Time-Domain to Frequency Binning (Goertzel or simplified FFT)
    // For this demo, we'll use a very simplified heuristic:
    // We assume the segment has a tonal center.
    // We will assume 12 random values if we can't do full FFT efficiently.
    // WAIT: We can do a basic Real FFT here.
    
    const slice = data.slice(startSample, startSample + fftSize);
    const spectrum = simpleFFT(slice);
    const chroma = foldToChroma(spectrum, sampleRate, fftSize);
    features.push(chroma);
  }

  return features;
}

// Basic Magnitude Spectrum
function simpleFFT(input: Float32Array): Float32Array {
  const n = input.length;
  const output = new Float32Array(n / 2);
  // Very naive DFT (O(N^2)) - Slow for large N, but acceptable for N=2048 on modern CPUs for ~500 beats.
  // Actually, let's optimize. We only need magnitude.
  // Optimization: Just check specific frequencies corresponding to notes?
  // Let's implement a quick recursive FFT or assume standard library is not available.
  // For the sake of code size and "No external libraries", we will use a naive approach but optimize for only lower frequencies where musical notes live (up to ~2kHz).
  
  for (let k = 0; k < n / 2; k++) {
    // We only care about frequencies up to ~5000Hz.
    // k_max = 5000 * 2048 / 44100 ~= 232.
    if (k > 250) break; 

    let real = 0;
    let imag = 0;
    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      real += input[t] * Math.cos(angle);
      imag -= input[t] * Math.sin(angle);
    }
    output[k] = Math.sqrt(real * real + imag * imag);
  }
  return output;
}

// Fold spectrum into 12 pitch classes
function foldToChroma(spectrum: Float32Array, sampleRate: number, fftSize: number): number[] {
  const chroma = new Array(12).fill(0);
  
  for (let k = 1; k < spectrum.length; k++) {
    if (spectrum[k] === 0) continue;
    
    const freq = k * sampleRate / fftSize;
    if (freq < 100) continue; // Skip low rumble
    
    // Formula: note = 12 * log2(freq / 440) + 69. 
    // Midi note -> Pitch class = note % 12.
    // 0 = C, 1 = C#, etc. (Roughly)
    
    const midi = 12 * Math.log2(freq / 440) + 69;
    const pitchClass = Math.round(midi) % 12;
    const idx = (pitchClass + 12) % 12;
    
    chroma[idx] += spectrum[k];
  }

  // Normalize
  const max = Math.max(...chroma, 1); // Avoid div by zero
  return chroma.map(v => v / max);
}

function computeSimilarityEdges(beats: Beat[]): Edge[] {
  const edges: Edge[] = [];
  
  for (let i = 0; i < beats.length; i++) {
    for (let j = 0; j < beats.length; j++) {
      if (i === j) continue;
      
      const dist = euclideanDistance(beats[i].feature, beats[j].feature);
      // Similarity is inverse of distance.
      // Normalize dist (approx max dist for normalized vectors is sqrt(12))
      const similarity = Math.max(0, 1 - (dist / Math.sqrt(12))); // Rough normalization
      
      // We only store reasonably similar edges to save memory/processing
      if (similarity > 0.3) {
        edges.push({
            source: i,
            dest: j,
            similarity
        });
      }
    }
  }
  return edges;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}
