import { Beat, Edge, PlayerSettings } from '../types';

export class AudioEngine {
  private ctx: AudioContext;
  private buffer: AudioBuffer | null = null;
  private beats: Beat[] = [];
  private edges: Edge[] = []; // Adjacency list approach might be faster, but linear search ok for <1000 beats
  private settings: PlayerSettings;
  
  private nextNoteTime: number = 0;
  private currentBeatIndex: number = 0;
  private timerID: number | null = null;
  private isPlaying: boolean = false;
  
  // Callback to update UI
  private onProgress: (beatIndex: number) => void;

  constructor(onProgress: (beatIndex: number) => void) {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.onProgress = onProgress;
    this.settings = {
      branchChance: 0.18,
      similarityThreshold: 0.4
    };
  }

  public async loadAudio(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.buffer = audioBuffer;
    return audioBuffer;
  }

  public setData(beats: Beat[], edges: Edge[]) {
    this.beats = beats;
    this.edges = edges;
  }

  public updateSettings(newSettings: Partial<PlayerSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  public play() {
    if (this.isPlaying) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduler();
  }

  public pause() {
    this.isPlaying = false;
    if (this.timerID) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  private scheduler() {
    // while there are notes that will need to play before the next interval, 
    // schedule them and advance the pointer.
    const lookahead = 25.0; // How frequently to call scheduling (ms)
    const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

    while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleNote(this.currentBeatIndex, this.nextNoteTime);
      this.advanceBeat();
    }
    
    if (this.isPlaying) {
      this.timerID = window.setTimeout(() => this.scheduler(), lookahead);
    }
  }

  private scheduleNote(beatIndex: number, time: number) {
    if (!this.buffer || !this.beats[beatIndex]) return;
    
    const beat = this.beats[beatIndex];
    
    // Create source
    const source = this.ctx.createBufferSource();
    source.buffer = this.buffer;
    
    // Create gain for envelope (smooth clicking)
    const gainNode = this.ctx.createGain();
    
    source.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    // Schedule segment
    // Slight overlap handling or strict cut? 
    // Jukebox usually does strict cuts but tiny fade helps clicks.
    const fade = 0.01;
    
    source.start(time, beat.start, beat.duration);
    
    // Envelope to prevent clicks on hard cuts
    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(1, time + fade);
    gainNode.gain.setValueAtTime(1, time + beat.duration - fade);
    gainNode.gain.linearRampToValueAtTime(0, time + beat.duration);

    // Notify UI (using requestAnimationFrame to decouple from audio thread timing)
    // We visualize it slightly earlier or exactly when it hits
    const drawTime = (time - this.ctx.currentTime) * 1000;
    setTimeout(() => {
        if(this.isPlaying) this.onProgress(beatIndex);
    }, Math.max(0, drawTime));
  }

  private advanceBeat() {
    const currentBeat = this.beats[this.currentBeatIndex];
    if (!currentBeat) return;

    this.nextNoteTime += currentBeat.duration;

    // Logic: Decide next beat
    // 1. Check for branches
    if (Math.random() < this.settings.branchChance) {
      // Find candidates
      const candidates = this.edges.filter(e => 
        e.source === this.currentBeatIndex && 
        e.similarity >= this.settings.similarityThreshold &&
        // Don't jump to immediate neighbor (linear play)
        e.dest !== this.currentBeatIndex + 1
      );

      if (candidates.length > 0) {
        // Pick a weighted random candidate or just random
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        // console.log(`Jumping from ${this.currentBeatIndex} to ${chosen.dest}`);
        this.currentBeatIndex = chosen.dest;
        return;
      }
    }

    // 2. Linear Playback
    this.currentBeatIndex++;
    if (this.currentBeatIndex >= this.beats.length) {
      this.currentBeatIndex = 0; // Loop to start if end reached
    }
  }
}