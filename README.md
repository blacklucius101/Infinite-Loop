## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

Explanation of Core Logic
1. Beat Detection (services/analysis.ts)
We use a Dynamic Threshold algorithm on the audio energy (RMS).
The audio is split into small windows (~23ms).
For each window, we calculate the Root Mean Square (RMS) amplitude.
We keep a moving average of the energy history (~1 second).
If the current instant energy spikes significantly above the moving average (multiplied by a constant, e.g., 1.5x), and enough time has passed since the last beat, we register a beat.
This is purely mathematical and runs offline in the browser.
2. Similarity Analysis (services/analysis.ts)
To make the jumps seamless, we can't just jump to random beats. We need to jump to beats that sound similar musically.
Chromagram: We extract a 12-dimensional vector representing the 12 musical notes (C, C#, D...) for every beat. We simulate this by performing a rudimentary Discrete Fourier Transform (DFT) on the beat's audio data and mapping frequency bins to pitch classes.
Similarity: We compute the Euclidean distance between every pair of beats. If beat A has a C-Major chord profile and beat B has a C-Major chord profile, their distance is low (similarity is high), making them a valid jump candidate.
3. Playback Scheduler (services/AudioEngine.ts)
JavaScript's setInterval or setTimeout is not precise enough for music (it jitters by 10-50ms).
We use the Web Audio API's currentTime system which is hardware-precise.
The scheduler function runs every 25ms (via setTimeout), but it schedules audio events (nodes) for 0.1s in the future.
The Infinite Logic:
When a beat is scheduled, we increment the currentBeatIndex.
Before moving to currentBeatIndex + 1 (linear playback), we roll a die (Math.random() < branchChance).
If successful, we look at the edges list for the current beat. If there are similar beats elsewhere in the song, we swap currentBeatIndex to the target beat.
The next scheduler tick will pick up the new index and schedule that audio slice, creating a seamless jump.
Optimization & Enhancements
Canvas Rendering: The Visualizer uses requestAnimationFrame indirectly via React effects, but limits drawing the complex web of lines unless necessary. Drawing 50,000 lines (which can happen with long songs) is heavy. The code filters edges by similarity to keep the UI responsive.
Audio Decoding: Large MP3s take time to decode. This is offloaded to the native browser C++ implementation via ctx.decodeAudioData.
Future Enhancements (Not included but possible):
Web Workers: Move the heavy analyzeAudio function into a Web Worker to prevent the UI from freezing during the "Analyzing..." phase.
Crossfading: Currently, the engine does a micro-fade (0.01s) to prevent clicks. A true crossfade would require scheduling two overlapping AudioBufferSourceNodes simultaneously.
Tempo Correction: If jumping between sections with slightly different tempos, a playbackRate adjustment could be calculated.
