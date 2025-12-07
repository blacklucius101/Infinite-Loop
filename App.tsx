import React, { useState, useEffect, useRef } from 'react';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';
import { AudioEngine } from './services/AudioEngine';
import { analyzeAudio } from './services/analysis';
import { AnalysisData, PlayerSettings } from './types';

const App: React.FC = () => {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('Waiting for file...');
  const [settings, setSettings] = useState<PlayerSettings>({
    branchChance: 0.35,
    similarityThreshold: 0.45
  });

  // Use ref to persist engine without triggering re-renders
  const engineRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    // Initialize engine once
    engineRef.current = new AudioEngine((beatIndex) => {
      setCurrentBeatIndex(beatIndex);
    });

    return () => {
      if (engineRef.current) engineRef.current.pause();
    };
  }, []);

  useEffect(() => {
    // Sync settings to engine
    if (engineRef.current) {
      engineRef.current.updateSettings(settings);
    }
  }, [settings]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !engineRef.current) return;

    try {
      if (isPlaying) {
        engineRef.current.pause();
        setIsPlaying(false);
      }

      setIsLoading(true);
      setStatus('Decoding Audio...');
      
      // 1. Decode
      const buffer = await engineRef.current.loadAudio(file);
      
      setStatus('Analyzing Beats & Features...');
      // Allow UI to update before heavy processing blocks thread
      setTimeout(async () => {
        try {
            // 2. Analyze
            const analysisData = await analyzeAudio(buffer);
            
            // 3. Update State
            setAnalysis(analysisData);
            engineRef.current?.setData(analysisData.beats, analysisData.edges);
            
            setStatus(`Ready! Found ${analysisData.beats.length} beats.`);
            setIsLoading(false);
        } catch (err) {
            console.error(err);
            setStatus('Analysis Failed.');
            setIsLoading(false);
        }
      }, 100);

    } catch (err) {
      console.error(err);
      setStatus('Error loading file.');
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    if (!engineRef.current || !analysis) return;

    if (isPlaying) {
      engineRef.current.pause();
    } else {
      engineRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center">
      <header className="w-full p-4 border-b border-neutral-800 bg-black/20 backdrop-blur">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
          Infinite Loop Jukebox
        </h1>
      </header>

      <main className="flex-1 w-full flex flex-col items-center justify-center pb-40">
        <Visualizer 
            analysis={analysis} 
            currentBeatIndex={currentBeatIndex}
            width={600}
            height={600}
        />
        
        {!analysis && !isLoading && (
            <div className="text-neutral-500 mt-4 text-center max-w-md">
                <p>Upload a song to generate an infinite remix graph.</p>
                <p className="text-xs mt-2">All processing is done locally in your browser.</p>
            </div>
        )}
      </main>

      <Controls 
        settings={settings}
        onSettingsChange={setSettings}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onFileChange={handleFileChange}
        isLoading={isLoading}
        statusMessage={status}
      />
    </div>
  );
};

export default App;