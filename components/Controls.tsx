import React from 'react';
import { PlayerSettings } from '../types';

interface ControlsProps {
  settings: PlayerSettings;
  onSettingsChange: (s: PlayerSettings) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
  statusMessage: string;
}

const Controls: React.FC<ControlsProps> = ({ 
  settings, 
  onSettingsChange, 
  isPlaying, 
  onTogglePlay, 
  onFileChange,
  isLoading,
  statusMessage
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/90 backdrop-blur-md border-t border-neutral-800 p-6 flex flex-col gap-4 z-50">
      
      {/* Top Row: Playback & File */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
           <label className="flex items-center gap-2 cursor-pointer bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-4 rounded transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Load MP3/WAV</span>
            <input 
              type="file" 
              accept="audio/*" 
              onChange={onFileChange} 
              className="hidden" 
              disabled={isLoading}
            />
          </label>

          <button 
            onClick={onTogglePlay}
            disabled={isLoading || statusMessage === 'Waiting for file...'}
            className={`w-12 h-12 flex items-center justify-center rounded-full text-white font-bold transition ${
              isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
          
          <span className="text-sm font-mono text-cyan-400 animate-pulse">
            {statusMessage}
          </span>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs text-gray-400 uppercase font-bold">Branch Chance</label>
            <span className="text-xs text-cyan-400">{(settings.branchChance * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            value={settings.branchChance}
            onChange={(e) => onSettingsChange({...settings, branchChance: parseFloat(e.target.value)})}
            className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <p className="text-[10px] text-gray-500 mt-1">Probability of jumping to a similar beat instead of playing the next one.</p>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs text-gray-400 uppercase font-bold">Similarity Threshold</label>
            <span className="text-xs text-cyan-400">{(settings.similarityThreshold * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="0.9" 
            step="0.01"
            value={settings.similarityThreshold}
            onChange={(e) => onSettingsChange({...settings, similarityThreshold: parseFloat(e.target.value)})}
            className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
           <p className="text-[10px] text-gray-500 mt-1">Strictness of matching. Lower = More Jumps (More Chaos), Higher = Cleaner Jumps.</p>
        </div>
      </div>
    </div>
  );
};

export default Controls;