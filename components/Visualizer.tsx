import React, { useRef, useEffect } from 'react';
import { AnalysisData, Beat, Edge } from '../types';

interface VisualizerProps {
  analysis: AnalysisData | null;
  currentBeatIndex: number;
  width?: number;
  height?: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ analysis, currentBeatIndex, width = 600, height = 600 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analysis) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = (Math.min(width, height) / 2) - 40;
    
    const totalBeats = analysis.beats.length;
    const anglePerBeat = (2 * Math.PI) / totalBeats;

    // 1. Draw Edges (Jumps)
    // Optimization: Only draw edges above a certain visual threshold to avoid clutter
    // or draw them very faintly
    ctx.lineWidth = 1;
    
    // We only draw valid jump candidates for the CURRENT beat to highlight potential paths
    // Or draw all edges faintly. Let's draw all faintly.
    
    // For performance, maybe don't draw 50,000 lines every frame if React re-renders. 
    // But this useEffect depends on currentBeatIndex, so it re-renders often.
    // Static background approach is better, but let's keep it simple first.
    
    // Let's only draw edges relevant to the current beat or active beats?
    // No, the classic look is a web.
    
    // Only draw strong edges
    analysis.edges.forEach(edge => {
        // Only draw if similarity is high enough to actually matter visually
        if (edge.similarity < 0.5) return;

        const startAngle = edge.source * anglePerBeat - Math.PI / 2;
        const endAngle = edge.dest * anglePerBeat - Math.PI / 2;
        
        // Calculate control points for quadratic curve (inward)
        const p1x = centerX + Math.cos(startAngle) * radius;
        const p1y = centerY + Math.sin(startAngle) * radius;
        
        const p2x = centerX + Math.cos(endAngle) * radius;
        const p2y = centerY + Math.sin(endAngle) * radius;
        
        // Control point is closer to center based on distance
        const dist = Math.abs(edge.source - edge.dest);
        const controlDist = radius * (1 - (dist / totalBeats) * 0.8); 
        const midAngle = (startAngle + endAngle) / 2 + (Math.abs(startAngle - endAngle) > Math.PI ? Math.PI : 0);
        
        const cpx = centerX + Math.cos(midAngle) * controlDist;
        const cpy = centerY + Math.sin(midAngle) * controlDist;

        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.quadraticCurveTo(cpx, cpy, p2x, p2y);
        
        // Color logic
        if (edge.source === currentBeatIndex) {
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)'; // Active potential jumps
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
             // Draw faint background web? Too slow for JS canvas on every frame.
             // Skip background web for performance in this dynamic render,
             // OR only draw if analysis just loaded (would require separate layer).
             // Let's just not draw the full static web every frame, it kills CPU.
        }
    });

    // 2. Draw Beats Circle
    analysis.beats.forEach((beat, i) => {
      const angle = i * anglePerBeat - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      const barHeight = 10 + (beat.totalEnergy * 20); // Visualize energy if we had it
      const xEnd = centerX + Math.cos(angle) * (radius + barHeight);
      const yEnd = centerY + Math.sin(angle) * (radius + barHeight);

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(xEnd, yEnd);
      
      if (i === currentBeatIndex) {
        ctx.strokeStyle = '#00ffff'; // Cyan active
        ctx.lineWidth = 4;
      } else {
        // Gradient color based on index
        const hue = (i / totalBeats) * 360;
        ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.lineWidth = 2;
      }
      ctx.stroke();
    });
    
    // Draw Progress Arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 25, -Math.PI/2, (currentBeatIndex * anglePerBeat) - Math.PI/2);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [analysis, currentBeatIndex, width, height]);

  return (
    <div className="flex justify-center items-center p-4">
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height} 
        className="rounded-full shadow-2xl shadow-cyan-900/20 bg-black/40 backdrop-blur-sm"
      />
    </div>
  );
};

export default Visualizer;